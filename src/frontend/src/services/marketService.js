import { Connection, PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
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
    
    // Load IDL dynamically
    try {
      // Load IDL from public directory
      const idlResponse = await fetch('/market_system.json');
      if (!idlResponse.ok) {
        throw new Error(`Failed to load IDL: ${idlResponse.status}`);
      }
      const idl = await idlResponse.json();
      
      // Add more debugging
      console.log('MarketService: About to create Program with:', {
        idl: idl ? 'IDL loaded successfully' : 'IDL is null/undefined',
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
    
    // Debug logging for percentage calculation issues
    if (totalPool === 0 && optionPools.length > 0) {
      console.warn('Market has zero total pool but option pools exist:', {
        publicKey: publicKey.toString(),
        question: question.substring(0, 50),
        totalPool,
        optionPools: optionPools.map(pool => unitsToUi(pool instanceof BN ? pool : new BN(pool), decimals)),
        rawTotalPool: account.totalPool?.toString(),
        rawOptionPools: optionPools.map(p => p?.toString())
      });
    }

    // Calculate option percentages with better fallback logic
    const optionProbabilities = optionPools.map((pool, index) => {
      const poolSize = unitsToUi(pool instanceof BN ? pool : new BN(pool), decimals);
      
      // If totalPool is 0 but we have pools, recalculate totalPool from option pools
      const actualTotalPool = totalPool > 0 ? totalPool : 
        optionPools.reduce((sum, p) => sum + unitsToUi(p instanceof BN ? p : new BN(p), decimals), 0);
      
      if (actualTotalPool > 0) {
        return (poolSize / actualTotalPool) * 100;
      } else {
        // Only use fallback if there's truly no pool data
        return 100 / options.length;
      }
    });

    // Calculate actual total pool for display (sum of all option pools)
    const calculatedTotalPool = optionPools.reduce((sum, pool) => {
      return sum + unitsToUi(pool instanceof BN ? pool : new BN(pool), decimals);
    }, 0);

    // Use the calculated pool if it's greater than the reported totalPool
    const displayTotalPool = Math.max(totalPool, calculatedTotalPool);

    // Calculate user-contributed volume (total pool minus creator stake)
    // Default creator stake is 100 APES
    const creatorStake = 100;
    const userVolume = Math.max(0, displayTotalPool - creatorStake);

    return {
      publicKey: publicKey.toString(),
      question: question,
      options: options,
      optionCount: account.option_count || options.length,
      optionProbabilities,
      optionPercentages: optionProbabilities, // Add this to ensure MarketCard gets the data
      totalVolume: userVolume, // Show only user-contributed volume
      actualTotalPool: displayTotalPool, // Keep the actual total for calculations
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
      
      // Build transaction using Phantom's recommended signAndSendTransaction method
      const instruction = await this.program.methods
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
        .instruction();

      // Create transaction and add instruction
      const transaction = new Transaction().add(instruction);
      
      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = walletPubkey;
      
      // Sign with market keypair first (partial sign)
      transaction.partialSign(market);
      
      // Use Phantom's recommended signAndSendTransaction method
      const { signature: tx } = await this.wallet.signAndSendTransaction(transaction);

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
      
      // Provide more specific error messages based on common issues
      if (error.message?.includes('insufficient funds')) {
        throw new Error(`Insufficient APES tokens. Admin wallet needs ${creatorStakeAmount} APES tokens and SOL for transaction fees.`);
      }
      
      if (error.message?.includes('TokenAccountNotFoundError') || error.message?.includes('AccountNotFound')) {
        throw new Error('APES token account not found. Please create an associated token account for this wallet first.');
      }
      
      if (error.message?.includes('InvalidAccountData') || error.message?.includes('AccountDataSizeChanged')) {
        throw new Error('Account data error. Please ensure the program is properly initialized.');
      }
      
      if (error.message?.includes('Unauthorized') || error.message?.includes('ConstraintHasOne')) {
        throw new Error('Unauthorized: Only admin wallets can create markets.');
      }
      
      if (error.message?.includes('Custom program error: 0x1')) {
        throw new Error('Platform not initialized. Please contact admin to initialize the platform first.');
      }
      
      // Include the original error for debugging
      const originalError = error.message || error.toString();
      throw new Error(`Market creation failed: ${originalError}. Please check wallet balance (need ${creatorStakeAmount} APES + SOL for fees).`);
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

      // Build place_prediction transaction using Phantom's recommended method
      const instruction = await this.program.methods
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
        .instruction();

      // Create transaction
      const transaction = new Transaction().add(instruction);
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = walletPubkey;
      
      // Use Phantom's recommended signAndSendTransaction method
      const { signature: tx } = await this.wallet.signAndSendTransaction(transaction);

      console.log('Transaction sent:', tx);
      
      // Use our custom confirmation method
      try {
        await this.confirmTransaction(tx);
        console.log('Bet placed successfully:', tx);
        
        // Track engagement points for placing a prediction
        try {
          console.log('🎯 Calling predictions API:', {
            url: `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/predictions/place`,
            walletAddress: walletPubkey.toString(),
            marketAddress: marketPubkey,
            optionIndex,
            amount
          });
          
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
          
          console.log('🎯 Predictions API response status:', response.status);
          
          if (response.ok) {
            const result = await response.json();
            console.log('✅ Prediction recorded and points awarded:', result);
            
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
          } else {
            const errorText = await response.text();
            console.error('❌ Predictions API failed:', {
              status: response.status,
              statusText: response.statusText,
              error: errorText
            });
            
            // Show user-friendly error message
            console.warn('⚠️ Failed to track prediction in database. Your bet was placed successfully on the blockchain, but may not appear in leaderboard immediately.');
          }
        } catch (engagementError) {
          console.error('❌ Failed to track engagement points - Network/API Error:', engagementError);
          console.error('❌ Error details:', {
            message: engagementError.message,
            stack: engagementError.stack
          });
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
          console.log('🎯 Calling predictions API (timeout fallback):', {
            url: `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/predictions/place`,
            walletAddress: walletPubkey.toString(),
            marketAddress: marketPubkey,
            optionIndex,
            amount
          });
          
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
          
          console.log('🎯 Predictions API response status (timeout fallback):', response.status);
          
          if (response.ok) {
            const result = await response.json();
            console.log('✅ Prediction recorded on timeout fallback:', result);
          } else {
            const errorText = await response.text();
            console.error('❌ Predictions API failed (timeout fallback):', {
              status: response.status,
              statusText: response.statusText,
              error: errorText
            });
          }
        } catch (engagementError) {
          console.error('❌ Failed to track engagement points (timeout fallback):', engagementError);
          console.error('❌ Error details:', {
            message: engagementError.message,
            stack: engagementError.stack
          });
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

  // NEW METHOD: Claim reward using backend API (for backend-stored predictions)
  async claimRewardFromBackend(predictionId, expectedPayout) {
    try {
      console.log(`💰 Claiming reward for prediction ID: ${predictionId}`);
      
      // CRITICAL FIX: Get market address from prediction first
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      
      // First, get the prediction details to get market address
      const userPositionsResponse = await fetch(`${backendUrl}/api/predictions/user/${this.wallet?.publicKey?.toString()}`, {
        headers: {
          'x-wallet-address': this.wallet?.publicKey?.toString() || '',
        }
      });
      
      if (!userPositionsResponse.ok) {
        throw new Error('Failed to fetch user positions');
      }
      
      const userPositionsData = await userPositionsResponse.json();
      console.log('📊 User positions response:', userPositionsData);
      
      // FIXED: Handle the correct response format - it's an object with predictions array
      const userPositions = userPositionsData.predictions || userPositionsData;
      const prediction = userPositions.find(p => p.id == predictionId);
      
      if (!prediction) {
        throw new Error('Prediction not found');
      }
      
      const marketAddress = prediction.market_address;
      console.log(`🎯 Found market address for prediction: ${marketAddress}`);
      
      // STEP 1: Execute REAL onchain transaction first
      console.log('⛓️ Executing onchain claimReward transaction...');
      const onchainResult = await this.claimReward(marketAddress, prediction.option_index);
      
      if (!onchainResult.success || !onchainResult.transaction) {
        throw new Error('Onchain transaction failed: ' + (onchainResult.error || 'Unknown error'));
      }
      
      const realTransactionSignature = onchainResult.transaction;
      console.log('✅ Onchain transaction successful:', realTransactionSignature);
      
      // STEP 2: Now update backend with REAL transaction signature
      console.log('📝 Updating backend with real transaction signature...');
      const response = await fetch(`${backendUrl}/api/predictions/claim/${predictionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': this.wallet?.publicKey?.toString() || '',
        },
        body: JSON.stringify({
          transaction_signature: realTransactionSignature // Use REAL signature
        })
      });
      
      if (!response.ok) {
        // The onchain transaction succeeded but backend update failed
        // This is not critical - user got their tokens
        console.warn('⚠️ Onchain transaction succeeded but backend update failed');
        const errorData = await response.json();
        return {
          success: true,
          message: 'Tokens claimed successfully! (Backend tracking may have failed)',
          transaction: realTransactionSignature,
          warning: 'Backend database update failed but your tokens were transferred successfully.'
        };
      }
      
      const result = await response.json();
      console.log('✅ Backend updated successfully:', result);
      
      return {
        success: true,
        message: result.message || 'Rewards claimed successfully!',
        transaction: realTransactionSignature,
        prediction: result.prediction
      };
    } catch (error) {
      console.error('❌ Error claiming reward:', error);
      
      // Check if this is an onchain error vs backend error
      if (error.message.includes('Onchain transaction failed')) {
        throw new Error(`Failed to claim reward: ${error.message}`);
      } else {
        throw new Error(`Failed to claim reward: ${error.message}`);
      }
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

      // Build claim_reward transaction using Phantom's recommended method
      const instruction = await this.program.methods
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
        .instruction();

      // Create transaction
      const transaction = new Transaction().add(instruction);
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = walletPubkey;
      
      // Use Phantom's recommended signAndSendTransaction method
      const { signature: tx } = await this.wallet.signAndSendTransaction(transaction);

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
  
  // NEW METHOD: Get all user positions across all markets from backend
  async getUserPositions(userAddress) {
    try {
      console.log(`📊 Fetching all positions for user: ${userAddress}`);
      
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const response = await fetch(`${backendUrl}/api/predictions/user/${userAddress}`, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`✅ Loaded ${data.total} positions for user`);
      
      // Group positions by market address
      const positionsByMarket = {};
      data.predictions.forEach(prediction => {
        const marketAddress = prediction.market_address;
        if (!positionsByMarket[marketAddress]) {
          positionsByMarket[marketAddress] = [];
        }
        
        positionsByMarket[marketAddress].push({
          id: prediction.id,
          optionIndex: prediction.option_index,
          amount: parseFloat(prediction.amount),
          timestamp: new Date(prediction.timestamp || prediction.created_at),
          claimed: prediction.claimed || false,
          transactionSignature: prediction.transaction_signature,
          market: {
            address: prediction.market_address,
            question: prediction.market_question,
            options: prediction.market_options,
            status: prediction.market_status,
            winningOption: prediction.winning_option
          }
        });
      });
      
      return positionsByMarket;
    } catch (error) {
      console.error('❌ Error fetching user positions:', error);
      return {};
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

  async initializePlatform() {
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
      // Get token decimals
      const decimals = await getCachedTokenDecimals(this.connection);
      
      // Find PDAs
      const [platformState] = PublicKey.findProgramAddressSync(
        [Buffer.from("platform_state")],
        this.program.programId
      );

      // Check if already initialized
      try {
        const existingState = await this.program.account.platformState.fetch(platformState);
        console.log('✅ Platform already initialized:', existingState);
        return { success: true, message: 'Platform already initialized', alreadyInitialized: true };
      } catch (error) {
        console.log('Platform not initialized, proceeding with initialization...');
      }

      // Build initialize transaction using Phantom's recommended method
      const instruction = await this.program.methods
        .initialize(
          new BN(250), // 2.5% bet burn rate
          new BN(150), // 1.5% claim burn rate  
          new BN(100)  // 1% platform fee
        )
        .accounts({
          platformState: platformState,
          authority: walletPubkey,
          tokenMint: new PublicKey(tokenMint),
          treasury: new PublicKey(treasuryAddress),
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .instruction();

      // Create transaction
      const transaction = new Transaction().add(instruction);
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = walletPubkey;
      
      // Use Phantom's recommended signAndSendTransaction method
      const { signature: tx } = await this.wallet.signAndSendTransaction(transaction);

      console.log('Platform initialization transaction sent:', tx);
      
      // Use our custom confirmation method
      try {
        await this.confirmTransaction(tx);
        console.log('Platform initialized successfully:', tx);
        return { success: true, transaction: tx, message: 'Platform initialized successfully' };
      } catch (confirmError) {
        console.warn('Transaction confirmation timeout, but initialization may have succeeded:', tx);
        return { 
          success: true, 
          transaction: tx,
          warning: 'Transaction sent but confirmation timed out. Please check your wallet for the result.'
        };
      }
    } catch (error) {
      console.error('Error initializing platform:', error);
      throw new Error(`Platform initialization failed: ${error.message}`);
    }
  }

  async initializeAccessControl() {
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
      // Find access control PDA
      const [accessControl] = PublicKey.findProgramAddressSync(
        [Buffer.from("access_control")],
        this.program.programId
      );

      // Check if already initialized
      try {
        const existingAccessControl = await this.program.account.accessControl.fetch(accessControl);
        console.log('✅ Access control already initialized:', existingAccessControl);
        return { success: true, message: 'Access control already initialized', alreadyInitialized: true };
      } catch (error) {
        console.log('Access control not initialized, proceeding with initialization...');
      }

      // Build initialize_access_control transaction using Phantom's recommended method
      const instruction = await this.program.methods
        .initializeAccessControl()
        .accounts({
          accessControl: accessControl,
          admin: walletPubkey,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      // Create transaction
      const transaction = new Transaction().add(instruction);
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = walletPubkey;
      
      // Use Phantom's recommended signAndSendTransaction method
      const { signature: tx } = await this.wallet.signAndSendTransaction(transaction);

      console.log('Access control initialization transaction sent:', tx);
      
      // Use our custom confirmation method
      try {
        await this.confirmTransaction(tx);
        console.log('Access control initialized successfully:', tx);
        return { success: true, transaction: tx, message: 'Access control initialized successfully' };
      } catch (confirmError) {
        console.warn('Transaction confirmation timeout, but initialization may have succeeded:', tx);
        return { 
          success: true, 
          transaction: tx,
          warning: 'Transaction sent but confirmation timed out. Please check your wallet for the result.'
        };
      }
    } catch (error) {
      console.error('Error initializing access control:', error);
      throw new Error(`Access control initialization failed: ${error.message}`);
    }
  }

  async addMarketCreator(creatorPubkey) {
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
      // Find access control PDA
      const [accessControl] = PublicKey.findProgramAddressSync(
        [Buffer.from("access_control")],
        this.program.programId
      );

      // Build add_market_creator transaction using Phantom's recommended method
      const instruction = await this.program.methods
        .addMarketCreator(creatorPubkey)
        .accounts({
          accessControl: accessControl,
          admin: walletPubkey,
        })
        .instruction();

      // Create transaction
      const transaction = new Transaction().add(instruction);
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = walletPubkey;
      
      // Use Phantom's recommended signAndSendTransaction method
      const { signature: tx } = await this.wallet.signAndSendTransaction(transaction);

      console.log('Add market creator transaction sent:', tx);
      
      // Use our custom confirmation method
      try {
        await this.confirmTransaction(tx);
        console.log('Market creator added successfully:', tx);
        return { success: true, transaction: tx, message: 'Market creator added successfully' };
      } catch (confirmError) {
        console.warn('Transaction confirmation timeout, but operation may have succeeded:', tx);
        return { 
          success: true, 
          transaction: tx,
          warning: 'Transaction sent but confirmation timed out. Please check your wallet for the result.'
        };
      }
    } catch (error) {
      console.error('Error adding market creator:', error);
      throw new Error(`Failed to add market creator: ${error.message}`);
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

      // Build resolve_market transaction using Phantom's recommended method
      const instruction = await this.program.methods
        .resolveMarket(winningOption)
        .accounts({
          market: market,
          platformState: platformState,
          authority: walletPubkey,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      // Create transaction
      const transaction = new Transaction().add(instruction);
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = walletPubkey;
      
      // Use Phantom's recommended signAndSendTransaction method
      const { signature: tx } = await this.wallet.signAndSendTransaction(transaction);

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

  // Manual sync method for API endpoint
  async syncUserPositions(walletAddress = null) {
    try {
      if (walletAddress) {
        console.log(`🔄 Syncing positions for specific user: ${walletAddress}`);
        // Implement user-specific sync if needed
        await this.syncAllUserPositions(); // For now, sync all
      } else {
        await this.syncAllUserPositions();
      }
      return true;
    } catch (error) {
      console.error('Error in manual sync:', error);
      return false;
    }
  }

  // NEW METHOD: Force sync all market volumes
  async forceVolumeSync() {
    try {
      console.log('🔄 Triggering force volume sync for all markets...');
      
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const response = await fetch(`${backendUrl}/api/markets/force-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Volume sync completed:', result.message);
        console.log(`📊 Synced ${result.synced}/${result.total} markets`);
        
        // Clear cache to force fresh data
        cacheService.clear();
        
        return {
          success: true,
          synced: result.synced,
          total: result.total,
          message: result.message
        };
      } else {
        console.error('❌ Volume sync failed:', response.status);
        return {
          success: false,
          error: `HTTP ${response.status}`
        };
      }
    } catch (error) {
      console.error('❌ Error triggering volume sync:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Enhanced fetch method that auto-syncs volumes if needed
  async fetchMarketsWithAutoSync() {
    try {
      console.log('📊 Fetching markets with auto-sync capability...');
      
      // First try to get markets normally
      const markets = await this.fetchMarketsWithStats();
      
      // Check if any markets have zero volume (indicating sync issue)
      const marketsWithZeroVolume = markets.filter(market => 
        !market.totalVolume || market.totalVolume === 0
      );
      
      if (marketsWithZeroVolume.length > 0) {
        console.log(`⚠️ Found ${marketsWithZeroVolume.length} markets with zero volume, triggering sync...`);
        
        // Trigger volume sync
        const syncResult = await this.forceVolumeSync();
        
        if (syncResult.success) {
          console.log('✅ Auto-sync completed, refetching markets...');
          // Wait a moment for database to update
          await new Promise(resolve => setTimeout(resolve, 1000));
          // Fetch fresh data
          return await this.fetchMarketsWithStats();
        } else {
          console.warn('⚠️ Auto-sync failed, returning original data');
        }
      }
      
      return markets;
    } catch (error) {
      console.error('❌ Error in fetchMarketsWithAutoSync:', error);
      // Fallback to regular fetch
      return await this.fetchMarketsWithStats();
    }
  }

  // NEW METHOD: Fetch LIVE blockchain data with real-time volumes
  async fetchLiveMarketsData() {
    try {
      console.log('🔴 Fetching LIVE market data directly from blockchain...');
      
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const response = await fetch(`${backendUrl}/api/markets/live`, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 15000 // 15 second timeout for blockchain calls
      });
      
      if (response.ok) {
        const liveMarkets = await response.json();
        console.log(`🔴 Successfully fetched LIVE data for ${liveMarkets.length} markets`);
        
        // Log first market to show it's live data
        if (liveMarkets.length > 0) {
          const firstMarket = liveMarkets[0];
          console.log('🔴 First LIVE market data:', {
            question: firstMarket.question?.substring(0, 50),
            totalVolume: firstMarket.totalVolume,
            participantCount: firstMarket.participantCount,
            dataSource: firstMarket.dataSource,
            isLiveData: firstMarket.isLiveData,
            lastUpdated: firstMarket.lastUpdated
          });
        }
        
        return liveMarkets;
      } else {
        console.warn('⚠️ Live data fetch failed, falling back to cached data');
        return await this.fetchMarketsWithStats();
      }
    } catch (error) {
      console.error('❌ Error fetching live markets data:', error);
      console.log('🔄 Falling back to cached market data...');
      return await this.fetchMarketsWithStats();
    }
  }

  // NEW METHOD: Fetch live data for a specific market
  async fetchLiveMarketData(marketAddress) {
    try {
      console.log(`🔴 Fetching LIVE data for market: ${marketAddress}`);
      
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const response = await fetch(`${backendUrl}/api/markets/live/${marketAddress}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000 // 10 second timeout
      });
      
      if (response.ok) {
        const liveMarket = await response.json();
        console.log(`🔴 Successfully fetched LIVE data for ${marketAddress}:`, {
          totalVolume: liveMarket.totalVolume,
          participantCount: liveMarket.participantCount,
          dataSource: liveMarket.dataSource,
          isLiveData: liveMarket.isLiveData
        });
        
        return liveMarket;
      } else {
        console.warn(`⚠️ Live data fetch failed for ${marketAddress}, falling back to cached data`);
        
        // Fallback to regular fetch
        const backendMarkets = await this.fetchMarketsWithStats();
        return backendMarkets.find(market => market.publicKey === marketAddress) || null;
      }
    } catch (error) {
      console.error(`❌ Error fetching live market data for ${marketAddress}:`, error);
      
      // Fallback to regular fetch
      const backendMarkets = await this.fetchMarketsWithStats();
      return backendMarkets.find(market => market.publicKey === marketAddress) || null;
    }
  }

  // NEW METHOD: Force refresh live data for a specific market
  async refreshLiveMarketData(marketAddress) {
    try {
      console.log(`🔄 Force refreshing LIVE data for market: ${marketAddress}`);
      
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const response = await fetch(`${backendUrl}/api/markets/refresh-live/${marketAddress}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 15000 // 15 second timeout for fresh blockchain fetch
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Successfully refreshed LIVE data for ${marketAddress}:`, result.liveData);
        
        // Clear any local cache
        cacheService.clear();
        
        return {
          success: true,
          liveData: result.liveData,
          message: result.message
        };
      } else {
        console.error(`❌ Failed to refresh live data for ${marketAddress}`);
        return {
          success: false,
          error: `HTTP ${response.status}`
        };
      }
    } catch (error) {
      console.error(`❌ Error refreshing live market data for ${marketAddress}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // NEW METHOD: Get live cache statistics
  async getLiveCacheStats() {
    try {
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const response = await fetch(`${backendUrl}/api/markets/cache-stats`);
      
      if (response.ok) {
        const stats = await response.json();
        return stats;
      } else {
        return { success: false, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      console.error('Error getting live cache stats:', error);
      return { success: false, error: error.message };
    }
  }

  // Enhanced fetch method with live data preference
  async fetchMarketsWithLiveData() {
    try {
      console.log('📊 Fetching markets with live data preference...');
      
      // Try to fetch live data first for maximum transparency
      const liveMarkets = await this.fetchLiveMarketsData();
      
      // If live data is available and has valid data, use it
      if (liveMarkets && liveMarkets.length > 0) {
        const liveMarketsWithData = liveMarkets.filter(market => 
          market.isLiveData && market.dataSource === 'live_blockchain'
        );
        
        if (liveMarketsWithData.length > 0) {
          console.log(`✅ Using LIVE blockchain data for ${liveMarketsWithData.length} markets`);
          return liveMarkets; // Return all markets (including fallback data)
        }
      }
      
      // Fallback to cached data if live data not available
      console.log('🔄 Live data not available, using cached data with auto-sync...');
      return await this.fetchMarketsWithAutoSync();
      
    } catch (error) {
      console.error('❌ Error in fetchMarketsWithLiveData:', error);
      // Final fallback
      return await this.fetchMarketsWithStats();
    }
  }

  // NEW METHOD: Sync resolution status for a specific market
  async syncMarketResolutionStatus(marketAddress) {
    try {
      console.log(`🔍 Syncing resolution status for market: ${marketAddress}`);
      
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const response = await fetch(`${backendUrl}/api/markets/sync-resolution/${marketAddress}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 15000 // 15 second timeout for blockchain calls
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.wasResolved) {
          console.log(`✅ Market ${marketAddress} resolution synced:`, {
            winningOption: result.winningOption,
            status: `${result.previousStatus} → ${result.newStatus}`
          });
          
          // Clear cache to force fresh data
          cacheService.clear();
          
          return {
            success: true,
            wasResolved: true,
            winningOption: result.winningOption,
            previousStatus: result.previousStatus,
            newStatus: result.newStatus,
            message: result.message
          };
        } else if (result.success && !result.wasResolved) {
          console.log(`📊 Market ${marketAddress} is still active on blockchain`);
          return {
            success: true,
            wasResolved: false,
            currentStatus: result.currentStatus,
            message: result.message
          };
        } else {
          console.error(`❌ Failed to sync resolution for ${marketAddress}:`, result.error);
          return {
            success: false,
            error: result.error || result.message
          };
        }
      } else {
        console.error(`❌ HTTP error syncing resolution for ${marketAddress}:`, response.status);
        return {
          success: false,
          error: `HTTP ${response.status}`
        };
      }
    } catch (error) {
      console.error(`❌ Error syncing resolution for ${marketAddress}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // NEW METHOD: Sync resolution status for all markets
  async syncAllMarketResolutions() {
    try {
      console.log('🔄 Syncing resolution status for ALL markets...');
      
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const response = await fetch(`${backendUrl}/api/markets/sync-all-resolutions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 60000 // 60 second timeout for batch operation
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          console.log(`✅ Batch resolution sync completed:`, result.statistics);
          
          if (result.statistics.newlyResolved > 0) {
            console.log(`🎯 ${result.statistics.newlyResolved} markets were updated to resolved status`);
            console.log('🏆 Newly resolved markets:', result.resolvedMarkets);
          }
          
          // Clear cache to force fresh data
          cacheService.clear();
          
          return {
            success: true,
            statistics: result.statistics,
            resolvedMarkets: result.resolvedMarkets,
            summary: result.summary,
            recommendations: result.recommendations
          };
        } else {
          console.error('❌ Batch resolution sync failed:', result.error);
          return {
            success: false,
            error: result.error
          };
        }
      } else {
        console.error('❌ HTTP error in batch resolution sync:', response.status);
        return {
          success: false,
          error: `HTTP ${response.status}`
        };
      }
    } catch (error) {
      console.error('❌ Error in batch resolution sync:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // NEW METHOD: Check resolution status without updating
  async checkMarketResolutionStatus(marketAddress) {
    try {
      console.log(`👀 Checking resolution status for market: ${marketAddress}`);
      
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const response = await fetch(`${backendUrl}/api/markets/resolution-status/${marketAddress}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000 // 10 second timeout
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          console.log(`📊 Resolution status for ${marketAddress}:`, {
            database: result.database.status,
            blockchain: result.blockchain.status,
            needsSync: result.needsSync
          });
          
          return {
            success: true,
            marketAddress,
            database: result.database,
            blockchain: result.blockchain,
            statusMismatch: result.statusMismatch,
            needsSync: result.needsSync,
            recommendations: result.recommendations
          };
        } else {
          return {
            success: false,
            error: 'Failed to check resolution status'
          };
        }
      } else {
        return {
          success: false,
          error: `HTTP ${response.status}`
        };
      }
    } catch (error) {
      console.error(`❌ Error checking resolution status for ${marketAddress}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Enhanced fetch method that auto-syncs resolution status
  async fetchMarketsWithResolutionSync() {
    try {
      console.log('📊 Fetching markets with auto-resolution sync...');
      
      // First get markets normally
      const markets = await this.fetchMarketsWithLiveData();
      
      // Check for any markets that might need resolution syncing
      const activeMarkets = markets.filter(market => market.status === 'Active');
      
      if (activeMarkets.length > 0) {
        console.log(`🔍 Found ${activeMarkets.length} active markets, checking if any are resolved on blockchain...`);
        
        // For now, just log this - in the future, we could auto-sync
        // Uncomment the line below to enable automatic resolution syncing
        // await this.syncAllMarketResolutions();
      }
      
      return markets;
    } catch (error) {
      console.error('❌ Error in fetchMarketsWithResolutionSync:', error);
      return await this.fetchMarketsWithLiveData();
    }
  }

  // Fetch all markets with optional resolved markets
  async fetchMarkets(includeResolved = false) {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/markets${includeResolved ? '?include_resolved=true' : ''}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const markets = await response.json();
      
      console.log(`📊 Fetched ${markets.length} markets${includeResolved ? ' (including resolved)' : ' (active only)'}`);
      
      return markets;
    } catch (error) {
      console.error('Error fetching markets:', error);
      throw error;
    }
  }

  // Fetch only resolved markets with winners
  async fetchResolvedMarkets() {
    try {
      console.log('🏆 Fetching resolved markets with blockchain verification...');
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/markets/resolved`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log(`✅ Fetched ${data.total} resolved markets:`, {
        blockchainVerified: data.summary.blockchainVerified,
        databaseOnly: data.summary.databaseOnly,
        lastChecked: data.lastChecked
      });
      
      return data;
    } catch (error) {
      console.error('Error fetching resolved markets:', error);
      throw error;
    }
  }

  // Fetch both active and resolved markets separately
  async fetchAllMarketsWithResolved() {
    try {
      const [activeMarketsResponse, resolvedMarketsResponse] = await Promise.all([
        this.fetchMarkets(false), // Active only
        this.fetchResolvedMarkets() // Resolved only
      ]);
      
      return {
        active: activeMarketsResponse,
        resolved: resolvedMarketsResponse.markets,
        summary: {
          totalActive: activeMarketsResponse.length,
          totalResolved: resolvedMarketsResponse.total,
          blockchainVerified: resolvedMarketsResponse.summary.blockchainVerified
        }
      };
    } catch (error) {
      console.error('Error fetching all markets with resolved:', error);
      throw error;
    }
  }
}

export default new MarketService(); 