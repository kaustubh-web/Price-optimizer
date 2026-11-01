export function describeElasticity(e) {
  const magnitude = Math.abs(e);
  if (magnitude > 1.05) {
    return {
      label: 'Elastic',
      summary:
        'Buyers are price-sensitive. A 1% price change moves demand by more than 1%, so lower prices tend to grow revenue.',
    };
  }
  if (magnitude < 0.95) {
    return {
      label: 'Inelastic',
      summary:
        'Buyers are not very price-sensitive. Demand moves less than price does, so modest increases tend to grow revenue.',
    };
  }
  return {
    label: 'Unit elastic',
    summary: 'Demand moves roughly in step with price, so revenue is close to its peak at the current price.',
  };
}

export function productSales(product) {
  const items = product.orderItems ?? [];
  return {
    units: items.reduce((sum, item) => sum + item.quantity, 0),
    orders: new Set(items.map((item) => item.orderId)).size,
    revenue: items.reduce((sum, item) => sum + item.total, 0),
  };
}

export function catalogSummary(products) {
  const orderIds = new Set();
  let units = 0;
  let revenue = 0;
  let inStock = 0;
  const upliftByProduct = [];

  for (const product of products) {
    if (product.stockStatus === 'instock') inStock++;
    for (const item of product.orderItems ?? []) {
      orderIds.add(item.orderId);
      units += item.quantity;
      revenue += item.total;
    }
    const latest = product.recommendations?.[0];
    if (latest) upliftByProduct.push(latest.predictedRevenueChange);
  }

  return {
    products: products.length,
    inStock,
    units,
    orders: orderIds.size,
    revenue,
    analysed: upliftByProduct.length,
    averageUplift: upliftByProduct.length ? upliftByProduct.reduce((a, b) => a + b, 0) / upliftByProduct.length : null,
  };
}

export function primaryCategory(product) {
  return product.categories?.[0] ?? 'Uncategorised';
}
