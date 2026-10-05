import numpy as np
from sklearn.linear_model import LinearRegression


class ElasticityModel:
    """
    Estimates Price Elasticity of Demand using log-log linear regression.
    Slope of log(Q) ~ log(P) gives the elasticity coefficient directly.
    """

    def __init__(self):
        self.model = LinearRegression()
        self.elasticity = None

    def _bootstrap_data(self, current_price: float, category: str) -> list:
        """
        Generates synthetic (price, quantity) pairs when real history is thin.
        Uses category-level typical elasticity ranges for Indian e-commerce.
        """
        category_elasticity = {
            "clothing":    -1.8,
            "food":        -0.9,
            "electronics": -2.2,
            "home":        -1.5,
            "health":      -1.1,
        }

        e = -1.5  # default
        for key, val in category_elasticity.items():
            if key in category.lower():
                e = val
                break

        # Simulate 8 price points around current price (+/-30%)
        prices = np.linspace(current_price * 0.70, current_price * 1.30, 8)
        base_qty = 50
        quantities = [
            max(1, base_qty * ((p / current_price) ** e) + np.random.normal(0, 2))
            for p in prices
        ]
        return list(zip(prices, quantities))

    def fit(self, price_qty_pairs: list, current_price: float, category: str = ""):
        """
        Fits the elasticity model.
        Falls back to synthetic data if fewer than 3 real pairs exist.
        """
        if len(price_qty_pairs) < 3:
            price_qty_pairs = self._bootstrap_data(current_price, category)

        prices = np.array([p for p, q in price_qty_pairs], dtype=float)
        quantities = np.array([q for p, q in price_qty_pairs], dtype=float)

        # Filter out zero/negative values before log transform
        mask = (prices > 0) & (quantities > 0)
        log_p = np.log(prices[mask]).reshape(-1, 1)
        log_q = np.log(quantities[mask])

        self.model.fit(log_p, log_q)
        self.elasticity = float(self.model.coef_[0])
        return self

    def recommend(self, current_price: float) -> dict:
        """
        Returns the revenue-maximising recommended price and impact metrics.
        """
        if self.elasticity is None:
            raise ValueError("Model not fitted yet. Call fit() first.")

        e = self.elasticity

        # Revenue-maximising price: P* = P0 / (1 + 1/e)
        # Clamp elasticity away from 0 to avoid division by zero
        if abs(e) < 0.01:
            e = -0.01

        raw_recommended = current_price / (1 + 1 / e)

        # Keep recommendation within +/-40% of current price (safety guardrail)
        lower = current_price * 0.60
        upper = current_price * 1.40
        recommended_price = float(np.clip(raw_recommended, lower, upper))

        pct_price_change = (recommended_price - current_price) / current_price
        pct_demand_change = e * pct_price_change

        current_revenue = current_price * 1  # normalised to 1 unit
        new_revenue = recommended_price * (1 + pct_demand_change)
        pct_revenue_change = (new_revenue - current_revenue) / current_revenue

        return {
            "recommended_price":        round(recommended_price, 2),
            "elasticity_score":         round(e, 4),
            "predicted_demand_change":  round(pct_demand_change * 100, 2),
            "predicted_revenue_change": round(pct_revenue_change * 100, 2),
            "confidence":               "bootstrapped",
        }
