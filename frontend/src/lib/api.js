let rawUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/store').trim().replace(/\/+$/, '');
if (!rawUrl.endsWith('/api/store')) {
  rawUrl = `${rawUrl}/api/store`;
}
const BASE_URL = rawUrl;

async function request(path, options) {
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, options);
  } catch {
    throw new Error('Could not reach the server. It may still be starting up, so try again in a moment.');
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    throw new Error(body.message || `Request failed with status ${res.status}`);
  }
  return body;
}

export async function getProducts() {
  const body = await request('/db-products');
  return body.data;
}

export async function getOrders() {
  const body = await request('/db-orders');
  return body.data;
}

export async function syncStore() {
  return request('/sync', { method: 'POST' });
}

export async function runAnalysis(productId) {
  const body = await request(`/products/${productId}/recommendation`, { method: 'POST' });
  return body.data;
}
