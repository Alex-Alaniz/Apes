use anchor_lang::prelude::*;
use crate::ErrorCode;

#[account]
#[derive(Default)]
pub struct AccessControl {
    pub admin: Pubkey,
    pub market_creators: Vec<Pubkey>, // up to 32 creators for now
}

impl AccessControl {
    pub const MAX_CREATORS: usize = 32;
    pub const LEN: usize = 32 + 4 + (32 * Self::MAX_CREATORS); // admin + vec len + creators
}

pub fn initialize_access_control(ctx: Context<crate::InitializeAccessControl>) -> Result<()> {
    let access_control = &mut ctx.accounts.access_control;
    access_control.admin = ctx.accounts.admin.key();
    access_control.market_creators = Vec::new();
    Ok(())
}

pub fn add_market_creator(ctx: Context<crate::AddMarketCreator>, new_creator: Pubkey) -> Result<()> {
    let access_control = &mut ctx.accounts.access_control;
    require!(
        access_control.market_creators.len() < AccessControl::MAX_CREATORS,
        ErrorCode::TooManyMarketCreators
    );
    require!(
        !access_control.market_creators.contains(&new_creator),
        ErrorCode::Unauthorized
    );
    access_control.market_creators.push(new_creator);
    Ok(())
}

pub fn remove_market_creator(ctx: Context<crate::RemoveMarketCreator>, creator: Pubkey) -> Result<()> {
    let access_control = &mut ctx.accounts.access_control;
    let index = access_control
        .market_creators
        .iter()
        .position(|&x| x == creator)
        .ok_or(ErrorCode::Unauthorized)?;
    access_control.market_creators.remove(index);
    Ok(())
} 