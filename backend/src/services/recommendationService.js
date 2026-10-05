const axios = require('axios');
const { GoogleGenAI } = require('@google/genai');
const prisma = require('../config/prisma');

const ML_SERVICE_URL = (process.env.ML_SERVICE_URL || 'http://localhost:8000').trim().replace(/\/+$/, '');

class RecommendationService {


    async generateRecommendation(productId) {

        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: {
                priceHistory: { orderBy: { changedAt: 'asc' } },
                orderItems: true,
            },
        });

        if (!product) throw new Error(`Product ${productId} not found in database`);

        const priceHistory = product.priceHistory.map((ph) => {
            const qtySoldAtPrice = product.orderItems
                .filter((item) => Math.abs(item.priceAtPurchase - ph.effectivePrice) < 1)
                .reduce((sum, item) => sum + item.quantity, 0);

            return {
                price: ph.effectivePrice,
                quantity: qtySoldAtPrice || 1,
            };
        });

        const category = Array.isArray(product.categories)
            ? product.categories.join(' ')
            : '';


        const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict-demand`, {
            product_id: product.wooCommerceId,
            product_name: product.name,
            current_price: product.currentPrice,
            category,
            price_history: priceHistory,
        });

        const ml = mlResponse.data;

        let rationale = '';
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

            const prompt = `You are a pricing advisor for Indian e-commerce sellers.

Product: ${product.name}
Category: ${category || 'General'}
Current Price: Rs.${product.currentPrice}
Recommended Price: Rs.${ml.recommended_price}
Price Elasticity Score: ${ml.elasticity_score} (how sensitive buyers are to price changes)
Predicted Demand Change: ${ml.predicted_demand_change}%
Predicted Revenue Change: ${ml.predicted_revenue_change}%

Write a 2-3 sentence recommendation for the seller explaining WHY they should change the price to Rs.${ml.recommended_price}, what will happen to their sales volume, and the expected revenue impact. Be specific, friendly, and practical. Use simple English.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: prompt,
            });
            rationale = response.text;
        } catch (aiErr) {
            console.error('Gemini API call failed, falling back to heuristic rationale:', aiErr.message);
            rationale = `Based on demand elasticity analysis (${ml.elasticity_score}), adjusting the price to ₹${ml.recommended_price} is projected to increase demand by ${ml.predicted_demand_change}% and revenue by ${ml.predicted_revenue_change}%.`;
        }


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
        };
    }
}

module.exports = new RecommendationService();
