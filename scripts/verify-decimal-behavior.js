const { BN } = require('@coral-xyz/anchor');

// Simulate what happens with different decimal configurations
console.log('=== Token Decimal Behavior Analysis ===\n');

// User enters 10 tokens in the UI
const uiAmount = 10;

// Scenario 1: Using 9 decimals (as configured)
const configDecimals = 9;
const unitsWithConfig = Math.floor(uiAmount * Math.pow(10, configDecimals));
console.log('Scenario 1: Using configured 9 decimals');
console.log(`User enters: ${uiAmount} tokens`);
console.log(`Converted to units: ${unitsWithConfig.toLocaleString()} (${uiAmount} × 10^9)`);

// Scenario 2: Using actual mint decimals (6)
const actualMintDecimals = 6;
const unitsWithMint = Math.floor(uiAmount * Math.pow(10, actualMintDecimals));
console.log('\nScenario 2: Using actual mint 6 decimals');
console.log(`User enters: ${uiAmount} tokens`);
console.log(`Converted to units: ${unitsWithMint.toLocaleString()} (${uiAmount} × 10^6)`);

// Show the difference
const scalingFactor = Math.pow(10, configDecimals - actualMintDecimals);
console.log('\n=== Impact ===');
console.log(`Scaling factor: ${scalingFactor}×`);
console.log(`When you send ${unitsWithConfig.toLocaleString()} units to a 6-decimal mint:`);
console.log(`The blockchain interprets it as: ${(unitsWithConfig / Math.pow(10, actualMintDecimals)).toLocaleString()} tokens`);
console.log(`That's ${scalingFactor}× more than intended!\n`);

// What the wallet will show
console.log('=== What happens in practice ===');
console.log('1. You enter 10 tokens in the UI');
console.log('2. We convert to 10,000,000,000 units (using 9 decimals)');
console.log('3. The transaction sends 10,000,000,000 units');
console.log('4. The blockchain (6 decimals) interprets this as 10,000 tokens!');
console.log('5. Your wallet shows 10,000 tokens were sent (not 10)');

console.log('\n⚠️  WARNING: Using 9 decimals when the mint has 6 will cause a 1,000× scaling error!');
console.log('Recommendation: Use the actual mint decimals (6) to avoid this issue.'); 