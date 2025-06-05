use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};

pub mod meteora_integration {
    use super::*;

    // Initialize liquidity pool integration
    pub fn initialize_liquidity_pool(
        ctx: Context<InitializeLiquidityPool>,
        pool_id: String,
    ) -> Result<()> {
        let pool_state = &mut ctx.accounts.pool_state;
        
        pool_state.authority = ctx.accounts.authority.key();
        pool_state.token_mint = ctx.accounts.token_mint.key();
        pool_state.usdc_mint = ctx.accounts.usdc_mint.key();
        pool_state.pool_id = pool_id.clone();
        pool_state.is_active = true;
        pool_state.total_liquidity = 0;
        
        msg!("Liquidity pool initialized: {}", pool_id);
        
        Ok(())
    }
    
    // Add liquidity to the pool
    pub fn add_liquidity(
        ctx: Context<ManageLiquidity>,
        token_amount: u64,
        usdc_amount: u64,
    ) -> Result<()> {
        let pool_state = &mut ctx.accounts.pool_state;
        require!(pool_state.is_active, ErrorCode::PoolInactive);
        
        // Transfer platform tokens to pool
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.pool_token_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            token_amount,
        )?;
        
        // Transfer USDC to pool
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.user_usdc_account.to_account_info(),
                    to: ctx.accounts.pool_usdc_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            usdc_amount,
        )?;
        
        // Update pool state
        pool_state.total_liquidity = pool_state.total_liquidity
            .checked_add(token_amount)
            .ok_or(ErrorCode::CalculationError)?;
            
        // In a real implementation, we would mint LP tokens to the user
        // and track their share of the pool
        
        msg!("Liquidity added: {} tokens, {} USDC", token_amount, usdc_amount);
        
        Ok(())
    }
    
    // Remove liquidity from the pool
    pub fn remove_liquidity(
        ctx: Context<ManageLiquidity>,
        token_amount: u64,
        usdc_amount: u64,
    ) -> Result<()> {
        let pool_state = &mut ctx.accounts.pool_state;
        require!(pool_state.is_active, ErrorCode::PoolInactive);
        
        // Transfer platform tokens from pool to user
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.pool_token_account.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.pool_token_account.to_account_info(),
                },
                &[&[
                    b"pool_token_account",
                    pool_state.key().as_ref(),
                    &[ctx.bumps.pool_token_account],
                ]],
            ),
            token_amount,
        )?;
        
        // Transfer USDC from pool to user
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.pool_usdc_account.to_account_info(),
                    to: ctx.accounts.user_usdc_account.to_account_info(),
                    authority: ctx.accounts.pool_usdc_account.to_account_info(),
                },
                &[&[
                    b"pool_usdc_account",
                    pool_state.key().as_ref(),
                    &[ctx.bumps.pool_usdc_account],
                ]],
            ),
            usdc_amount,
        )?;
        
        // Update pool state
        pool_state.total_liquidity = pool_state.total_liquidity
            .checked_sub(token_amount)
            .ok_or(ErrorCode::CalculationError)?;
            
        // In a real implementation, we would burn LP tokens from the user
        
        msg!("Liquidity removed: {} tokens, {} USDC", token_amount, usdc_amount);
        
        Ok(())
    }
    
    // Swap tokens in the pool
    pub fn swap_tokens(
        ctx: Context<SwapTokens>,
        input_amount: u64,
        minimum_output_amount: u64,
        is_token_to_usdc: bool,
    ) -> Result<()> {
        let pool_state = &ctx.accounts.pool_state;
        require!(pool_state.is_active, ErrorCode::PoolInactive);
        
        // Get pool token balances
        let token_balance = ctx.accounts.pool_token_account.amount;
        let usdc_balance = ctx.accounts.pool_usdc_account.amount;
        
        // Calculate output amount based on constant product formula (x * y = k)
        // This is a simplified version; real AMMs have more complex formulas
        let output_amount = if is_token_to_usdc {
            // Token to USDC swap
            let new_token_balance = token_balance
                .checked_add(input_amount)
                .ok_or(ErrorCode::CalculationError)?;
                
            let new_usdc_balance = token_balance
                .checked_mul(usdc_balance)
                .ok_or(ErrorCode::CalculationError)?
                .checked_div(new_token_balance)
                .ok_or(ErrorCode::CalculationError)?;
                
            usdc_balance
                .checked_sub(new_usdc_balance)
                .ok_or(ErrorCode::CalculationError)?
        } else {
            // USDC to Token swap
            let new_usdc_balance = usdc_balance
                .checked_add(input_amount)
                .ok_or(ErrorCode::CalculationError)?;
                
            let new_token_balance = token_balance
                .checked_mul(usdc_balance)
                .ok_or(ErrorCode::CalculationError)?
                .checked_div(new_usdc_balance)
                .ok_or(ErrorCode::CalculationError)?;
                
            token_balance
                .checked_sub(new_token_balance)
                .ok_or(ErrorCode::CalculationError)?
        };
        
        // Check minimum output amount
        require!(
            output_amount >= minimum_output_amount,
            ErrorCode::SlippageTooHigh
        );
        
        // Execute the swap
        if is_token_to_usdc {
            // Transfer tokens from user to pool
            token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    token::Transfer {
                        from: ctx.accounts.user_token_account.to_account_info(),
                        to: ctx.accounts.pool_token_account.to_account_info(),
                        authority: ctx.accounts.user.to_account_info(),
                    },
                ),
                input_amount,
            )?;
            
            // Transfer USDC from pool to user
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    token::Transfer {
                        from: ctx.accounts.pool_usdc_account.to_account_info(),
                        to: ctx.accounts.user_usdc_account.to_account_info(),
                        authority: ctx.accounts.pool_usdc_account.to_account_info(),
                    },
                    &[&[
                        b"pool_usdc_account",
                        pool_state.key().as_ref(),
                        &[ctx.bumps.pool_usdc_account],
                    ]],
                ),
                output_amount,
            )?;
        } else {
            // Transfer USDC from user to pool
            token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    token::Transfer {
                        from: ctx.accounts.user_usdc_account.to_account_info(),
                        to: ctx.accounts.pool_usdc_account.to_account_info(),
                        authority: ctx.accounts.user.to_account_info(),
                    },
                ),
                input_amount,
            )?;
            
            // Transfer tokens from pool to user
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    token::Transfer {
                        from: ctx.accounts.pool_token_account.to_account_info(),
                        to: ctx.accounts.user_token_account.to_account_info(),
                        authority: ctx.accounts.pool_token_account.to_account_info(),
                    },
                    &[&[
                        b"pool_token_account",
                        pool_state.key().as_ref(),
                        &[ctx.bumps.pool_token_account],
                    ]],
                ),
                output_amount,
            )?;
        }
        
        msg!(
            "Swap executed: {} {} -> {} {}",
            input_amount,
            if is_token_to_usdc { "tokens" } else { "USDC" },
            output_amount,
            if is_token_to_usdc { "USDC" } else { "tokens" }
        );
        
        Ok(())
    }
    
    // Set pool active state
    pub fn set_pool_active(ctx: Context<SetPoolActive>, is_active: bool) -> Result<()> {
        let pool_state = &mut ctx.accounts.pool_state;
        pool_state.is_active = is_active;
        
        msg!(
            "Pool {} set to {}",
            pool_state.pool_id,
            if is_active { "active" } else { "inactive" }
        );
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeLiquidityPool<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + LiquidityPoolState::LEN
    )]
    pub pool_state: Account<'info, LiquidityPoolState>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub token_mint: Account<'info, token::Mint>,
    
    pub usdc_mint: Account<'info, token::Mint>,
    
    #[account(
        init,
        payer = authority,
        seeds = [b"pool_token_account", pool_state.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = pool_token_account,
    )]
    pub pool_token_account: Account<'info, TokenAccount>,
    
    #[account(
        init,
        payer = authority,
        seeds = [b"pool_usdc_account", pool_state.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = pool_usdc_account,
    )]
    pub pool_usdc_account: Account<'info, TokenAccount>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct ManageLiquidity<'info> {
    #[account(mut)]
    pub pool_state: Account<'info, LiquidityPoolState>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        constraint = user_token_account.owner == user.key() @ ErrorCode::Unauthorized,
        constraint = user_token_account.mint == pool_state.token_mint @ ErrorCode::InvalidMint
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = user_usdc_account.owner == user.key() @ ErrorCode::Unauthorized,
        constraint = user_usdc_account.mint == pool_state.usdc_mint @ ErrorCode::InvalidMint
    )]
    pub user_usdc_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"pool_token_account", pool_state.key().as_ref()],
        bump,
    )]
    pub pool_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"pool_usdc_account", pool_state.key().as_ref()],
        bump,
    )]
    pub pool_usdc_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SwapTokens<'info> {
    pub pool_state: Account<'info, LiquidityPoolState>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        constraint = user_token_account.owner == user.key() @ ErrorCode::Unauthorized,
        constraint = user_token_account.mint == pool_state.token_mint @ ErrorCode::InvalidMint
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = user_usdc_account.owner == user.key() @ ErrorCode::Unauthorized,
        constraint = user_usdc_account.mint == pool_state.usdc_mint @ ErrorCode::InvalidMint
    )]
    pub user_usdc_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"pool_token_account", pool_state.key().as_ref()],
        bump,
    )]
    pub pool_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"pool_usdc_account", pool_state.key().as_ref()],
        bump,
    )]
    pub pool_usdc_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SetPoolActive<'info> {
    #[account(
        mut,
        constraint = authority.key() == pool_state.authority @ ErrorCode::Unauthorized
    )]
    pub pool_state: Account<'info, LiquidityPoolState>,
    
    pub authority: Signer<'info>,
}

#[account]
pub struct LiquidityPoolState {
    pub authority: Pubkey,
    pub token_mint: Pubkey,
    pub usdc_mint: Pubkey,
    pub pool_id: String,
    pub is_active: bool,
    pub total_liquidity: u64,
}

impl LiquidityPoolState {
    pub const LEN: usize = 32 + // authority
                           32 + // token_mint
                           32 + // usdc_mint
                           50 + // pool_id (max 50 chars)
                           1 +  // is_active
                           8;   // total_liquidity
}

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized access")]
    Unauthorized,
    
    #[msg("Invalid token mint")]
    InvalidMint,
    
    #[msg("Calculation error")]
    CalculationError,
    
    #[msg("Pool is inactive")]
    PoolInactive,
    
    #[msg("Slippage too high")]
    SlippageTooHigh,
}
