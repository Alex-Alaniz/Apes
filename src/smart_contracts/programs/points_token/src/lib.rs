use anchor_lang::prelude::*;
use anchor_spl::token_2022::{self, Token2022};
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use spl_token_2022::extension::ExtensionType;

declare_id!("PoiNTsXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");

#[program]
pub mod points_token {
    use super::*;

    pub fn initialize_points_system(
        ctx: Context<InitializePointsSystem>,
        params: InitializeParams,
    ) -> Result<()> {
        let points_system = &mut ctx.accounts.points_system;
        
        points_system.authority = ctx.accounts.authority.key();
        points_system.mint = ctx.accounts.mint.key();
        points_system.redemption_contract = params.redemption_contract;
        points_system.believe_app_endpoint = params.believe_app_endpoint;
        points_system.min_redemption_amount = params.min_redemption_amount;
        points_system.cooldown_period = params.cooldown_period;
        points_system.total_minted = 0;
        points_system.total_redeemed = 0;
        points_system.bump = ctx.bumps.points_system;
        
        msg!("Points system initialized");
        Ok(())
    }

    pub fn mint_points(
        ctx: Context<MintPoints>,
        amount: u64,
        activity_type: String,
    ) -> Result<()> {
        require!(amount > 0, PointsError::InvalidAmount);
        require!(activity_type.len() <= 50, PointsError::ActivityTypeTooLong);
        
        // Mint points to user
        let cpi_accounts = token_2022::MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.user_points_account.to_account_info(),
            authority: ctx.accounts.points_system.to_account_info(),
        };
        
        let seeds = &[
            b"points_system",
            &[ctx.accounts.points_system.bump],
        ];
        let signer = &[&seeds[..]];
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        
        token_2022::mint_to(cpi_ctx, amount)?;
        
        // Update system stats
        ctx.accounts.points_system.total_minted += amount;
        
        // Update user stats
        ctx.accounts.user_points_stats.total_earned += amount;
        ctx.accounts.user_points_stats.last_earned_at = Clock::get()?.unix_timestamp;
        
        emit!(PointsMinted {
            user: ctx.accounts.user.key(),
            amount,
            activity_type,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        msg!("Minted {} points to user {}", amount, ctx.accounts.user.key());
        Ok(())
    }

    pub fn redeem_points(
        ctx: Context<RedeemPoints>,
        amount: u64,
    ) -> Result<()> {
        let clock = Clock::get()?;
        let user_stats = &ctx.accounts.user_points_stats;
        
        // Check minimum redemption
        require!(
            amount >= ctx.accounts.points_system.min_redemption_amount,
            PointsError::BelowMinimumRedemption
        );
        
        // Check cooldown
        if let Some(last_redeemed) = user_stats.last_redeemed_at {
            require!(
                clock.unix_timestamp - last_redeemed >= ctx.accounts.points_system.cooldown_period,
                PointsError::CooldownNotMet
            );
        }
        
        // Check balance
        require!(
            ctx.accounts.user_points_account.amount >= amount,
            PointsError::InsufficientBalance
        );
        
        // Burn points
        let cpi_accounts = token_2022::Burn {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.user_points_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        
        token_2022::burn(cpi_ctx, amount)?;
        
        // Update stats
        ctx.accounts.points_system.total_redeemed += amount;
        ctx.accounts.user_points_stats.total_redeemed += amount;
        ctx.accounts.user_points_stats.last_redeemed_at = Some(clock.unix_timestamp);
        
        // Create redemption record
        let redemption = &mut ctx.accounts.redemption_record;
        redemption.user = ctx.accounts.user.key();
        redemption.amount = amount;
        redemption.timestamp = clock.unix_timestamp;
        redemption.status = RedemptionStatus::Pending;
        redemption.believe_app_request_id = None;
        
        emit!(PointsRedeemed {
            user: ctx.accounts.user.key(),
            amount,
            redemption_id: redemption.key(),
            timestamp: clock.unix_timestamp,
        });
        
        msg!("User {} redeemed {} points", ctx.accounts.user.key(), amount);
        Ok(())
    }

    pub fn link_twitter_account(
        ctx: Context<LinkTwitterAccount>,
        twitter_id: String,
        twitter_username: String,
    ) -> Result<()> {
        require!(twitter_id.len() <= 50, PointsError::InvalidTwitterId);
        require!(twitter_username.len() <= 50, PointsError::InvalidTwitterUsername);
        
        let user_profile = &mut ctx.accounts.user_profile;
        
        // Check if already linked
        require!(user_profile.twitter_id.is_none(), PointsError::TwitterAlreadyLinked);
        
        user_profile.wallet = ctx.accounts.user.key();
        user_profile.twitter_id = Some(twitter_id.clone());
        user_profile.twitter_username = Some(twitter_username.clone());
        user_profile.twitter_linked_at = Some(Clock::get()?.unix_timestamp);
        
        emit!(TwitterLinked {
            user: ctx.accounts.user.key(),
            twitter_id,
            twitter_username,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializePointsSystem<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + PointsSystem::INIT_SPACE,
        seeds = [b"points_system"],
        bump
    )]
    pub points_system: Account<'info, PointsSystem>,
    
    #[account(
        init,
        payer = authority,
        mint::decimals = 0,
        mint::authority = points_system,
        mint::freeze_authority = points_system,
        extensions::metadata::name = "PRIMAPE Points",
        extensions::metadata::symbol = "PMP",
        extensions::metadata::uri = "https://primape.com/points-metadata.json",
        extensions::non_transferable::enable = true,
    )]
    pub mint: InterfaceAccount<'info, Mint>,
    
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintPoints<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// CHECK: User receiving points
    pub user: AccountInfo<'info>,
    
    #[account(
        mut,
        seeds = [b"points_system"],
        bump = points_system.bump,
        has_one = authority,
    )]
    pub points_system: Account<'info, PointsSystem>,
    
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,
    
    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = mint,
        associated_token::authority = user,
        associated_token::token_program = token_program,
    )]
    pub user_points_account: InterfaceAccount<'info, TokenAccount>,
    
    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + UserPointsStats::INIT_SPACE,
        seeds = [b"user_stats", user.key().as_ref()],
        bump
    )]
    pub user_points_stats: Account<'info, UserPointsStats>,
    
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RedeemPoints<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"points_system"],
        bump = points_system.bump,
    )]
    pub points_system: Account<'info, PointsSystem>,
    
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,
    
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = user,
        associated_token::token_program = token_program,
    )]
    pub user_points_account: InterfaceAccount<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"user_stats", user.key().as_ref()],
        bump
    )]
    pub user_points_stats: Account<'info, UserPointsStats>,
    
    #[account(
        init,
        payer = user,
        space = 8 + RedemptionRecord::INIT_SPACE,
        seeds = [b"redemption", user.key().as_ref(), &Clock::get()?.unix_timestamp.to_le_bytes()],
        bump
    )]
    pub redemption_record: Account<'info, RedemptionRecord>,
    
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LinkTwitterAccount<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserProfile::INIT_SPACE,
        seeds = [b"user_profile", user.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct PointsSystem {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub redemption_contract: Pubkey,
    #[max_len(200)]
    pub believe_app_endpoint: String,
    pub min_redemption_amount: u64,
    pub cooldown_period: i64,
    pub total_minted: u64,
    pub total_redeemed: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UserPointsStats {
    pub user: Pubkey,
    pub total_earned: u64,
    pub total_redeemed: u64,
    pub last_earned_at: i64,
    pub last_redeemed_at: Option<i64>,
}

#[account]
#[derive(InitSpace)]
pub struct UserProfile {
    pub wallet: Pubkey,
    #[max_len(50)]
    pub twitter_id: Option<String>,
    #[max_len(50)]
    pub twitter_username: Option<String>,
    pub twitter_linked_at: Option<i64>,
    pub twitter_followers: Option<u32>,
}

#[account]
#[derive(InitSpace)]
pub struct RedemptionRecord {
    pub user: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
    pub status: RedemptionStatus,
    #[max_len(100)]
    pub believe_app_request_id: Option<String>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum RedemptionStatus {
    Pending,
    Processing,
    Completed,
    Failed,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitializeParams {
    pub redemption_contract: Pubkey,
    pub believe_app_endpoint: String,
    pub min_redemption_amount: u64,
    pub cooldown_period: i64,
}

#[event]
pub struct PointsMinted {
    pub user: Pubkey,
    pub amount: u64,
    pub activity_type: String,
    pub timestamp: i64,
}

#[event]
pub struct PointsRedeemed {
    pub user: Pubkey,
    pub amount: u64,
    pub redemption_id: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct TwitterLinked {
    pub user: Pubkey,
    pub twitter_id: String,
    pub twitter_username: String,
    pub timestamp: i64,
}

#[error_code]
pub enum PointsError {
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Activity type too long")]
    ActivityTypeTooLong,
    #[msg("Below minimum redemption amount")]
    BelowMinimumRedemption,
    #[msg("Cooldown period not met")]
    CooldownNotMet,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Invalid Twitter ID")]
    InvalidTwitterId,
    #[msg("Invalid Twitter username")]
    InvalidTwitterUsername,
    #[msg("Twitter account already linked")]
    TwitterAlreadyLinked,
}

// Required imports for SPL Token 2022 extensions
use anchor_spl::associated_token::AssociatedToken;
use spl_token_2022::extension::non_transferable; 