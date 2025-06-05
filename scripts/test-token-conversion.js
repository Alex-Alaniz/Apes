const { BN } = require('@coral-xyz/anchor');

// Replicate the utility functions
function uiToUnits(uiAmount, decimals) {
  const amount = typeof uiAmount === 'string' ? parseFloat(uiAmount) : uiAmount;
  if (isNaN(amount) || amount < 0) {
    throw new Error('Invalid amount');
  }
  
  // Convert to smallest units
  const units = Math.floor(amount * Math.pow(10, decimals));
  return new BN(units);
}

function unitsToUi(units, decimals) {
  let bnUnits;
  if (units._bn) { // Check if it's a BN object
    bnUnits = units;
  } else {
    bnUnits = new BN(units.toString());
  }
  
  const divisor = new BN(10).pow(new BN(decimals));
  const quotient = bnUnits.div(divisor);
  const remainder = bnUnits.mod(divisor);
  
  // Convert to number with decimals
  const wholeNumber = quotient.toNumber();
  const fraction = remainder.toNumber() / Math.pow(10, decimals);
  
  return wholeNumber + fraction;
}

// Test with 6 decimals (APES devnet)
const decimals = 6;

console.log('Testing token conversions with', decimals, 'decimals\n');

// Test UI to Units
const testAmounts = ['10', '100', '1000', '0.1', '0.01', '0.001'];
console.log('UI Amount -> On-chain Units:');
testAmounts.forEach(amount => {
  const units = uiToUnits(amount, decimals);
  console.log(`${amount} APES -> ${units.toString()} units`);
});

console.log('\nExpected behavior:');
console.log('10 APES -> 10,000,000 units (10 * 10^6)');
console.log('0.1 APES -> 100,000 units');
console.log('0.001 APES -> 1,000 units');

// Test Units to UI
console.log('\n\nOn-chain Units -> UI Amount:');
const testUnits = ['10000000', '1000000', '100000', '10000', '1000', '100', '10', '1'];
testUnits.forEach(units => {
  const ui = unitsToUi(units, decimals);
  console.log(`${units} units -> ${ui} APES`);
});

// Test round trip
console.log('\n\nRound trip test:');
const roundTripAmounts = ['10', '100.5', '0.123456', '0.000001'];
roundTripAmounts.forEach(amount => {
  const units = uiToUnits(amount, decimals);
  const backToUi = unitsToUi(units, decimals);
  console.log(`${amount} -> ${units.toString()} units -> ${backToUi} APES`);
}); 