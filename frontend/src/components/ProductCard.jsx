import './ProductCard.css';

function ProductCard({ product, onSelect, isSelected, loading }) {
    const category = Array.isArray(product.categories)
        ? product.categories[0]
        : 'General';

    return (
        <div className={`product-card ${isSelected ? 'product-card--selected' : ''}`}>
            <div className="product-card-header">
                <span className="badge badge-blue">{category}</span>
                <span className="product-price">₹{product.currentPrice?.toLocaleString('en-IN')}</span>
            </div>

            <h3 className="product-name">{product.name}</h3>

            <div className="product-meta">
                <span className="product-id">ID: {product.wooCommerceId}</span>
            </div>

            <button
                className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'} product-btn`}
                onClick={() => onSelect(product)}
                disabled={loading && isSelected}
            >
                {loading && isSelected ? (
                    <><span className="spinner" /> Analyzing...</>
                ) : (
                    <> 🤖 Get AI Recommendation</>
                )}
            </button>
        </div>
    );
}

export default ProductCard;
