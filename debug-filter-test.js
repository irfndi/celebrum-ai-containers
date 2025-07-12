// Debug script to test the filtering logic
const fallbackOpportunities = [
  {
    id: `fallback_${Date.now()}_1`,
    symbol: 'BTC/USDT',
    exchange_a: 'binance',
    exchange_b: 'coinbase',
    price_a: 45000,
    price_b: 45200,
    profit_percentage: 0.44,
    confidence_score: 0.95,
    generated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 300000).toISOString()
  },
  {
    id: `fallback_${Date.now()}_2`,
    symbol: 'ETH/USDT',
    exchange_a: 'binance',
    exchange_b: 'kraken',
    price_a: 3000,
    price_b: 3015,
    profit_percentage: 0.50,
    confidence_score: 0.90,
    generated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 300000).toISOString()
  }
];

function filterOpportunitiesByRole(opportunities, role) {
  console.log(`Filtering ${opportunities.length} opportunities for role: ${role}`);
  opportunities.forEach(opp => {
    console.log(`Opportunity ${opp.id}: profit=${opp.profit_percentage}%, confidence=${opp.confidence_score}`);
  });
  
  let filtered;
  switch (role) {
    case 'free':
      filtered = opportunities.filter(opp => opp.confidence_score >= 0.8 && opp.profit_percentage >= 0.3);
      break;
    case 'pro':
      filtered = opportunities.filter(opp => opp.confidence_score >= 0.7 && opp.profit_percentage >= 0.2);
      break;
    case 'ultra':
    case 'admin':
    case 'superadmin':
      filtered = opportunities; // All opportunities
      break;
    default:
      filtered = opportunities.filter(opp => opp.confidence_score >= 0.8);
  }
  
  console.log(`After filtering: ${filtered.length} opportunities remain`);
  filtered.forEach(opp => {
    console.log(`Remaining: ${opp.id}: profit=${opp.profit_percentage}%, confidence=${opp.confidence_score}`);
  });
  return filtered;
}

console.log('Testing pro role filtering:');
const result = filterOpportunitiesByRole(fallbackOpportunities, 'pro');
console.log('Final result length:', result.length);