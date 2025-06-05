use anchor_lang::prelude::*;

// BelieveApp integration for token burning
// This module emits events that are processed off-chain by a backend service
// that calls the BelieveApp API

#[event]
pub struct BurnEvent {
    pub burn_type: BurnType,
    pub user: Pubkey,
    pub market: Pubkey,
    pub amount: u64,
    pub burn_amount: u64,
    pub prediction_option: Option<String>,
    pub timestamp: i64,
    pub transaction_signature: [u8; 64],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum BurnType {
    PredictionBet,
    RewardClaim,
    MarketCreation,
}

// Process bet burn - emits event for off-chain processing
pub fn process_bet_burn(
    user: Pubkey,
    market: Pubkey,
    prediction_option: String,
    amount: u64,
    burn_amount: u64,
) -> Result<()> {
    // Get current timestamp
    let timestamp = Clock::get()?.unix_timestamp;
    
    // In a real implementation, we would get the transaction signature
    // For now, we use a placeholder
    let transaction_signature = [0u8; 64];
    
    // Emit burn event for off-chain processing
    emit!(BurnEvent {
        burn_type: BurnType::PredictionBet,
        user,
        market,
        amount,
        burn_amount,
        prediction_option: Some(prediction_option),
        timestamp,
        transaction_signature,
    });
    
    msg!("Burn event emitted: PREDICTION_BET, user: {}, market: {}, burn_amount: {}", 
        user, market, burn_amount);
    
    Ok(())
}

// Process reward claim burn - emits event for off-chain processing
pub fn process_reward_burn(
    user: Pubkey,
    market: Pubkey,
    amount: u64,
    burn_amount: u64,
) -> Result<()> {
    let timestamp = Clock::get()?.unix_timestamp;
    let transaction_signature = [0u8; 64];
    
    emit!(BurnEvent {
        burn_type: BurnType::RewardClaim,
        user,
        market,
        amount,
        burn_amount,
        prediction_option: None,
        timestamp,
        transaction_signature,
    });
    
    msg!("Burn event emitted: REWARD_CLAIM, user: {}, market: {}, burn_amount: {}", 
        user, market, burn_amount);
    
    Ok(())
}

// Process market creation burn - emits event for off-chain processing
pub fn process_market_creation_burn(
    creator: Pubkey,
    market: Pubkey,
    stake_amount: u64,
    burn_amount: u64,
) -> Result<()> {
    let timestamp = Clock::get()?.unix_timestamp;
    let transaction_signature = [0u8; 64];
    
    emit!(BurnEvent {
        burn_type: BurnType::MarketCreation,
        user: creator,
        market,
        amount: stake_amount,
        burn_amount,
        prediction_option: None,
        timestamp,
        transaction_signature,
    });
    
    msg!("Burn event emitted: MARKET_CREATION, creator: {}, market: {}, burn_amount: {}", 
        creator, market, burn_amount);
    
    Ok(())
}

// Calculate burn amount based on rate (in basis points)
pub fn calculate_burn_amount(amount: u64, burn_rate: u64) -> Result<u64> {
    amount
        .checked_mul(burn_rate)
        .ok_or(error!(ErrorCode::CalculationError))?
        .checked_div(10000)
        .ok_or(error!(ErrorCode::CalculationError))
}

#[error_code]
pub enum ErrorCode {
    #[msg("Calculation error")]
    CalculationError,
} 