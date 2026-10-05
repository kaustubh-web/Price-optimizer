# ⚡ AI Price Optimizer

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
│  • Dark-mode Glassmorphic Dashboard                         │
│  • Real-time AI Pricing Recommendations                     │
│  • Interactive Elasticity & Revenue Metrics                 │
│  • Deployed on Vercel Edge Network                          │
└─────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

- **Store Data Ingestion**: Automated synchronization pipeline mapping WooCommerce products, prices, and past customer purchase orders into normalized PostgreSQL tables.
- **Price Elasticity Modeling**:
  $$\text{Elasticity } (\epsilon) = \frac{\% \Delta \text{ Demand}}{\% \Delta \text{ Price}}$$
  Microservice determines whether demand is elastic ($|\epsilon| > 1$), inelastic ($|\epsilon| < 1$), or unitary, computing the revenue-maximizing price point.
- **Gemini GenAI Strategic Explanations**: Synthesizes mathematical elasticity calculations into concise, executive-level seller recommendations in plain English.
- **Modern Responsive Dashboard**: Custom CSS variables, dark-mode glassmorphic theme, responsive typography, and reactive loading states built with React 19.

---

## 🛠️ Technology Stack

| Layer | Technologies | Purpose |
|---|---|---|
| **Frontend** | React 19, Vite, Vanilla CSS | High-performance SPA dashboard, zero bloated dependencies |
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
| `GET` | `/api/store/db-products` | Fetches all stored products from PostgreSQL |
| `POST` | `/api/store/sync` | Pulls latest inventory & orders from WooCommerce API |
| `GET` | `/api/store/products/:id/recommendation` | Executes full ML + Gemini pipeline for a product |

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
WOOCOMMERCE_URL=https://your-store.com
WOOCOMMERCE_CONSUMER_KEY=ck_your_key
WOOCOMMERCE_CONSUMER_SECRET=cs_your_secret
```
Run backend:
```bash
npm run dev
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
