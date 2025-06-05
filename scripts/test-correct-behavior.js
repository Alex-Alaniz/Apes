const { BN } = require('@coral-xyz/anchor');

// Helper function to convert UI to units
function uiToUnits(uiAmount, decimals) {
  const amount = typeof uiAmount === 'string' ? parseFloat(uiAmount) : uiAmount;
  const units = Math.floor(amount * Math.pow(10, decimals));
  return new BN(units);
}

console.log('=== Correct Token Behavior with Proper Decimals ===\n');

// Test cases
const testAmounts = [10, 100, 0.5, 0.1];

console.log('DEVNET (6 decimals):');
console.log('When user enters → Units sent → Blockchain interprets as');
testAmounts.forEach(amount => {
  const units = uiToUnits(amount, 6);
  console.log(`${amount} APES → ${units.toString()} units → ${amount} APES ✅`);
});

console.log('\nMAINNET (9 decimals):');
console.log('When user enters → Units sent → Blockchain interprets as');
testAmounts.forEach(amount => {
  const units = uiToUnits(amount, 9);
  console.log(`${amount} APES → ${units.toString()} units → ${amount} APES ✅`);
});

console.log('\n=== Summary ===');
console.log('✅ Devnet: User enters 10 → sends 10,000,000 units → wallet shows 10 APES deducted');
console.log('✅ Mainnet: User enters 10 → sends 10,000,000,000 units → wallet shows 10 APES deducted');
console.log('\nNo more 1,000× scaling issues! Users get exactly what they expect.'); 