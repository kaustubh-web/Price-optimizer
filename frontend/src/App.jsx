import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ProductCard from './components/ProductCard';
import RecommendationPanel from './components/RecommendationPanel';
import { getProducts, syncStores, getRecommendation } from './services/api';
import './App.css';

function App() {

  // ── State ─────────────────────────────────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [recLoading, setRecLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Fetch products on mount ───────────────────────────────────────────────
  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch(() => setError('Could not load products. Is the backend running?'))
      .finally(() => setLoadingProducts(false));
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleSync() {
    setSyncing(true);
    try {
      await syncStores();
      const fresh = await getProducts();
      setProducts(fresh);
    } catch {
      setError('Sync failed. Check backend connection.');
    } finally {
      setSyncing(false);
    }
  }

  async function handleSelect(product) {
    setSelectedProduct(product);
    setRecommendation(null);
    setRecLoading(true);
    setError(null);
    try {
      const data = await getRecommendation(product.id);
      setRecommendation(data);
    } catch (err) {
      setError(err.message || 'Failed to get recommendation.');
    } finally {
      setRecLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      <Navbar onSync={handleSync} syncing={syncing} />

      <main className="app-main">
        {error && (
          <div className="error-banner">⚠ {error}</div>
        )}

        <div className="app-layout">
          {/* LEFT: Product List */}
          <section className="product-section">
            <div className="section-header">
              <h2 className="section-title">Products</h2>
              <span className="badge badge-blue">{products.length} items</span>
            </div>

            {loadingProducts ? (
              <div className="loading-state">
                <span className="spinner spinner-lg" />
                <p>Loading products...</p>
              </div>
            ) : (
              <div className="product-grid">
                {products.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={handleSelect}
                    isSelected={selectedProduct?.id === product.id}
                    loading={recLoading}
                  />
                ))}
              </div>
            )}
          </section>

          {/* RIGHT: Recommendation Panel */}
          <section className="rec-section">
            <div className="section-header">
              <h2 className="section-title">AI Recommendation</h2>
            </div>
            <RecommendationPanel
              recommendation={recommendation}
              product={selectedProduct}
              loading={recLoading}
            />
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
