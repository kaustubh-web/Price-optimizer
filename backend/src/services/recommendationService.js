const axios = require('axios');
const { GoogleGenAI } = require('@google/genai');
const prisma = require('../config/prisma');

const ML_SERVICE_URL = (process.env.ML_SERVICE_URL || 'http://localhost:8000').trim().replace(/\/+$/, '');
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.status = 404;
    }
}

const signed = (n) => `${n >= 0 ? '+' : ''}${Number(n).toFixed(1)}`;
const rupees = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

class RecommendationService {

    /**
     * Units sold at each distinct price point, taken from real order lines.
     * Prices are rounded to the rupee so tiny float differences don't split a point.
     */
    buildDemandHistory(orderItems) {
        const unitsByPrice = new Map();
        for (const item of orderItems) {
            if (!(item.priceAtPurchase > 0)) continue;
            const price = Math.round(item.priceAtPurchase);
            unitsByPrice.set(price, (unitsByPrice.get(price) || 0) + item.quantity);
        }
        return [...unitsByPrice].map(([price, quantity]) => ({ price, quantity }));
    }

    fallbackRationale(product, ml) {
        const direction = ml.recommended_price < product.currentPrice ? 'Lowering' : 'Raising';
        return `${direction} the price from ${rupees(product.currentPrice)} to ${rupees(ml.recommended_price)} is projected to change unit demand by ${signed(ml.predicted_demand_change)}% and revenue by ${signed(ml.predicted_revenue_change)}%, based on an estimated price elasticity of ${Number(ml.elasticity_score).toFixed(2)}.`;
    }

    async explain(product, category, ml) {
        if (!ai) return this.fallbackRationale(product, ml);

        const evidence = ml.elasticity_source === 'fitted'
            ? `estimated from ${ml.data_points} observed price points in this store's orders`
            : 'a category benchmark, because this product has too little sales history at different prices';

        const prompt = `You are a pricing advisor for Indian e-commerce sellers.

Product: ${product.name}
Category: ${category || 'General'}
Current Price: Rs.${product.currentPrice}
Recommended Price: Rs.${ml.recommended_price}
Price Elasticity: ${ml.elasticity_score} (${evidence})
Predicted Demand Change: ${signed(ml.predicted_demand_change)}%
Predicted Revenue Change: ${signed(ml.predicted_revenue_change)}%

Write a 2-3 sentence recommendation for the seller explaining why the price should move to Rs.${ml.recommended_price}, what will happen to sales volume, and the expected revenue impact. If the elasticity is a category benchmark, briefly say the estimate will sharpen as more sales come in. Be specific and practical. Use simple English, plain text, no markdown.`;

        try {
            const response = await ai.models.generateContent({ model: GEMINI_MODEL, contents: prompt });
            return response.text?.trim() || this.fallbackRationale(product, ml);
        } catch (aiErr) {
            console.error('Gemini API call failed, falling back to heuristic rationale:', aiErr.message);
            return this.fallbackRationale(product, ml);
        }
    }

    async generateRecommendation(productId) {

        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: { orderItems: true },
        });

        if (!product) throw new NotFoundError(`Product ${productId} not found in database`);

        const category = Array.isArray(product.categories)
            ? product.categories.join(' ')
            : '';

        const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict-demand`, {
            product_id: product.wooCommerceId,
            product_name: product.name,
            current_price: product.currentPrice,
            category,
            price_history: this.buildDemandHistory(product.orderItems),
        });

        const ml = mlResponse.data;
        const rationale = await this.explain(product, category, ml);

        const recommendation = await prisma.recommendation.create({
            data: {
                productId: product.id,
                currentPrice: product.currentPrice,
                recommendedPrice: ml.recommended_price,
                predictedDemandChange: ml.predicted_demand_change,
                predictedRevenueChange: ml.predicted_revenue_change,
                elasticityScore: ml.elasticity_score,
                rationale,
                status: 'PENDING',
            },
        });

        return {
            product: { id: product.id, name: product.name, currentPrice: product.currentPrice },
            recommendation,
            model: {
                confidence: ml.confidence,
                elasticitySource: ml.elasticity_source,
                dataPoints: ml.data_points,
                rSquared: ml.r_squared,
                demandCurve: ml.demand_curve,
            },
        };
    }
}

module.exports = new RecommendationService();
