import { Connection, PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import idl from '../idl/market_system.json';
import { config, PROGRAM_ID as programId, TOKEN_MINT as tokenMint } from '../config/solana';
import { getCachedTokenDecimals, uiToUnits, unitsToUi } from '../utils/tokenUtils';
import connectionService from './connectionService';
import cacheService from './cacheService';

// Import the treasury and fee addresses from config
const platformFeeAddress = config.platformFeeAddress;
const treasuryAddress = config.treasuryAddress;

// Get token decimals from config (6 for devnet, 9 for mainnet)
const tokenDecimals = config.tokenDecimals;

// Add debugging
console.log('MarketService: Loading with config', {
  programId: programId?.toString(),
  tokenMint: tokenMint?.toString(),
  tokenDecimals,
  platformFeeAddress,
  treasuryAddress
});

// Market type enum
const MarketType = {
  Binary: { binary: {} },
  MultiOption: { multiOption: {} }
};

// MarketStatus enum mapping
const MarketStatus = {
  Active: { active: {} },
  Resolved: { resolved: {} },
  Cancelled: { cancelled: {} }
};

class MarketService {
  constructor() {
    this.connection = null; // Will be set from connectionService
    this.program = null;
    this.provider = null;
    this.wallet = null;
  }

  // Custom deserializer for the actual on-chain Market structure
  deserializeMarket(publicKey, accountData) {
    const data = accountData.data;
    let offset = 8; // Skip discriminator

    // Helper to read bytes
    const readBytes = (length) => {
      const bytes = data.slice(offset, offset + length);
      offset += length;
      return bytes;
    };

    // Helper to read string from fixed byte array
    const readFixedString = (length) => {
      const bytes = readBytes(length);
      return Buffer.from(bytes).toString('utf8').replace(/\0/g, '').trim();
    };

    // Helper to read u64
    const readU64 = () => {
      const bytes = readBytes(8);
      return new BN(bytes, 'le');
    };

    // Helper to read u16
    const readU16 = () => {
      const bytes = readBytes(2);
      return bytes[0] | (bytes[1] << 8);
    };

    // Helper to read u8
    const readU8 = () => {
      const bytes = readBytes(1);
      return bytes[0];
    };

    // Helper to read pubkey
    const readPubkey = () => {
      const bytes = readBytes(32);
      return new PublicKey(bytes);
    };

    // Read the Market struct based on the actual on-chain layout
    const market = {
      authority: readPubkey(),
      creator: readPubkey(),
      market_type: readU8(), // Simple enum as u8
      question: readFixedString(200),
      question_len: readU16(),
      option_1: readFixedString(50),
      option_2: readFixedString(50),
      option_3: readFixedString(50),
      option_4: readFixedString(50),
      option_count: readU8(),
      resolution_date: readU64(),
      creator_fee_rate: readU64(),
      min_bet_amount: readU64(),
      token_mint: readPubkey(),
      status: readU8(), // Simple enum as u8
      winning_option: (() => {
        // Option<u8> is serialized as 2 bytes:
        // First byte: 0 = None, 1 = Some
        // Second byte: the value if Some
        const discriminator = readU8();
        if (discriminator === 0) {
          return null; // None
        } else {
          return readU8(); // Read the actual value
        }
      })(),
      option_1_pool: readU64(),
      option_2_pool: readU64(),
      option_3_pool: readU64(),
      option_4_pool: readU64(),
      total_pool: readU64(),
      market_id: readFixedString(32),
      category: readFixedString(20),
    };

    // Build options array based on option_count
    const options = [];
    if (market.option_1) options.push(market.option_1);
    if (market.option_2 && market.option_count >= 2) options.push(market.option_2);
    if (market.option_3 && market.option_count >= 3) options.push(market.option_3);
    if (market.option_4 && market.option_count >= 4) options.push(market.option_4);

    // Build option pools array
    const optionPools = [
      market.option_1_pool,
      market.option_2_pool,
      market.option_3_pool,
      market.option_4_pool
    ].slice(0, market.option_count);
    
    // Debug: Log the first market's pool data
    if (publicKey.toString().includes("SpaceX") || market.question.includes("SpaceX")) {
      console.log('SpaceX Market Deserialized Data:', {
        publicKey: publicKey.toString(),
        question: market.question.substring(0, 50),
        option_1_pool: market.option_1_pool.toString(),
        option_2_pool: market.option_2_pool.toString(),
        total_pool: market.total_pool.toString(),
        optionPools: optionPools.map(p => p.toString())
      });
    }

    // Convert to format expected by transformMarket
    return {
      publicKey,
      account: {
        authority: market.authority,
        creator: market.creator,
        market_type: market.market_type === 0 ? { binary: {} } : { multiOption: {} },
        question: market.question,
        options: options,
        option_count: market.option_count,
        resolutionDate: market.resolution_date,
        creatorFeeRate: market.creator_fee_rate,
        minBetAmount: market.min_bet_amount,
        tokenMint: market.token_mint,
        status: market.status === 0 ? { active: {} } : market.status === 1 ? { resolved: {} } : { cancelled: {} },
        winningOption: market.winning_option,
        optionPools: optionPools,
        totalPool: market.total_pool,
        marketId: market.market_id,
        category: market.category,
      }
    };
  }

  async confirmTransaction(signature, maxRetries = 3) {
    console.log(`Confirming transaction: ${signature}`);
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        // Use a shorter timeout per attempt
        const confirmation = await this.connection.confirmTransaction(
          signature, 
          'confirmed'
        );
        
        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }
        
        console.log('Transaction confirmed successfully');
        return confirmation;
      } catch (error) {
        console.log(`Confirmation attempt ${i + 1} failed:`, error.message);
        
        // Check if transaction exists and succeeded despite timeout
        if (error.message.includes('was not confirmed')) {
          try {
            const status = await this.connection.getSignatureStatus(signature);
            console.log('Transaction status:', status);
            
            if (status.value?.confirmationStatus === 'confirmed' || 
                status.value?.confirmationStatus === 'finalized') {
              console.log('Transaction actually succeeded despite timeout');
              return { value: { err: null } };
            }
          } catch (statusError) {
            console.error('Error checking transaction status:', statusError);
          }
        }
        
        // If not the last attempt, wait before retrying
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          // On last attempt, throw a more informative error
          throw new Error(
            `Transaction confirmation timeout. The transaction may have succeeded. ` +
            `Check signature ${signature} on Solana Explorer to verify.`
          );
        }
      }
    }
  }

  async initialize(wallet) {
    console.log('MarketService: Initializing with wallet', wallet?.publicKey?.toString());
    
    if (!wallet || !wallet.publicKey) {
      throw new Error('Wallet is required to initialize MarketService');
    }
    
    // Get connection from connectionService
    this.connection = connectionService.getConnection();
    
    // Store the wallet reference
    this.wallet = wallet;
    
    this.provider = new AnchorProvider(
      this.connection,
      wallet,
      { 
        commitment: 'confirmed',
        preflightCommitment: 'processed',
        skipPreflight: false
      }
    );
    
    console.log('MarketService: Provider created', this.provider);
    
    // Use the IDL directly since we have it
    try {
      // Add more debugging
      console.log('MarketService: About to create Program with:', {
        idl: idl ? 'IDL exists' : 'IDL is null/undefined',
        programId: programId,
        provider: this.provider ? 'Provider exists' : 'Provider is null'
      });
      
      if (!programId) {
        throw new Error('Program ID is not defined');
      }
      
      if (!idl) {
        throw new Error('IDL is not loaded');
      }
      
      // Use the IDL with the address field for proper initialization
      const idlWithAddress = {
        ...idl,
        address: programId
      };
      
      // Create program using the IDL's address field
      this.program = new Program(idlWithAddress, this.provider);
      console.log('MarketService: Program initialized successfully');
    } catch (error) {
      console.error('MarketService: Failed to initialize program:', error);
      console.error('MarketService: Error details:', {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack
      });
      throw error;
    }
  }

  async fetchAllMarkets() {
    const cacheKey = 'all_markets';
    
    try {
      // Use cache with 30 second expiration
      return await cacheService.getOrFetch(cacheKey, async () => {
        // Use connectionService for RPC call with fallback
        const accounts = await connectionService.executeWithFallback(async (connection) => {
          return await connection.getProgramAccounts(new PublicKey(programId), {
            filters: [
              {
                dataSize: 691 // Known size of Market accounts
              }
            ]
          });
        });
        
        console.log(`Fetched ${accounts.length} market accounts from blockchain`);
        
        // Deserialize and transform each market
        const markets = accounts.map(({ pubkey, account }) => {
          const deserialized = this.deserializeMarket(pubkey, account);
          const transformed = this.transformMarket(deserialized.publicKey, deserialized.account);
          return transformed;
        });
        
        // Log first market's data
        if (markets.length > 0) {
          console.log('First market transformed data:', {
            publicKey: markets[0].publicKey,
            question: markets[0].question.substring(0, 50),
            optionPools: markets[0].optionPools,
            optionPercentages: markets[0].optionPercentages,
            totalVolume: markets[0].totalVolume,
            actualTotalPool: markets[0].actualTotalPool
          });
        }
        
        return markets;
      }, 30000); // 30 second cache
    } catch (error) {
      console.error('MarketService: Error fetching markets:', error);
      return [];
    }
  }

  // Add method to sync blockchain data with backend
  async syncMarketWithBlockchain(marketPubkey) {
    try {
      console.log('🔄 Syncing market with blockchain:', marketPubkey);
      
      if (!this.program) {
        console.warn('Program not initialized, cannot sync blockchain data');
        return null;
      }

      // Fetch current blockchain state
      const market = new PublicKey(marketPubkey);
      const marketAccount = await this.program.account.market.fetch(market);
      
      // Get token decimals
      const decimals = await getCachedTokenDecimals(this.connection);
          
      // Calculate current volumes from blockchain
      const optionPools = [];
      const poolProperties = ['option1Pool', 'option2Pool', 'option3Pool', 'option4Pool'];
      const optionCount = marketAccount.optionCount || 2;
      
      for (let i = 0; i < optionCount; i++) {
        const poolProperty = poolProperties[i];
        const poolValue = marketAccount[poolProperty] || new BN(0);
        const poolVolume = unitsToUi(poolValue, decimals);
        optionPools.push(poolVolume);
      }
      
      const totalVolume = optionPools.reduce((sum, vol) => sum + vol, 0);
      
      // Count unique participants by fetching all predictions for this market
      let participantCount = 0;
      try {
        const predictions = await this.program.account.prediction.all([
          {
            memcmp: {
              offset: 8 + 32, // Skip discriminator + market pubkey
              bytes: marketPubkey,
            },
          },
        ]);
        
        // Count unique user addresses
        const uniqueUsers = new Set();
        predictions.forEach(({ account }) => {
          uniqueUsers.add(account.user.toString());
        });
        participantCount = uniqueUsers.size;
      } catch (error) {
        console.error('Error counting participants:', error);
        participantCount = 0;
      }
      
      // Send sync data to backend
      try {
        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
        const response = await fetch(`${backendUrl}/api/markets/sync-volumes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            marketAddress: marketPubkey,
            optionPools: optionPools,
            totalVolume: totalVolume,
            participantCount: participantCount
          })
        });
        
        if (response.ok) {
          console.log('✅ Successfully synced market with backend');
        } else {
          console.error('❌ Failed to sync with backend:', response.status);
                }
      } catch (syncError) {
        console.error('❌ Error syncing with backend:', syncError);
              }
              
              return {
        optionPools,
        totalVolume,
        participantCount,
        marketAccount
      };
    } catch (error) {
      console.error('Error syncing market with blockchain:', error);
      return null;
    }
  }

  // Modified fetchMarketsWithStats to include blockchain sync
  async fetchMarketsWithStats() {
    try {
      console.log('📊 Starting fetchMarketsWithStats...');
      
      // First, try to fetch from backend API (this is working)
      let backendMarkets = [];
      try {
        console.log('🔗 Fetching from backend API...');
        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
        const response = await fetch(`${backendUrl}/api/markets`, {
          timeout: 10000 // 10 second timeout
        });
        
        if (response.ok) {
          backendMarkets = await response.json();
          console.log(`✅ Successfully fetched ${backendMarkets.length} markets from backend API`);
          
          // Force sync for markets with user positions if possible
          if (this.program && backendMarkets.length > 0) {
            console.log('🔄 Force syncing markets to fix data consistency...');
            
            // Find markets that likely have user positions (non-zero volume or user has wallet connected)
            const marketsToSync = backendMarkets.filter(market => 
              market.totalVolume > 0 || 
              market.optionPools?.some(pool => pool > 0)
            ).slice(0, 5); // Sync first 5 active markets
            
            if (marketsToSync.length > 0) {
              console.log(`🎯 Force syncing ${marketsToSync.length} markets with potential user activity`);
              
              // Sync markets in parallel for speed
              const syncPromises = marketsToSync.map(market => 
                this.syncMarketWithBlockchain(market.publicKey).catch(err => {
                  console.warn(`Failed to sync ${market.publicKey}:`, err.message);
                  return null;
                })
              );
              
              await Promise.all(syncPromises);
              
              // Refetch updated data from backend
              try {
                const updatedResponse = await fetch(`${backendUrl}/api/markets`, {
                  timeout: 5000
                });
                if (updatedResponse.ok) {
                  backendMarkets = await updatedResponse.json();
                  console.log('✅ Refetched updated market data after force sync');
                }
              } catch (refetchError) {
                console.warn('Could not refetch updated data, using original');
              }
            }
          }
          
          // Log first market for debugging
          if (backendMarkets.length > 0) {
            const firstMarket = backendMarkets[0];
            console.log('📋 First market from backend (after sync):', {
              question: firstMarket.question?.substring(0, 50),
              totalVolume: firstMarket.totalVolume,
              optionPools: firstMarket.optionPools,
              optionPercentages: firstMarket.optionPercentages,
              participantCount: firstMarket.participantCount,
              assets: Object.keys(firstMarket.assets || {})
            });
          }
          
          // If we have backend data, return it immediately (it's already properly formatted)
          if (backendMarkets.length > 0) {
            console.log('🚀 Returning backend markets with synced data');
            return backendMarkets;
        }
        } else {
          console.error('❌ Backend API response not ok:', response.status, response.statusText);
        }
      } catch (apiError) {
        console.error('❌ Error fetching from backend API:', apiError);
      }
      
      // If backend failed, try blockchain data as fallback
      if (backendMarkets.length === 0) {
        console.log('🔗 Backend failed, trying blockchain data as fallback...');
        try {
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Blockchain fetch timeout after 8 seconds')), 8000)
          );
          
          const blockchainPromise = this.fetchAllMarkets();
          const blockchainMarkets = await Promise.race([blockchainPromise, timeoutPromise]);
          
          if (blockchainMarkets && blockchainMarkets.length > 0) {
            console.log(`✅ Successfully fetched ${blockchainMarkets.length} markets from blockchain`);
      return blockchainMarkets;
          } else {
            console.log('📭 No markets found in blockchain data');
          }
        } catch (blockchainError) {
          console.error('❌ Blockchain fetch failed:', blockchainError.message);
        }
      }
      
      // If both failed, return empty array
      console.warn('⚠️ Both backend API and blockchain fetch failed, returning empty array');
      return [];
    } catch (error) {
      console.error('💥 Error in fetchMarketsWithStats:', error);
      return [];
    }
  }

  transformMarket(publicKey, account) {
    // Handle options - we now have an options array
    let options = account.options || [];
    
    // Handle question - should be a string now
    let question = account.question || '';

    // Handle category
    let category = account.category || 'General';
    
    // Calculate probabilities based on pool sizes
    const decimals = tokenDecimals || 9;
    const totalPool = unitsToUi(account.totalPool || account.total_pool || new BN(0), decimals);
    const optionPools = account.optionPools || [];
    
    const optionProbabilities = optionPools.map((pool, index) => {
      const poolSize = unitsToUi(pool instanceof BN ? pool : new BN(pool), decimals);
      const percentage = totalPool > 0 ? (poolSize / totalPool) * 100 : (100 / options.length);
      return percentage;
    });

    // Calculate user-contributed volume (total pool minus creator stake)
    // Default creator stake is 100 APES
    const creatorStake = 100;
    const userVolume = Math.max(0, totalPool - creatorStake);

    return {
      publicKey: publicKey.toString(),
      question: question,
      options: options,
      optionCount: account.option_count || options.length,
      optionProbabilities,
      optionPercentages: optionProbabilities, // Add this to ensure MarketCard gets the data
      totalVolume: userVolume, // Show only user-contributed volume
      actualTotalPool: totalPool, // Keep the actual total for calculations
      participantCount: 0, // This would need to be tracked separately as it's not stored on-chain
      status: this.getMarketStatusString(account.status),
      category: category,
      resolutionDate: account.resolutionDate ? new Date(account.resolutionDate.toNumber() * 1000) : null,
      winningOption: account.winningOption !== undefined ? account.winningOption : account.winning_option,
      creator: account.creator ? account.creator.toString() : '',
      creatorFeeRate: account.creatorFeeRate ? account.creatorFeeRate.toNumber() / 100 : 0,
      minBetAmount: account.minBetAmount ? unitsToUi(account.minBetAmount, decimals) : 0,
      marketType: this.getMarketTypeString(account.market_type),
      optionPools: optionPools.map(pool => unitsToUi(pool instanceof BN ? pool : new BN(pool), decimals))
    };
  }

  getMarketStatusString(status) {
    if (status.active) return 'Active';
    if (status.resolved) return 'Resolved';
    if (status.cancelled) return 'Cancelled';
    return 'Unknown';
  }

  getMarketTypeString(type) {
    if (type.binary) return 'Binary';
    if (type.multiOption) return 'MultiOption';
    return 'Unknown';
  }

  async createMarket(marketData) {
    // Check if program and provider are initialized
    if (!this.program || !this.provider) {
      throw new Error('Market service not initialized. Please try reconnecting your wallet.');
    }
    
    // Get wallet public key from the stored wallet reference
    const walletPubkey = this.wallet?.publicKey;
    if (!walletPubkey) {
      throw new Error('Wallet public key not found. Please ensure your wallet is connected.');
    }

    const {
      question,
      options,
      actualOptionCount,
      category,
      resolutionDate,
      creatorFeeRate = 200, // 2% default
      minBetAmount = 10,
      creatorStakeAmount = 100
    } = marketData;

    try {
      // Get token decimals
      const decimals = await getCachedTokenDecimals(this.connection);
      
      // Generate new market keypair
      const market = Keypair.generate();
      
      // Find PDAs
      const [platformState] = PublicKey.findProgramAddressSync(
        [Buffer.from("platform_state")],
        this.program.programId
      );
      
      const [accessControl] = PublicKey.findProgramAddressSync(
        [Buffer.from("access_control")],
        this.program.programId
      );
      
      const [marketEscrow] = PublicKey.findProgramAddressSync(
        [Buffer.from("market_escrow"), market.publicKey.toBuffer()],
        this.program.programId
      );

      // Determine market type
      const marketType = options.length === 2 ? MarketType.Binary : MarketType.MultiOption;
      
      // Convert strings to fixed-size byte arrays
      const stringToBytes = (str, maxLength) => {
        const bytes = new Uint8Array(maxLength);
        const encoded = new TextEncoder().encode(str.substring(0, maxLength));
        bytes.set(encoded);
        return Array.from(bytes);
      };
      
      // Prepare question and options as byte arrays
      const questionBytes = stringToBytes(question, 200);
      const questionLen = Math.min(question.length, 200);
      
      // Extract labels from options (handle both string and object formats)
      const getOptionLabel = (option) => {
        if (typeof option === 'string') return option;
        if (option && typeof option === 'object' && option.label) return option.label;
        return '';
      };
      
      // Prepare options - use empty strings for missing options
      const option1Bytes = stringToBytes(getOptionLabel(options[0]) || '', 50);
      const option2Bytes = stringToBytes(getOptionLabel(options[1]) || '', 50);
      const option3Bytes = stringToBytes(getOptionLabel(options[2]) || '', 50);
      const option4Bytes = stringToBytes(getOptionLabel(options[3]) || '', 50);
      
      // Use actual option count, not padded count
      const optionCount = actualOptionCount || Math.min(options.length, 4);
      
      // Market ID and category
      const marketIdStr = `market_${Date.now()}`;
      const marketIdBytes = stringToBytes(marketIdStr, 32);
      const marketIdLen = Math.min(marketIdStr.length, 32);
      
      const categoryBytes = stringToBytes(category, 20);
      const categoryLen = Math.min(category.length, 20);
      
      // Log the parameters being sent to the contract
      console.log('Creating market with parameters:', {
        marketType: marketType,
        question: question,
        optionCount: optionCount,
        options: options.map((opt, i) => ({
          index: i,
          label: getOptionLabel(opt),
          bytes: i < 4 ? `option${i+1}Bytes` : 'not sent'
        })),
        option1: getOptionLabel(options[0]) || '(empty)',
        option2: getOptionLabel(options[1]) || '(empty)',
        option3: getOptionLabel(options[2]) || '(empty)',
        option4: getOptionLabel(options[3]) || '(empty)',
        actualOptionCount: actualOptionCount,
        resolutionDate: resolutionDate,
        creatorFeeRate: creatorFeeRate,
        minBetAmount: minBetAmount,
        creatorStakeAmount: creatorStakeAmount
      });
      
      // Call create_market instruction
      const tx = await this.program.methods
        .createMarket(
          marketType,
          questionBytes,
          questionLen,
          option1Bytes,
          option2Bytes,
          option3Bytes,
          option4Bytes,
          optionCount,
          new BN(Math.floor(resolutionDate.getTime() / 1000)),
          new BN(creatorFeeRate),
          uiToUnits(minBetAmount, decimals),
          marketIdBytes,
          marketIdLen,
          uiToUnits(creatorStakeAmount, decimals),
          categoryBytes,
          categoryLen
        )
        .accounts({
          market: market.publicKey,
          platformState: platformState,
          creator: walletPubkey,
          creatorTokenAccount: await this.getTokenAccount(walletPubkey),
          marketEscrow: marketEscrow,
          burnTokenAccount: await this.getTokenAccount(new PublicKey(platformFeeAddress)),
          tokenMint: new PublicKey(tokenMint),
          accessControl: accessControl,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([market])
        .rpc({ skipPreflight: false });

      console.log('Transaction sent:', tx);
      
      // Use our custom confirmation method
      try {
        await this.confirmTransaction(tx);
        console.log('Market created successfully:', tx);
        
        // Invalidate markets cache after successful creation
        cacheService.clear('all_markets');
        
        return { 
          success: true, 
          transaction: tx,
          marketPubkey: market.publicKey.toString()
        };
      } catch (confirmError) {
        // Even if confirmation times out, return success with a warning
        console.warn('Transaction confirmation timeout, but market creation may have succeeded:', tx);
        
        // Invalidate cache even on timeout since transaction might have succeeded
        cacheService.clear('all_markets');
        
        return { 
          success: true, 
          transaction: tx,
          marketPubkey: market.publicKey.toString(),
          warning: 'Transaction sent but confirmation timed out. Please check your wallet for the result.'
        };
      }
    } catch (error) {
      console.error('Error creating market:', error);
      throw error;
    }
  }

  async placeBet(marketPubkey, optionIndex, amount) {
    // Check if program and provider are initialized
    if (!this.program || !this.provider) {
      throw new Error('Market service not initialized. Please try reconnecting your wallet.');
    }
    
    // Get wallet public key from the stored wallet reference
    const walletPubkey = this.wallet?.publicKey;
    console.log('MarketService: Wallet public key:', walletPubkey?.toString());
    
    if (!walletPubkey) {
      throw new Error('Wallet public key not found. Please ensure your wallet is connected.');
    }

    try {
      // Get token decimals
      const decimals = await getCachedTokenDecimals(this.connection);
      console.log(`MarketService: Placing bet of ${amount} ${config.tokenSymbol} (decimals: ${decimals})`);
      
      const market = new PublicKey(marketPubkey);
      
      // Find PDAs
      const [platformState] = PublicKey.findProgramAddressSync(
        [Buffer.from("platform_state")],
        this.program.programId
      );
      
      const [marketEscrow] = PublicKey.findProgramAddressSync(
        [Buffer.from("market_escrow"), market.toBuffer()],
        this.program.programId
      );
      
      const [prediction] = PublicKey.findProgramAddressSync(
        [Buffer.from("prediction"), market.toBuffer(), walletPubkey.toBuffer(), Buffer.from([optionIndex])],
        this.program.programId
      );

      // Convert UI amount to token units
      const amountUnits = uiToUnits(amount, decimals);
      console.log(`MarketService: Converted ${amount} to ${amountUnits.toString()} units`);

      // Call place_prediction instruction
      const tx = await this.program.methods
        .placePrediction(
          optionIndex,
          amountUnits
        )
        .accounts({
          market: market,
          platformState: platformState,
          user: walletPubkey,
          userTokenAccount: await this.getTokenAccount(walletPubkey),
          marketEscrow: marketEscrow,
          burnTokenAccount: await this.getTokenAccount(new PublicKey(platformFeeAddress)),
          treasuryTokenAccount: await this.getTokenAccount(new PublicKey(treasuryAddress)),
          prediction: prediction,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc({ skipPreflight: false });

      console.log('Transaction sent:', tx);
      
      // Use our custom confirmation method
      try {
        await this.confirmTransaction(tx);
        console.log('Bet placed successfully:', tx);
        
        // Track engagement points for placing a prediction
        try {
          const response = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/predictions/place`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Wallet-Address': walletPubkey.toString()
              },
              body: JSON.stringify({
                market_address: marketPubkey,
                option_index: optionIndex,
                amount: amount,
                transaction_signature: tx,
                wallet_address: walletPubkey.toString()
              })
            }
          );
          
          if (response.ok) {
            console.log('Prediction recorded and points awarded');
            
            // Update participant count for this market
            try {
              await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/markets/update-participant`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  marketAddress: marketPubkey,
                  walletAddress: walletPubkey.toString()
                })
              });
            } catch (participantError) {
              console.warn('Failed to update participant count:', participantError);
            }
          }
        } catch (engagementError) {
          console.error('Failed to track engagement points:', engagementError);
          // Don't throw - bet was successful even if engagement tracking failed
        }
        
        // Invalidate markets cache after successful bet
        cacheService.clear('all_markets');
        
        return { success: true, transaction: tx };
      } catch (confirmError) {
        // Even if confirmation times out, return success with a warning
        console.warn('Transaction confirmation timeout, but transaction may have succeeded:', tx);
        
        // Try to track engagement even on timeout
        try {
          const response = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/predictions/place`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Wallet-Address': walletPubkey.toString()
              },
              body: JSON.stringify({
                market_address: marketPubkey,
                option_index: optionIndex,
                amount: amount,
                transaction_signature: tx
              })
            }
          );
        } catch (engagementError) {
          console.error('Failed to track engagement points:', engagementError);
        }
        
        // Invalidate cache even on timeout since transaction might have succeeded
        cacheService.clear('all_markets');
        
        return { 
          success: true, 
          transaction: tx,
          warning: 'Transaction sent but confirmation timed out. Please check your wallet for the result.'
        };
      }
    } catch (error) {
      console.error('Error placing bet:', error);
      // Provide more specific error message
      if (error.message?.includes('insufficient funds')) {
        throw new Error('Insufficient APES tokens. Please ensure you have enough tokens and SOL for fees.');
      }
      throw error;
    }
  }

  async getTokenAccount(owner) {
    // Get associated token address
    const [tokenAccount] = PublicKey.findProgramAddressSync(
      [
        owner.toBuffer(),
        new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA').toBuffer(),
        new PublicKey(tokenMint).toBuffer(),
      ],
      new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
    );
    return tokenAccount;
  }

  async getUserBets(userPubkey) {
    if (!this.program) return [];

    try {
      // Get token decimals
      const decimals = await getCachedTokenDecimals(this.connection);
      
      // Fetch all predictions for the user
      const predictions = await this.program.account.prediction.all([
        {
          memcmp: {
            offset: 8, // After discriminator
            bytes: userPubkey.toBase58(),
          },
        },
      ]);

      // We need to derive the market pubkey from the PDA
      return predictions.map(({ publicKey, account }) => {
        // Extract market pubkey from the PDA seeds
        // This is a workaround since we don't store market in the account anymore
        return {
          publicKey: publicKey.toString(),
          optionIndex: account.optionIndex,
          amount: unitsToUi(account.amount, decimals),
          timestamp: new Date(account.timestamp.toNumber() * 1000),
          claimed: account.claimed,
        };
      });
    } catch (error) {
      console.error('Error fetching user bets:', error);
      return [];
    }
  }

  async claimReward(marketPubkey, optionIndex) {
    // Check if program and provider are initialized
    if (!this.program || !this.provider) {
      throw new Error('Market service not initialized. Please try reconnecting your wallet.');
    }
    
    // Get wallet public key from the stored wallet reference
    const walletPubkey = this.wallet?.publicKey;
    if (!walletPubkey) {
      throw new Error('Wallet public key not found. Please ensure your wallet is connected.');
    }

    try {
      const market = new PublicKey(marketPubkey);
      
      // Derive prediction PDA with option index
      const [prediction] = PublicKey.findProgramAddressSync(
        [Buffer.from("prediction"), market.toBuffer(), walletPubkey.toBuffer(), Buffer.from([optionIndex])],
        this.program.programId
      );
      
      // Get market data
      const marketAccount = await this.program.account.market.fetch(market);
      
      // Find PDAs
      const [platformState] = PublicKey.findProgramAddressSync(
        [Buffer.from("platform_state")],
        this.program.programId
      );
      
      const [marketEscrow] = PublicKey.findProgramAddressSync(
        [Buffer.from("market_escrow"), market.toBuffer()],
        this.program.programId
      );

      // Call claim_reward instruction with option_index
      const tx = await this.program.methods
        .claimReward(optionIndex)
        .accounts({
          market: market,
          platformState: platformState,
          prediction: prediction,
          user: walletPubkey,
          userTokenAccount: await this.getTokenAccount(walletPubkey),
          marketEscrow: marketEscrow,
          creatorTokenAccount: await this.getTokenAccount(marketAccount.creator),
          burnTokenAccount: await this.getTokenAccount(new PublicKey(platformFeeAddress)),
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc({ skipPreflight: false });

      console.log('Transaction sent:', tx);
      
      // Use our custom confirmation method
      try {
        await this.confirmTransaction(tx);
        console.log('Reward claimed successfully:', tx);
        return { success: true, transaction: tx };
      } catch (confirmError) {
        // Even if confirmation times out, return success with a warning
        console.warn('Transaction confirmation timeout, but claim may have succeeded:', tx);
        return { 
          success: true, 
          transaction: tx,
          warning: 'Transaction sent but confirmation timed out. Please check your wallet for the result.'
        };
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
      throw error;
    }
  }

  async getUserPositionForMarket(userPubkey, marketPubkey) {
    if (!this.program || !userPubkey) return null;

    // Validate marketPubkey before using it
    if (!marketPubkey || typeof marketPubkey !== 'string' || marketPubkey.trim() === '') {
      console.warn('Invalid marketPubkey provided to getUserPositionForMarket:', marketPubkey);
      return null;
    }

    try {
      // Validate that marketPubkey is a valid base58 string before creating PublicKey
      let marketPublicKey;
      try {
        marketPublicKey = new PublicKey(marketPubkey);
      } catch (pubkeyError) {
        console.error('Invalid public key format for market:', marketPubkey, pubkeyError);
        return null;
      }
      
      const [predictionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("prediction"), marketPublicKey.toBuffer(), userPubkey.toBuffer()],
        this.program.programId
      );
      
      // Try to fetch the prediction account
      try {
        const prediction = await this.program.account.prediction.fetch(predictionPda);
        const decimals = await getCachedTokenDecimals(this.connection);
        
        return {
          publicKey: predictionPda.toString(),
          optionIndex: prediction.optionIndex,
          amount: unitsToUi(prediction.amount, decimals),
          timestamp: new Date(prediction.timestamp.toNumber() * 1000),
          claimed: prediction.claimed,
        };
      } catch (e) {
        // No prediction exists for this user/market
        return null;
      }
    } catch (error) {
      console.error('Error fetching user position:', error);
      return null;
    }
  }
  
  async getUserPositionsForMarket(userPubkey, marketPubkey) {
    if (!this.program || !userPubkey) return [];

    // Validate marketPubkey before using it
    if (!marketPubkey || typeof marketPubkey !== 'string' || marketPubkey.trim() === '') {
      console.warn('Invalid marketPubkey provided to getUserPositionsForMarket:', marketPubkey);
      return [];
    }

    // Additional validation: Check if it looks like a valid Solana public key
    if (marketPubkey.length < 32 || marketPubkey.length > 44) {
      console.warn('Invalid public key length for market:', marketPubkey, 'Length:', marketPubkey.length);
      return [];
    }

    // Check for obviously invalid test keys
    if (marketPubkey.includes('TEST') || marketPubkey.includes('ABCDEF') || !/^[1-9A-HJ-NP-Za-km-z]+$/.test(marketPubkey)) {
      console.warn('Invalid public key format detected:', marketPubkey);
      return [];
    }

    try {
      // Validate that marketPubkey is a valid base58 string
      let market;
      try {
        market = new PublicKey(marketPubkey);
      } catch (pubkeyError) {
        console.error('Invalid public key format for market:', marketPubkey, pubkeyError);
        return [];
      }
      
      const positions = [];
      const decimals = await getCachedTokenDecimals(this.connection);
      
      // Try to fetch predictions for all possible options (0-3)
      for (let optionIndex = 0; optionIndex < 4; optionIndex++) {
        const [predictionPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("prediction"), market.toBuffer(), userPubkey.toBuffer(), Buffer.from([optionIndex])],
          this.program.programId
        );
        
        try {
          const prediction = await this.program.account.prediction.fetch(predictionPda);
          positions.push({
            publicKey: predictionPda.toString(),
            optionIndex: prediction.optionIndex,
            amount: unitsToUi(prediction.amount, decimals),
            timestamp: new Date(prediction.timestamp.toNumber() * 1000),
            claimed: prediction.claimed,
          });
        } catch (e) {
          // No prediction exists for this option - continue
        }
      }
      
      return positions;
    } catch (error) {
      console.error('Error fetching user positions:', error);
      return [];
    }
  }

  async resolveMarket(marketPubkey, winningOption) {
    // Check if program and provider are initialized
    if (!this.program || !this.provider) {
      throw new Error('Market service not initialized. Please try reconnecting your wallet.');
    }
    
    // Get wallet public key from the stored wallet reference
    const walletPubkey = this.wallet?.publicKey;
    if (!walletPubkey) {
      throw new Error('Wallet public key not found. Please ensure your wallet is connected.');
    }

    try {
      const market = new PublicKey(marketPubkey);
      
      // Find PDAs
      const [platformState] = PublicKey.findProgramAddressSync(
        [Buffer.from("platform_state")],
        this.program.programId
      );

      // Call resolve_market instruction
      const tx = await this.program.methods
        .resolveMarket(winningOption)
        .accounts({
          market: market,
          platformState: platformState,
          authority: walletPubkey,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ skipPreflight: false });

      console.log('Transaction sent:', tx);
      
      // Use our custom confirmation method
      try {
        await this.confirmTransaction(tx);
        console.log('Market resolved successfully:', tx);
        
        // Invalidate markets cache after successful resolution
        cacheService.clear('all_markets');
        
        return { success: true, transaction: tx };
      } catch (confirmError) {
        // Even if confirmation times out, return success with a warning
        console.warn('Transaction confirmation timeout, but market resolution may have succeeded:', tx);
        
        // Invalidate cache even on timeout since transaction might have succeeded
        cacheService.clear('all_markets');
        
        return { 
          success: true, 
          transaction: tx,
          warning: 'Transaction sent but confirmation timed out. Please check your wallet for the result.'
        };
      }
    } catch (error) {
      console.error('Error resolving market:', error);
      // Provide more specific error message
      if (error.message?.includes('Unauthorized')) {
        throw new Error('Only the market creator or platform authority can resolve markets.');
      }
      throw error;
    }
  }
}

export default new MarketService(); 