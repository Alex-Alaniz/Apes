// Security Audit Remediation Plan
// This file outlines the fixes for security issues identified in the audit

// High Severity Fixes

// H-01: Insufficient Access Control in Market Resolution
// Implementation of multi-signature requirement for market resolution

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token};
use crate::market::market_system::Market;

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    
    #[account(
        seeds = [b"platform_state"],
        bump,
        constraint = platform_state.is_resolution_committee_member(&resolver.key()) @ PredictionMarketError::UnauthorizedResolver
    )]
    pub platform_state: Account<'info, PlatformState>,
    
    #[account(
        constraint = resolution_proposal.market == market.key() @ PredictionMarketError::InvalidResolutionProposal
    )]
    pub resolution_proposal: Account<'info, ResolutionProposal>,
    
    #[account(mut)]
    pub resolver: Signer<'info>,
}

#[account]
pub struct ResolutionProposal {
    pub market: Pubkey,
    pub proposed_outcome: u8,
    pub approvals: Vec<Pubkey>,
    pub required_approvals: u8,
    pub expiry_time: i64,
}

impl ResolutionProposal {
    pub fn is_approved(&self) -> bool {
        self.approvals.len() >= self.required_approvals as usize
    }
    
    pub fn is_expired(&self, current_time: i64) -> bool {
        current_time > self.expiry_time
    }
}

impl PlatformState {
    pub fn is_resolution_committee_member(&self, address: &Pubkey) -> bool {
        self.resolution_committee.contains(address)
    }
}

// H-02: Unchecked Token Transfer in Reward Claiming
// Implementation of proper error handling for token transfers

pub fn claim_reward(ctx: Context<ClaimReward>) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let user = &ctx.accounts.user;
    
    // Validate market is resolved
    require!(
        market.is_resolved(),
        PredictionMarketError::MarketNotResolved
    );
    
    // Validate user has not already claimed
    require!(
        !market.has_claimed_reward(user.key()),
        PredictionMarketError::RewardAlreadyClaimed
    );
    
    // Validate user is a winner
    require!(
        market.is_winner(user.key()),
        PredictionMarketError::NotAWinner
    );
    
    // Calculate reward amount
    let reward_amount = market.calculate_reward_amount(user.key())?;
    
    // Calculate burn amount (1.5% of reward)
    let platform_state = &ctx.accounts.platform_state;
    let burn_rate = platform_state.claim_burn_rate;
    let burn_amount = (reward_amount * burn_rate as u64) / 10000;
    let net_reward = reward_amount - burn_amount;
    
    // Process token burn via BelieveApp
    process_reward_burn(
        &ctx.accounts.believe_app_program,
        user.key(),
        market.key(),
        burn_amount,
    )?;
    
    // Transfer tokens to user with proper error handling
    let transfer_result = token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.market_token_account.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: market.to_account_info(),
            },
        ),
        net_reward,
    );
    
    // Handle transfer result
    match transfer_result {
        Ok(_) => {
            // Update market state only if transfer succeeds
            market.record_reward_claim(user.key(), reward_amount)?;
            emit!(RewardClaimed {
                user: user.key(),
                market: market.key(),
                amount: reward_amount,
                net_amount: net_reward,
                burn_amount,
            });
            Ok(())
        },
        Err(e) => {
            // Return error if transfer fails
            Err(e.into())
        }
    }
}

// Medium Severity Fixes

// M-01: Reentrancy Risk in Prediction Placement
// Implementation of reentrancy guard

#[derive(Default)]
pub struct ReentrancyGuard {
    entered: bool,
}

impl ReentrancyGuard {
    pub fn enter(&mut self) -> Result<()> {
        require!(!self.entered, PredictionMarketError::ReentrancyDetected);
        self.entered = true;
        Ok(())
    }
    
    pub fn exit(&mut self) {
        self.entered = false;
    }
}

pub fn place_prediction(ctx: Context<PlacePrediction>, args: PlacePredictionArgs) -> Result<()> {
    // Enter reentrancy guard
    ctx.accounts.market.reentrancy_guard.enter()?;
    
    // Validate market is active
    require!(
        ctx.accounts.market.is_active(),
        PredictionMarketError::MarketNotActive
    );
    
    // Validate market is not expired
    require!(
        !ctx.accounts.market.is_expired(Clock::get()?.unix_timestamp),
        PredictionMarketError::MarketExpired
    );
    
    // Validate option index
    require!(
        args.option_index < ctx.accounts.market.options.len() as u8,
        PredictionMarketError::InvalidOptionIndex
    );
    
    // Calculate burn amount (2.5% of bet amount)
    let platform_state = &ctx.accounts.platform_state;
    let burn_rate = platform_state.bet_burn_rate;
    let burn_amount = (args.amount * burn_rate as u64) / 10000;
    let net_amount = args.amount - burn_amount;
    
    // Update state BEFORE external calls
    ctx.accounts.market.add_prediction(
        ctx.accounts.user.key(),
        args.option_index,
        net_amount,
    )?;
    
    // Process token transfer
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.market_token_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        args.amount,
    )?;
    
    // Process token burn via BelieveApp
    process_bet_burn(
        &ctx.accounts.believe_app_program,
        ctx.accounts.user.key(),
        ctx.accounts.market.key(),
        ctx.accounts.market.options[args.option_index as usize].clone(),
        burn_amount,
    )?;
    
    // Emit event
    emit!(PredictionPlaced {
        user: ctx.accounts.user.key(),
        market: ctx.accounts.market.key(),
        option_index: args.option_index,
        amount: args.amount,
        net_amount,
        burn_amount,
    });
    
    // Exit reentrancy guard
    ctx.accounts.market.reentrancy_guard.exit();
    
    Ok(())
}

// M-02: Timestamp Manipulation Vulnerability
// Implementation of time buffer for market expiration

pub fn is_market_expired(market: &Market, current_time: i64) -> bool {
    // Add a buffer of 5 minutes (300 seconds) to mitigate minor timestamp manipulations
    const TIME_BUFFER: i64 = 300;
    current_time > market.resolution_date + TIME_BUFFER
}

// M-03: Lack of Slippage Protection in Token Swaps
// Implementation of slippage protection

pub fn execute_swap(
    ctx: Context<ExecuteSwap>,
    args: ExecuteSwapArgs,
) -> Result<()> {
    let pool_info = &ctx.accounts.pool_info;
    
    // Calculate expected output amount
    let expected_output = calculate_swap_output(
        pool_info,
        args.input_amount,
        args.is_token_to_usdc,
    )?;
    
    // Validate minimum output amount (slippage protection)
    require!(
        expected_output >= args.minimum_output_amount,
        MeteoraError::SlippageExceeded
    );
    
    // Execute swap
    // ... rest of swap implementation
    
    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ExecuteSwapArgs {
    pub input_amount: u64,
    pub minimum_output_amount: u64, // Added for slippage protection
    pub is_token_to_usdc: bool,
}

// Low Severity Fixes

// L-01: Missing Event Emissions
// Implementation of events for significant state changes

#[event]
pub struct MarketCreated {
    pub market: Pubkey,
    pub creator: Pubkey,
    pub question: String,
    pub options: Vec<String>,
    pub category: String,
    pub end_timestamp: i64,
    pub creator_stake: u64,
}

#[event]
pub struct MarketResolved {
    pub market: Pubkey,
    pub resolver: Pubkey,
    pub winning_option: u8,
    pub resolution_time: i64,
}

#[event]
pub struct PredictionPlaced {
    pub user: Pubkey,
    pub market: Pubkey,
    pub option_index: u8,
    pub amount: u64,
    pub net_amount: u64,
    pub burn_amount: u64,
}

#[event]
pub struct RewardClaimed {
    pub user: Pubkey,
    pub market: Pubkey,
    pub amount: u64,
    pub net_amount: u64,
    pub burn_amount: u64,
}

#[event]
pub struct PlatformUpdated {
    pub admin: Pubkey,
    pub bet_burn_rate: u16,
    pub claim_burn_rate: u16,
    pub platform_fee: u16,
}

#[event]
pub struct PlatformPaused {
    pub admin: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct PlatformUnpaused {
    pub admin: Pubkey,
    pub timestamp: i64,
}

// L-02: Hardcoded Gas Values
// Removal of hardcoded gas values

pub fn process_burn(
    _program: &AccountInfo,
    _user: Pubkey,
    _market: Pubkey,
    _burn_amount: u64,
) -> Result<()> {
    // Remove hardcoded gas values and use dynamic computation
    // ... implementation
    Ok(())
}

// L-03: Lack of Input Validation
// Implementation of comprehensive input validation

pub fn create_market(ctx: Context<CreateMarket>, args: CreateMarketArgs) -> Result<()> {
    // Validate question length
    require!(
        !args.question.is_empty() && args.question.len() <= 200,
        PredictionMarketError::InvalidQuestionLength
    );
    
    // Validate options
    require!(
        args.options.len() >= 2 && args.options.len() <= 10,
        PredictionMarketError::InvalidOptionsCount
    );
    
    for option in &args.options {
        require!(
            !option.is_empty() && option.len() <= 50,
            PredictionMarketError::InvalidOptionLength
        );
    }
    
    // Validate end timestamp
    let current_time = Clock::get()?.unix_timestamp;
    require!(
        args.end_timestamp > current_time && 
        args.end_timestamp <= current_time + 31536000, // Max 1 year in future
        PredictionMarketError::InvalidEndTimestamp
    );
    
    // Validate category
    require!(
        !args.category.is_empty() && args.category.len() <= 50,
        PredictionMarketError::InvalidCategoryLength
    );
    
    // Validate creator stake
    require!(
        args.creator_stake >= 100 * 1_000_000, // Minimum 100 tokens (with 6 decimals)
        PredictionMarketError::InsufficientCreatorStake
    );
    
    // ... rest of implementation
    
    Ok(())
}

// L-04: Inconsistent Error Handling
// Standardization of error handling

#[error_code]
pub enum PredictionMarketError {
    #[msg("Unauthorized access")]
    Unauthorized,
    
    #[msg("Unauthorized resolver")]
    UnauthorizedResolver,
    
    #[msg("Market not active")]
    MarketNotActive,
    
    #[msg("Market already resolved")]
    MarketAlreadyResolved,
    
    #[msg("Market not resolved")]
    MarketNotResolved,
    
    #[msg("Market expired")]
    MarketExpired,
    
    #[msg("Invalid option index")]
    InvalidOptionIndex,
    
    #[msg("Not a winner")]
    NotAWinner,
    
    #[msg("Reward already claimed")]
    RewardAlreadyClaimed,
    
    #[msg("Invalid resolution proposal")]
    InvalidResolutionProposal,
    
    #[msg("Reentrancy detected")]
    ReentrancyDetected,
    
    #[msg("Invalid question length")]
    InvalidQuestionLength,
    
    #[msg("Invalid options count")]
    InvalidOptionsCount,
    
    #[msg("Invalid option length")]
    InvalidOptionLength,
    
    #[msg("Invalid end timestamp")]
    InvalidEndTimestamp,
    
    #[msg("Invalid category length")]
    InvalidCategoryLength,
    
    #[msg("Insufficient creator stake")]
    InsufficientCreatorStake,
    
    #[msg("Platform is paused")]
    PlatformPaused,
    
    #[msg("Market is paused")]
    MarketPaused,
}

// L-05: Missing Pause Mechanism for Emergency Situations
// Implementation of emergency pause for individual markets

pub fn pause_market(ctx: Context<PauseMarket>) -> Result<()> {
    require!(
        ctx.accounts.platform_state.is_admin(&ctx.accounts.admin.key()),
        PredictionMarketError::Unauthorized
    );
    
    let market = &mut ctx.accounts.market;
    market.is_paused = true;
    
    emit!(MarketPaused {
        market: market.key(),
        admin: ctx.accounts.admin.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}

pub fn unpause_market(ctx: Context<UnpauseMarket>) -> Result<()> {
    require!(
        ctx.accounts.platform_state.is_admin(&ctx.accounts.admin.key()),
        PredictionMarketError::Unauthorized
    );
    
    let market = &mut ctx.accounts.market;
    market.is_paused = false;
    
    emit!(MarketUnpaused {
        market: market.key(),
        admin: ctx.accounts.admin.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}

#[event]
pub struct MarketPaused {
    pub market: Pubkey,
    pub admin: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct MarketUnpaused {
    pub market: Pubkey,
    pub admin: Pubkey,
    pub timestamp: i64,
}
