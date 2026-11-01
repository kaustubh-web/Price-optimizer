import numpy as np
from sklearn.linear_model import LinearRegression


# Typical own-price elasticities for Indian e-commerce categories. Used as a
# prior when a product doesn't have enough distinct price points to fit.
CATEGORY_ELASTICITY = {
    "clothing":    -1.8,
    "ethnic":      -1.6,
    "food":        -0.9,
    "beverage":    -0.8,
    "electronics": -2.2,
    "audio":       -2.0,
    "home":        -1.5,
    "handicraft":  -1.3,
    "health":      -1.1,
    "wellness":    -1.1,
}
DEFAULT_ELASTICITY = -1.5

# Recommendations stay within this band around the current price. Demand
# behaviour far outside the observed range is extrapolation, not evidence.
MAX_PRICE_MOVE = 0.30

MIN_PRICE_POINTS = 3

# Fits from a handful of price points are noisy, so they're shrunk toward the
# category prior: weight = n / (n + PRIOR_STRENGTH). Three points get ~40% weight.
PRIOR_STRENGTH = 5

# Plausible range for own-price elasticity of consumer goods.
ELASTICITY_BOUNDS = (-4.0, -0.2)


class ElasticityModel:
    """
    Estimates Price Elasticity of Demand (PED) with a log-log regression:
    the slope of log(Q) ~ log(P) is the elasticity coefficient, shrunk toward
    a category prior when there are few price points.

    Constant-elasticity demand has no interior revenue maximum (revenue just
    rises or falls monotonically with price), so the optimiser uses a linear
    demand curve calibrated to have the estimated elasticity at the current
    price. That curve peaks at P* = P0 * (e - 1) / (2e):
        e = -1   -> P* = P0          (unit elastic: already optimal)
        e < -1   -> P* < P0          (elastic: cut price)
        -1 < e   -> P* > P0          (inelastic: raise price)
    """

    def __init__(self):
        self.model = LinearRegression()
        self.elasticity = None
        self.r_squared = None
        self.data_points = 0
        self.source = None

    @staticmethod
    def category_prior(category: str) -> float:
        category = (category or "").lower()
        for key, val in CATEGORY_ELASTICITY.items():
            if key in category:
                return val
        return DEFAULT_ELASTICITY

    def fit(self, price_qty_pairs: list, current_price: float, category: str = ""):
        """
        Fits elasticity from observed (price, quantity) pairs. Falls back to the
        category prior when there are too few distinct prices or the fit is not
        a downward-sloping demand curve.
        """
        pairs = [(p, q) for p, q in price_qty_pairs if p > 0 and q > 0]
        self.data_points = len(pairs)
        distinct_prices = len({round(p, 2) for p, _ in pairs})
        prior = self.category_prior(category)

        if distinct_prices >= MIN_PRICE_POINTS:
            log_p = np.log([p for p, _ in pairs]).reshape(-1, 1)
            log_q = np.log([q for _, q in pairs])
            self.model.fit(log_p, log_q)
            slope = float(self.model.coef_[0])
            if slope < 0:
                weight = distinct_prices / (distinct_prices + PRIOR_STRENGTH)
                blended = weight * slope + (1 - weight) * prior
                self.elasticity = float(np.clip(blended, *ELASTICITY_BOUNDS))
                self.r_squared = float(self.model.score(log_p, log_q))
                self.source = "fitted"
                return self

        self.elasticity = prior
        self.r_squared = None
        self.source = "category_prior"
        return self

    def confidence(self) -> str:
        if self.source != "fitted":
            return "low"
        if self.data_points >= 8 and self.r_squared >= 0.6:
            return "high"
        if self.data_points >= 5 and self.r_squared >= 0.3:
            return "medium"
        return "low"

    def demand_ratio(self, price_ratio: float) -> float:
        """Q1/Q0 under the linear demand curve calibrated at the current price."""
        return max(0.0, 1 + self.elasticity * (price_ratio - 1))

    def recommend(self, current_price: float) -> dict:
        """Returns the revenue-maximising price and its projected impact."""
        if self.elasticity is None:
            raise ValueError("Model not fitted yet. Call fit() first.")

        e = self.elasticity
        optimal_ratio = (e - 1) / (2 * e)
        price_ratio = float(np.clip(optimal_ratio, 1 - MAX_PRICE_MOVE, 1 + MAX_PRICE_MOVE))

        recommended_price = current_price * price_ratio
        demand_ratio = self.demand_ratio(price_ratio)
        revenue_ratio = price_ratio * demand_ratio

        return {
            "recommended_price":        round(recommended_price, 2),
            "elasticity_score":         round(e, 4),
            "predicted_demand_change":  round((demand_ratio - 1) * 100, 2),
            "predicted_revenue_change": round((revenue_ratio - 1) * 100, 2),
            "confidence":               self.confidence(),
            "elasticity_source":        self.source,
            "data_points":              self.data_points,
            "r_squared":                None if self.r_squared is None else round(self.r_squared, 3),
            "demand_curve":             self.demand_curve(current_price),
        }

    def demand_curve(self, current_price: float, steps: int = 25) -> list:
        """Projected demand/revenue (indexed to 100 at the current price) across the allowed band."""
        ratios = np.linspace(1 - MAX_PRICE_MOVE, 1 + MAX_PRICE_MOVE, steps)
        return [
            {
                "price":         round(current_price * r, 2),
                "demand_index":  round(self.demand_ratio(r) * 100, 2),
                "revenue_index": round(r * self.demand_ratio(r) * 100, 2),
            }
            for r in ratios
        ]
