# PRIMAPE Prediction Markets - QA Testing Checklist

## Pre-Deployment Setup
- [ ] **Clean Database**
  - Backup existing data if needed
  - Clear all test data from markets, predictions, and user tables
  - Verify leaderboard shows mock data initially

- [ ] **Deploy Fresh Contract**
  - Deploy new prediction market contract on Solana Devnet
  - Note the new Program ID
  - Update `.env.local` with new Program ID
  - Verify contract has zero markets

## 1. User Onboarding & Authentication
- [ ] **Wallet Connection**
  - Connect with Phantom wallet
  - Connect with Solflare wallet
  - Verify wallet address displays correctly
  - Test disconnect/reconnect functionality

- [ ] **User Profile Creation**
  - First-time wallet connection creates user automatically
  - Profile page accessible at `/profile/{wallet-address}`
  - Can update username (alphanumeric, max 20 chars)
  - Can update bio, avatar URL, social handles
  - Verify changes persist after page refresh

## 2. Market Creation (Admin Only)
- [ ] **Access Control**
  - Non-admin wallets cannot access `/admin/create-market`
  - Admin wallets can access creation page
  - Verify authorization check is working

- [ ] **Binary Market Creation**
  - Create a Yes/No market
  - Set question, description, resolution date
  - Verify transaction succeeds
  - Market appears in `/markets` immediately
  - Initial percentages show 50/50 split

- [ ] **Multi-Option Market Creation**
  - Create market with 3-4 options
  - Each option has distinct label
  - Resolution date is in the future
  - Verify all options display correctly
  - Initial percentages distributed evenly

## 3. Market Asset Management (Admin Only)
- [ ] **Access Control**
  - Non-admin wallets cannot access `/admin/market-assets`
  - Admin wallets see all markets from blockchain

- [ ] **Adding Assets to New Markets**
  - Click "Add Assets" on market without images
  - Add banner image URL (test with valid image)
  - Add option icons for each option
  - Save and verify images appear
  - Refresh page - images persist

- [ ] **Editing Existing Assets**
  - Click "Edit Assets" on market with images
  - Change banner image
  - Change option icons
  - Save and verify updates
  - Check market card displays new images

- [ ] **Asset Display Validation**
  - Banner images show on market cards
  - Option icons show next to option labels
  - Broken image URLs handled gracefully
  - Fallback gradient shows when no banner

## 4. Making Predictions
- [ ] **Prediction Modal**
  - Click "Place Prediction" on active market
  - Modal shows all options with current percentages
  - Can select different options
  - Amount input validates properly (min 10 APES)
  - Shows wallet balance

- [ ] **Placing Predictions**
  - Place small prediction (10 APES)
  - Verify transaction approval in wallet
  - Confirm transaction completes
  - Market percentages update immediately
  - Volume increases correctly

- [ ] **Multiple Predictions**
  - Place predictions on different options
  - Verify user can bet on multiple options
  - Total position shows correctly
  - Each prediction tracked separately

## 5. Market Display & Stats
- [ ] **Market Cards**
  - Question displays fully
  - Category badge shows with icon
  - Status badge (Active/Resolved)
  - Volume in APES format (e.g., "1.2k APES")
  - Participant count updates
  - End date shows correctly

- [ ] **Percentages & Volumes**
  - Percentages add up to 100%
  - Higher volume options show higher percentage
  - Live updates when new predictions placed
  - Option bars animate smoothly

- [ ] **User Positions**
  - Connected wallet sees their positions
  - Shows amount per option
  - Total investment displayed
  - Positions persist on page refresh

## 6. Market Details Page
- [ ] **Navigation**
  - Click market card navigates to `/markets/{address}`
  - URL can be shared/bookmarked
  - Back button returns to markets list

- [ ] **Details Display**
  - Full question and description
  - All options with live percentages
  - Chart shows volume distribution
  - Recent predictions list
  - Comments section (if implemented)

## 7. Leaderboard Functionality
- [ ] **Initial State**
  - Shows mock data before real predictions
  - Three categories: Profit, Accuracy, Volume
  - Top performers cards display

- [ ] **After Predictions**
  - User appears after 1+ predictions
  - Stats calculate correctly:
    - Total predictions count
    - Win rate (after resolutions)
    - Total invested amount
    - Profit/loss tracking
  - Rank badges update based on performance

- [ ] **Filtering & Sorting**
  - Sort by profit/accuracy/volume works
  - Timeframe filters (week/month/all)
  - User's rank shows when connected

## 8. Market Resolution (Admin Only)
- [ ] **Resolution Process**
  - Admin can resolve expired markets
  - Select winning option
  - Confirm resolution transaction
  - Market status changes to "Resolved"
  - Winning option highlighted

- [ ] **Post-Resolution**
  - Winners can claim rewards
  - Claim button appears for winners
  - Payout calculated correctly
  - Leaderboard stats update
  - Win rate adjusts properly

## 9. Mobile Responsiveness
- [ ] **Responsive Design**
  - Markets grid adapts to screen size
  - Navigation menu works on mobile
  - Modals are mobile-friendly
  - Forms usable on touch devices
  - Images scale appropriately

## 10. Error Handling
- [ ] **Network Errors**
  - Graceful handling of RPC failures
  - Retry mechanisms work
  - User-friendly error messages
  - No app crashes

- [ ] **Transaction Errors**
  - Insufficient balance handled
  - Failed transactions show clear error
  - User can retry failed actions
  - No stuck UI states

## 11. Performance Testing
- [ ] **Load Times**
  - Markets page loads < 3 seconds
  - Images lazy load properly
  - Pagination works (if implemented)
  - Search/filter responsive

- [ ] **Concurrent Users**
  - Multiple users can place predictions
  - Real-time updates work
  - No race conditions
  - Database handles concurrent writes

## 12. Security Validation
- [ ] **Access Control**
  - Admin functions restricted properly
  - Direct URL access blocked for non-admins
  - API endpoints check authorization
  - No sensitive data exposed

- [ ] **Input Validation**
  - XSS prevention on all inputs
  - SQL injection prevention
  - File upload validation (if applicable)
  - Amount validation prevents exploits

## Post-QA Checklist
- [ ] **Documentation**
  - Update README with any changes
  - Document known issues
  - Create user guide if needed

- [ ] **Deployment Prep**
  - Environment variables documented
  - Deployment scripts tested
  - Backup procedures in place
  - Monitoring setup configured

## Engage-to-Earn Testing (After Implementation)
- [ ] **Content Engagement**
  - Define engagement actions
  - Track user interactions
  - Point accumulation system
  - APES reward distribution
  - Leaderboard integration

---

## Testing Notes

**Date Started:** _______________
**Tester:** _______________
**Environment:** Solana Devnet
**Contract Address:** _______________

### Issues Found:
1. 
2. 
3. 

### Recommendations:
1. 
2. 
3. 

---

**QA Sign-off:** _______________
**Date Completed:** _______________ 