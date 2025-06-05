use anchor_lang::prelude::*;

/// Maximum pool size to prevent overflow attacks (100 billion tokens)
pub const MAX_TOTAL_POOL_SIZE: u64 = 100_000_000_000 * 1_000_000; // 100B with 6 decimals (~$20M)

/// Maximum bet amount per transaction (1 billion tokens) - ~$204,000 at current prices
pub const MAX_BET_AMOUNT: u64 = 1_000_000_000 * 1_000_000; // 1B APES with 6 decimals

/// Maximum fee rate (10% = 1000 basis points)
pub const MAX_FEE_RATE: u64 = 1000;

/// Minimum market duration (1 hour)
pub const MIN_MARKET_DURATION: i64 = 3600; // 1 hour in seconds

/// Maximum market duration (2 years)
pub const MAX_MARKET_DURATION: i64 = 2 * 365 * 24 * 3600; // 2 years in seconds

/// Validates that option index is within bounds
pub fn validate_option_index(option_index: u8, option_count: u8) -> Result<()> {
    require!(
        option_index < option_count,
        ErrorCode::InvalidOptionIndex
    );
    Ok(())
}

/// Validates bet amount is within acceptable limits
pub fn validate_bet_amount(amount: u64, min_bet: u64) -> Result<()> {
    require!(
        amount >= min_bet,
        ErrorCode::BetTooSmall
    );
    require!(
        amount <= MAX_BET_AMOUNT,
        ErrorCode::BetTooLarge
    );
    Ok(())
}

/// Validates that adding to pool won't cause overflow
pub fn validate_pool_addition(current_pool: u64, amount_to_add: u64) -> Result<()> {
    let new_total = current_pool
        .checked_add(amount_to_add)
        .ok_or(ErrorCode::CalculationError)?;
    
    require!(
        new_total <= MAX_TOTAL_POOL_SIZE,
        ErrorCode::PoolOverflow
    );
    
    Ok(())
}

/// Validates fee rates are within acceptable bounds
pub fn validate_fee_rate(fee_rate: u64) -> Result<()> {
    require!(
        fee_rate <= MAX_FEE_RATE,
        ErrorCode::FeeTooHigh
    );
    Ok(())
}

/// Validates market duration
pub fn validate_market_duration(resolution_date: i64, current_time: i64) -> Result<()> {
    let duration = resolution_date
        .checked_sub(current_time)
        .ok_or(ErrorCode::InvalidResolutionDate)?;
    
    require!(
        duration >= MIN_MARKET_DURATION,
        ErrorCode::MarketDurationTooShort
    );
    
    require!(
        duration <= MAX_MARKET_DURATION,
        ErrorCode::MarketDurationTooLong
    );
    
    Ok(())
}

/// Ensures no division by zero
pub fn safe_div(numerator: u64, denominator: u64) -> Result<u64> {
    require!(
        denominator != 0,
        ErrorCode::DivisionByZero
    );
    
    numerator
        .checked_div(denominator)
        .ok_or(ErrorCode::CalculationError.into())
}

/// Safe multiplication with overflow check
pub fn safe_mul(a: u64, b: u64) -> Result<u64> {
    a.checked_mul(b)
        .ok_or(ErrorCode::CalculationError.into())
}

/// Safe subtraction with underflow check
pub fn safe_sub(a: u64, b: u64) -> Result<u64> {
    a.checked_sub(b)
        .ok_or(ErrorCode::CalculationError.into())
}

/// Validates string length for fixed arrays
pub fn validate_string_length(actual_len: usize, max_len: usize) -> Result<()> {
    require!(
        actual_len <= max_len,
        ErrorCode::StringTooLong
    );
    Ok(())
}

/// Additional error codes for security checks
#[error_code]
pub enum ErrorCode {
    #[msg("Invalid option index")]
    InvalidOptionIndex,
    #[msg("Bet amount too small")]
    BetTooSmall,
    #[msg("Bet amount too large")]
    BetTooLarge,
    #[msg("Pool overflow - maximum size exceeded")]
    PoolOverflow,
    #[msg("Fee rate too high")]
    FeeTooHigh,
    #[msg("Invalid resolution date")]
    InvalidResolutionDate,
    #[msg("Market duration too short")]
    MarketDurationTooShort,
    #[msg("Market duration too long")]
    MarketDurationTooLong,
    #[msg("Division by zero")]
    DivisionByZero,
    #[msg("Calculation error")]
    CalculationError,
    #[msg("String too long")]
    StringTooLong,
} 