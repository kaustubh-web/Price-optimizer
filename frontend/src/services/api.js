const BASE_URL = 'http://localhost:5000/api/store';

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
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
}