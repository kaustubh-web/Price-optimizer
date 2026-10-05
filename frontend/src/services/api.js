let rawUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/store').trim().replace(/\/+$/, '');
if (!rawUrl.endsWith('/api/store')) {
    rawUrl = `${rawUrl}/api/store`;
}
const BASE_URL = rawUrl;

export async function getProducts() {
    const res = await fetch(`${BASE_URL}/db-products`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
}

export async function syncStores() {
    const res = await fetch(`${BASE_URL}/sync`, { method: 'POST' });
    const data = await res.json();
    return data;
}

export async function getRecommendation(productId) {
    const res = await fetch(`${BASE_URL}/products/${productId}/recommendation`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
}