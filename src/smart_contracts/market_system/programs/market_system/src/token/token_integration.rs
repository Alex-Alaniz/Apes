use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::system_instruction;

pub mod token_integration {
    use super::*;

    // Initialize the prediction market platform with token settings
    pub fn initialize(
        ctx: Context<Initialize>,
        bet_burn_rate: u64,
        claim_burn_rate: u64,
        platform_fee_rate: u64,
    ) -> Result<()> {
        let platform_state = &mut ctx.accounts.platform_state;
        
        // Validate burn rates and fees (in basis points, 1% = 100)
        require!(bet_burn_rate <= 1000, ErrorCode::BurnRateTooHigh); // Max 10%
        require!(claim_burn_rate <= 1000, ErrorCode::BurnRateTooHigh); // Max 10%
        require!(platform_fee_rate <= 500, ErrorCode::FeeTooHigh); // Max 5%
        
        platform_state.authority = ctx.accounts.authority.key();
        platform_state.token_mint = ctx.accounts.token_mint.key();
        platform_state.treasury = ctx.accounts.treasury.key();
        platform_state.bet_burn_rate = bet_burn_rate;
        platform_state.claim_burn_rate = claim_burn_rate;
        platform_state.platform_fee_rate = platform_fee_rate;
        platform_state.total_burned = 0;
        platform_state.total_volume = 0;
        platform_state.is_paused = false;
        
        msg!("Prediction market platform initialized");
        msg!("Bet burn rate: {}bp", bet_burn_rate);
        msg!("Claim burn rate: {}bp", claim_burn_rate);
        msg!("Platform fee rate: {}bp", platform_fee_rate);
        
        Ok(())
    }
    
    // Update platform parameters
    pub fn update_parameters(
        ctx: Context<UpdateParameters>,
        bet_burn_rate: Option<u64>,
        claim_burn_rate: Option<u64>,
        platform_fee_rate: Option<u64>,
    ) -> Result<()> {
        let platform_state = &mut ctx.accounts.platform_state;
        
        // Only update parameters that are provided
        if let Some(rate) = bet_burn_rate {
            require!(rate <= 1000, ErrorCode::BurnRateTooHigh);
            platform_state.bet_burn_rate = rate;
            msg!("Updated bet burn rate: {}bp", rate);
        }
        
        if let Some(rate) = claim_burn_rate {
            require!(rate <= 1000, ErrorCode::BurnRateTooHigh);
            platform_state.claim_burn_rate = rate;
            msg!("Updated claim burn rate: {}bp", rate);
        }
        
        if let Some(rate) = platform_fee_rate {
            require!(rate <= 500, ErrorCode::FeeTooHigh);
            platform_state.platform_fee_rate = rate;
            msg!("Updated platform fee rate: {}bp", rate);
        }
        
        Ok(())
    }
    
    // Pause or unpause the platform
    pub fn set_pause_state(ctx: Context<SetPauseState>, paused: bool) -> Result<()> {
        let platform_state = &mut ctx.accounts.platform_state;
        platform_state.is_paused = paused;
        
        if paused {
            msg!("Platform paused");
        } else {
            msg!("Platform unpaused");
        }
        
        Ok(())
    }
    
    // Process token burn for bet placement
    pub fn process_bet_burn(
        ctx: Context<ProcessBurn>,
        amount: u64,
        proof_id: String,
    ) -> Result<()> {
        let platform_state = &mut ctx.accounts.platform_state;
        require!(!platform_state.is_paused, ErrorCode::PlatformPaused);
        
        // Calculate burn amount (bet_burn_rate is in basis points)
        let burn_amount = amount
            .checked_mul(platform_state.bet_burn_rate)
            .ok_or(ErrorCode::CalculationError)?
            .checked_div(10000)
            .ok_or(ErrorCode::CalculationError)?;
            
        // Calculate platform fee
        let fee_amount = amount
            .checked_mul(platform_state.platform_fee_rate)
            .ok_or(ErrorCode::CalculationError)?
            .checked_div(10000)
            .ok_or(ErrorCode::CalculationError)?;
            
        // Transfer burn amount to burn address
        // In production, this would integrate with BelieveApp API
        // For now, we'll transfer to a designated burn address
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.burn_token_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            burn_amount,
        )?;
        
        // Transfer platform fee to treasury
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.treasury_token_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            fee_amount,
        )?;
        
        // Update platform state
        platform_state.total_burned = platform_state
            .total_burned
            .checked_add(burn_amount)
            .ok_or(ErrorCode::CalculationError)?;
            
        platform_state.total_volume = platform_state
            .total_volume
            .checked_add(amount)
            .ok_or(ErrorCode::CalculationError)?;
            
        // Log the burn for BelieveApp integration
        msg!("Processed bet burn: {} tokens", burn_amount);
        msg!("Proof ID: {}", proof_id);
        msg!("Platform fee: {} tokens", fee_amount);
        
        Ok(())
    }
    
    // Process token burn for reward claiming
    pub fn process_claim_burn(
        ctx: Context<ProcessBurn>,
        amount: u64,
        proof_id: String,
    ) -> Result<()> {
        let platform_state = &mut ctx.accounts.platform_state;
        require!(!platform_state.is_paused, ErrorCode::PlatformPaused);
        
        // Calculate burn amount (claim_burn_rate is in basis points)
        let burn_amount = amount
            .checked_mul(platform_state.claim_burn_rate)
            .ok_or(ErrorCode::CalculationError)?
            .checked_div(10000)
            .ok_or(ErrorCode::CalculationError)?;
            
        // No platform fee on claims, only burn
            
        // Transfer burn amount to burn address
        // In production, this would integrate with BelieveApp API
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.burn_token_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            burn_amount,
        )?;
        
        // Update platform state
        platform_state.total_burned = platform_state
            .total_burned
            .checked_add(burn_amount)
            .ok_or(ErrorCode::CalculationError)?;
            
        // Log the burn for BelieveApp integration
        msg!("Processed claim burn: {} tokens", burn_amount);
        msg!("Proof ID: {}", proof_id);
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + PlatformState::LEN
    )]
    pub platform_state: Account<'info, PlatformState>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub token_mint: Account<'info, token::Mint>,
    
    /// CHECK: This is the treasury account that will receive platform fees
    pub treasury: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct UpdateParameters<'info> {
    #[account(
        mut,
        has_one = authority @ ErrorCode::Unauthorized
    )]
    pub platform_state: Account<'info, PlatformState>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetPauseState<'info> {
    #[account(
        mut,
        has_one = authority @ ErrorCode::Unauthorized
    )]
    pub platform_state: Account<'info, PlatformState>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ProcessBurn<'info> {
    #[account(mut)]
    pub platform_state: Account<'info, PlatformState>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        constraint = user_token_account.owner == user.key() @ ErrorCode::Unauthorized
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub burn_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub treasury_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct PlatformState {
    pub authority: Pubkey,
    pub token_mint: Pubkey,
    pub treasury: Pubkey,
    pub bet_burn_rate: u64,    // In basis points (1% = 100)
    pub claim_burn_rate: u64,  // In basis points (1% = 100)
    pub platform_fee_rate: u64, // In basis points (1% = 100)
    pub total_burned: u64,
    pub total_volume: u64,
    pub is_paused: bool,
}

impl PlatformState {
    pub const LEN: usize = 32 + // authority
                           32 + // token_mint
                           32 + // treasury
                           8 +  // bet_burn_rate
                           8 +  // claim_burn_rate
                           8 +  // platform_fee_rate
                           8 +  // total_burned
                           8 +  // total_volume
                           1;   // is_paused
}

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized access")]
    Unauthorized,
    
    #[msg("Burn rate too high")]
    BurnRateTooHigh,
    
    #[msg("Fee too high")]
    FeeTooHigh,
    
    #[msg("Calculation error")]
    CalculationError,
    
    #[msg("Platform is paused")]
    PlatformPaused,
}
