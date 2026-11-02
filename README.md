<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/logo-dark.svg">
    <img alt="Price Optimizer" src="docs/logo-light.svg" width="440">
  </picture>
</p>

# AI Price Optimizer

> **AI-Powered Dynamic Pricing Engine for Indian E-Commerce**  
> Predict price elasticity of demand using machine learning and generate actionable seller strategies with Google Gemini GenAI.

[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://price-optimizer-tau.vercel.app/)
[![Backend](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render)](https://price-optimizer-backend.onrender.com)
[![ML Service](https://img.shields.io/badge/ML_Service-FastAPI-009688?style=for-the-badge&logo=fastapi)](https://price-optimizer-ml.onrender.com/docs)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20(Neon)-336791?style=for-the-badge&logo=postgresql)](https://neon.tech)

🔗 **Live Application:** [https://price-optimizer-tau.vercel.app/](https://price-optimizer-tau.vercel.app/)

---

## 📌 Overview

Pricing products in e-commerce often relies on manual guesswork or rigid discount percentages. **AI Price Optimizer** connects directly to an e-commerce storefront (WooCommerce), synchronizes historical product pricing and order volume into a high-performance PostgreSQL database, models **Price Elasticity of Demand (PED)** via a specialized Python/FastAPI microservice, and leverages **Google Gemini 2.0 Flash** to deliver human-readable strategic rationales for store owners.

---

## 🏗️ System Architecture

```
                    ┌─────────────────────────┐
                    │     WooCommerce Store   │
                    │   (REST API v3 / Orders)│
                    └────────────┬────────────┘
                                 │ Sync Store
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                 Node.js / Express Backend                   │
│                                                             │
│  • WooCommerce Data Ingestion & Normalization               │
│  • Prisma ORM Data Access Layer                             │
│  • Orchestration Pipeline (ML + LLM)                        │
└──────────────┬──────────────┬──────────────┬────────────────┘
               │              │              │
    Prisma     │   REST API   │   Google SDK │
  Query Engine │   Payload    │   Prompting  │
               ▼              ▼              ▼
     ┌─────────────┐   ┌─────────────┐   ┌─────────────────┐
     │ PostgreSQL  │   │ ML Service  │   │  Google Gemini  │
     │  (Neon DB)  │   │  (FastAPI)  │   │   2.0 Flash     │
     │             │   │             │   │                 │
     │  • Products │   │ • Elasticity│   │ • Strategic     │
     │  • Orders   │   │   Modeling  │   │   Explanations  │
     │  • History  │   │ • Optimal   │   │ • Impact        │
     │  • AI Recs  │   │   Pricing   │   │   Analysis      │
     └─────────────┘   └─────────────┘   └─────────────────┘
                               ▲
                               │ JSON Response
                               │
┌──────────────────────────────┴──────────────────────────────┐
│                    React 19 + Vite Frontend                 │
│                                                             │
│  • Light/dark dashboard (Tailwind CSS v4)                   │
│  • Real-time AI Pricing Recommendations                     │
│  • Revenue curve & price history charts (Recharts)          │
│  • Deployed on Vercel Edge Network                          │
└─────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

- **Store Data Ingestion**: Automated synchronization pipeline mapping WooCommerce products, prices, and past customer purchase orders into normalized PostgreSQL tables. Every page of products and orders is synced, so the full sales history is available.
- **Price Elasticity Modeling**:
  $$\text{Elasticity } (\epsilon) = \frac{\% \Delta \text{ Demand}}{\% \Delta \text{ Price}}$$
  Elasticity is fitted with a log-log regression over the prices each product has actually sold at (grouped from order lines). Thin fits are shrunk toward a category benchmark and bounded to a plausible range; with fewer than three distinct prices the benchmark is used directly. Every result carries a confidence level (low / medium / high).
- **Revenue-Maximising Price**: Constant-elasticity demand has no interior revenue peak, so the optimiser uses a linear demand curve calibrated to the estimated elasticity at the current price. Its peak is
  $$P^* = P_0 \cdot \frac{\epsilon - 1}{2\epsilon}$$
  which lowers prices for elastic products ($|\epsilon| > 1$) and raises them for inelastic ones, limited to ±30% of the current price where the data has evidence. The service also returns the projected demand and revenue curve across that band.
- **Gemini GenAI Strategic Explanations**: Synthesizes mathematical elasticity calculations into concise, executive-level seller recommendations in plain English, with a templated fallback when Gemini is unavailable.
- **Sales Overview**: Revenue, orders, units and average order value for 30 days / 90 days / 12 months / all time, each compared with the previous period; revenue over time; top products; sales by state; pricing opportunities ranked by projected uplift; and the latest orders with their status. Only completed and processing orders count as sales.
- **Products & Pricing**: Catalog search; per-product units sold over time aligned above its list-price history, recent orders, the projected revenue curve with current vs. recommended price (chart or table view) and model confidence. Light/dark themes and a cold-start notice for the free-tier backend.

---

## 🛠️ Technology Stack

| Layer | Technologies | Purpose |
|---|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS v4, TanStack Query, Recharts, Radix UI, Motion, Sonner, Lucide | Dashboard UI, data fetching & caching, charts, accessible tooltips, toasts |
| **Backend API** | Node.js, Express, Axios, CORS | Business logic, API routing, WooCommerce synchronization |
| **Database** | PostgreSQL (Neon Serverless), Prisma 7 | Relational data persistence, schema migrations, and indexing |
| **ML Microservice** | Python 3.11, FastAPI, Scikit-learn, Pandas, NumPy | Mathematical modeling of price elasticity and demand curves |
| **Generative AI** | Google GenAI SDK (`gemini-2.0-flash`) | Contextual seller rationales and business insights |
| **Cloud Hosting** | Vercel (Frontend), Render (Backend & ML) | Scalable production deployments with automated CI/CD |

---

## 🗄️ Database Schema

The database is managed with **Prisma ORM** on a serverless **Neon PostgreSQL** cluster:

- `Product`: Core product entity (`name`, `currentPrice`, `regularPrice`, `categories`, `stockStatus`).
- `PriceHistory`: Immutable audit log tracking historical price shifts (`effectivePrice`, `changedAt`, `source`).
- `Order` & `OrderItem`: Order transaction logs (`priceAtPurchase`, `quantity`, `total`) used to train elasticity models.
- `Recommendation`: Persistent record of AI suggestions (`recommendedPrice`, `predictedDemandChange`, `predictedRevenueChange`, `elasticityScore`, `rationale`).

---

## 🚀 API Endpoints

### Backend (`/api/store`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check for backend service |
| `GET` | `/api/store/db-products` | Fetches all stored products with price history, order lines and latest recommendation |
| `GET` | `/api/store/db-orders` | Fetches all stored orders with their line items, newest first |
| `POST` | `/api/store/sync` | Pulls latest inventory & orders from WooCommerce API |
| `POST` | `/api/store/products/:id/recommendation` | Runs the ML + Gemini pipeline for a product and stores the result (`GET` still accepted for older clients) |

### ML Service (`/`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service health status |
| `GET` | `/docs` | Interactive Swagger API documentation |
| `POST` | `/predict-demand` | Calculates price elasticity & optimal price for given history |

---

## 💻 Local Setup & Development

### 1. Clone the repository
```bash
git clone https://github.com/kaustubh-web/Price-optimizer.git
cd Price-optimizer
```

### 2. Backend Setup
```bash
cd backend
npm install
npx prisma generate
```
Create `backend/.env`:
```env
PORT=5000
DATABASE_URL=postgresql://user:password@host/neondb?sslmode=require
ML_SERVICE_URL=http://localhost:8000
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash  # optional
WOOCOMMERCE_URL=https://your-store.com
WOOCOMMERCE_CONSUMER_KEY=ck_your_key
WOOCOMMERCE_CONSUMER_SECRET=cs_your_secret
```
Run backend:
```bash
npm run dev
```

No WooCommerce store? Fill the database with a demo catalog and ~5 months of orders instead. This **replaces all store data** in the database; without `--yes` it's a dry run that only prints what it would do:
```bash
npm run seed:demo -- --yes
```

### 3. ML Service Setup
```bash
cd ../ml-service
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 4. Frontend Setup
```bash
cd ../frontend
npm install
```
Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api/store
```
Run frontend:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🌐 Live Deployments

- **Frontend**: [https://price-optimizer-tau.vercel.app/](https://price-optimizer-tau.vercel.app/)
- **Backend API**: [https://price-optimizer-backend.onrender.com/](https://price-optimizer-backend.onrender.com/)
- **ML Microservice**: [https://price-optimizer-ml.onrender.com/docs](https://price-optimizer-ml.onrender.com/docs)

> **Note on Free Tier Cloud Hosting**: Backend and ML services are hosted on Render's free tier, which enters a cold-start sleep mode after 15 minutes of inactivity. The initial request may take ~30–45 seconds to spin up if dormant.

---

## 📄 License
This project is licensed under the MIT License.
