const clone = value => JSON.parse(JSON.stringify(value));

export function catalogFromVendors(vendors = []) {
  return vendors.flatMap(vendor => (vendor.menu || []).map(item => ({
    ...clone(item),
    vendor: vendor.slug,
    vendorName: vendor.name,
    vendorKind: vendor.kind,
    serviceLevels: clone(vendor.service_levels || []),
    catalogKey: `${vendor.slug}:${item.id}`
  })));
}

export function aggregateBasket(items = []) {
  const lines = new Map();
  for (const item of items) {
    const catalogKey = item.catalogKey || `${item.vendor || ''}:${item.id}`;
    const existing = lines.get(catalogKey) || { ...clone(item), catalogKey, quantity: 0 };
    existing.quantity += Number(item.quantity || 1);
    lines.set(catalogKey, existing);
  }
  return [...lines.values()];
}

export function recommendedBasket(items = [], ratio = 1) {
  return aggregateBasket(items).map(line => ({
    ...line,
    quantity: Math.max(Number(line.minimum || 1), Math.ceil(line.quantity * Math.max(.1, ratio)))
  }));
}

export function setBasketQuantity(lines, catalogKey, quantity) {
  const next = aggregateBasket(lines);
  const row = next.find(item => item.catalogKey === catalogKey);
  if (!row) return next;
  const value = Math.max(0, Math.floor(Number(quantity) || 0));
  return value === 0 ? next.filter(item => item.catalogKey !== catalogKey)
    : next.map(item => item.catalogKey === catalogKey ? { ...item, quantity:value } : item);
}

export function addBasketItem(lines, item, quantity = 1) {
  const next = aggregateBasket(lines);
  const catalogKey = item.catalogKey || `${item.vendor || ''}:${item.id}`;
  const existing = next.find(row => row.catalogKey === catalogKey);
  if (existing) return setBasketQuantity(next, catalogKey, existing.quantity + Math.max(1, quantity));
  return [...next, { ...clone(item), catalogKey, quantity:Math.max(Number(item.minimum || 1), quantity) }];
}

export function swapBasketItem(lines, fromKey, item) {
  const current = aggregateBasket(lines);
  const replaced = current.find(row => row.catalogKey === fromKey);
  const without = current.filter(row => row.catalogKey !== fromKey);
  return addBasketItem(without, item, replaced?.quantity || 1);
}

export function basketMetrics(lines = [], dietaryNeeds = {}, headcount = 0) {
  const rows = aggregateBasket(lines);
  const food = rows.filter(row => row.category === 'main');
  const servings = food.reduce((sum,row) => sum + Number(row.claimed_serves || 0) * row.quantity, 0);
  const dietary = Object.fromEntries(Object.entries(dietaryNeeds || {}).map(([kind,needed]) => {
    const covered = food.filter(row => (row.dietary || []).includes(kind))
      .reduce((sum,row) => sum + Number(row.claimed_serves || 0) * row.quantity, 0);
    return [kind,{ needed:Number(needed || 0), covered, short:Math.max(0,Number(needed || 0)-covered) }];
  }));
  return {
    servings,
    headcount:Number(headcount || 0),
    servingShort:Math.max(0,Number(headcount || 0)-servings),
    dietary,
    providers:new Set(rows.map(row=>row.vendor)).size,
    lines:rows.length
  };
}

export function basketSubtotal(lines = []) {
  return aggregateBasket(lines).reduce((sum,row) => sum + Number(row.price || 0) * row.quantity, 0);
}

export function materializeBasket(lines = []) {
  return aggregateBasket(lines).flatMap(row => Array.from({ length:row.quantity }, () => {
    const { quantity, catalogKey, vendorKind, serviceLevels, ...item } = row;
    return clone(item);
  }));
}
