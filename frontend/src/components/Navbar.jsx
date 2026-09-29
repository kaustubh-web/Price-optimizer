import './Navbar.css';
function Navbar({ onSync, syncing }) {
    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <div className="navbar-logo">⚡</div>
                <div>
                    <h1 className="navbar-title">Price Optimizer</h1>
                    <p className="navbar-subtitle">AI-Powered Dynamic Pricing For Indian E-Commerce</p>
                </div>
            </div>


            <button
                className="btn btn-secondary"
                onClick={onSync}
                disabled={syncing}
            >
                {syncing ? <span className="spinner" /> : '🔄'}
                {syncing ? 'Syncing...' : 'Sync Store'}
            </button>
        </nav>
    );
}

export default Navbar;