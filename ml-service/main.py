from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from models.elasticity import ElasticityModel

app = FastAPI(
    title="Price Optimizer ML Service",
    description="Predicts optimal prices using demand elasticity modelling",
    version="1.0.0"
)


# ── Request / Response Schemas ───────────────────────────────────────────────

class PricePoint(BaseModel):
    price: float
    quantity: float

class PredictRequest(BaseModel):
    product_id: int
    product_name: str
    current_price: float
    category: Optional[str] = ""
    price_history: Optional[List[PricePoint]] = []

class PredictResponse(BaseModel):
    product_id: int
    product_name: str
    current_price: float
    recommended_price: float
    elasticity_score: float
    predicted_demand_change: float    # percentage
    predicted_revenue_change: float   # percentage
    confidence: str


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Price Optimizer ML Service",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "ml-service",
    }


@app.post("/predict-demand", response_model=PredictResponse)
def predict_demand(payload: PredictRequest):
    try:
        # Convert price history to (price, quantity) tuples
        price_qty_pairs = [
            (point.price, point.quantity)
            for point in payload.price_history
        ]

        # Fit model and get recommendation
        model = ElasticityModel()
        model.fit(
            price_qty_pairs=price_qty_pairs,
            current_price=payload.current_price,
            category=payload.category or ""
        )
        result = model.recommend(current_price=payload.current_price)

        return PredictResponse(
            product_id=payload.product_id,
            product_name=payload.product_name,
            current_price=payload.current_price,
            **result
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
