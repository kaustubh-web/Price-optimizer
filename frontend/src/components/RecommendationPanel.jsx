import './RecommendationPanel.css';

function StatCard({ label, value, colorClass }) {
  return (
    <div className={`stat-card ${colorClass}`}>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
    </div>
  );
}

function RecommendationPanel({ recommendation, product, loading }) {

  // Conditional render 1: Loading state
  if (loading) {
    return (
      <div className="rec-panel rec-panel--loading">
        <span className="spinner spinner-lg" />
        <p>Running ML model + Gemini analysis...</p>
      </div>
    );
  }

  // Conditional render 2: Empty state (no product selected yet)
  if (!recommendation) {
    return (
      <div className="rec-panel rec-panel--empty">
        <div className="rec-empty-icon">🤖</div>
        <h3>No Recommendation Yet</h3>
        <p>Select a product and click "Get AI Recommendation" to run the pricing engine.</p>
      </div>
    );
  }

  // Conditional render 3: Data state
  const rec = recommendation.recommendation;
  const priceDiff = rec.recommendedPrice - rec.currentPrice;
  const priceUp = priceDiff >= 0;
  const demandUp = rec.predictedDemandChange >= 0;
  const revenueUp = rec.predictedRevenueChange >= 0;

  return (
    <div className="rec-panel fade-in">
      <div className="rec-header">
        <div>
          <h2 className="rec-title">AI Recommendation</h2>
          <p className="rec-product-name">{product?.name}</p>
        </div>
        <span className={`badge ${revenueUp ? 'badge-green' : 'badge-amber'}`}>
          {revenueUp ? '↑ Revenue Opportunity' : '⚠ Trade-off Detected'}
        </span>
      </div>

      <div className="rec-price-section">
        <div className="rec-price-block">
          <p className="rec-price-label">Current Price</p>
          <p className="rec-price-value">₹{rec.currentPrice?.toLocaleString('en-IN')}</p>
        </div>
        <div className="rec-arrow">→</div>
        <div className="rec-price-block rec-price-block--recommended">
          <p className="rec-price-label">Recommended Price</p>
          <p className={`rec-price-value ${priceUp ? 'text-green' : 'text-amber'}`}>
            ₹{rec.recommendedPrice?.toLocaleString('en-IN')}
          </p>
          <span className={`badge ${priceUp ? 'badge-green' : 'badge-amber'}`}>
            {priceUp ? '+' : ''}{priceDiff.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="rec-stats">
        <StatCard
          label="Elasticity Score"
          value={rec.elasticityScore?.toFixed(3)}
          colorClass="stat-neutral"
        />
        <StatCard
          label="Demand Change"
          value={`${demandUp ? '+' : ''}${rec.predictedDemandChange?.toFixed(1)}%`}
          colorClass={demandUp ? 'stat-green' : 'stat-red'}
        />
        <StatCard
          label="Revenue Change"
          value={`${revenueUp ? '+' : ''}${rec.predictedRevenueChange?.toFixed(1)}%`}
          colorClass={revenueUp ? 'stat-green' : 'stat-amber'}
        />
      </div>

      <div className="rec-rationale">
        <p className="rec-rationale-label">🧠 Gemini Analysis</p>
        <p className="rec-rationale-text">{rec.rationale}</p>
      </div>
    </div>
  );
}

export default RecommendationPanel;
