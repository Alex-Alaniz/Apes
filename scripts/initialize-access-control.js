const { Connection, Keypair, PublicKey, SystemProgram } = require('@solana/web3.js');
const { Program, AnchorProvider } = require('@coral-xyz/anchor');
const fs = require('fs');
const path = require('path');

// Configuration
const NETWORK = 'devnet';
const config = {
    devnet: {
        rpcUrl: 'https://api.devnet.solana.com',
        programId: 'FGRM6t7tzY9FtFdjq5W9tdwNAkXfZCX1aEMvysdJipib'
    }
};

const idl = require('../src/frontend/src/idl/market_system.json');

async function main() {
    console.log('🎯 Initializing Access Control\n');
    
    // Setup
    const connection = new Connection(config[NETWORK].rpcUrl, 'confirmed');
    const programId = new PublicKey(config[NETWORK].programId);
    
    // Load wallet
    const walletPath = path.join(process.env.HOME, '.config/solana/id.json');
    const wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf8'))));
    
    const provider = new AnchorProvider(
        connection,
        {
            publicKey: wallet.publicKey,
            signTransaction: async (tx) => {
                tx.sign(wallet);
                return tx;
            },
            signAllTransactions: async (txs) => {
                return txs.map(tx => {
                    tx.sign(wallet);
                    return tx;
                });
            }
        },
        { commitment: 'confirmed' }
    );
    
    // Add address to IDL
    const idlWithAddress = {
        ...idl,
        address: config[NETWORK].programId
    };
    
    const program = new Program(idlWithAddress, provider);
    
    try {
        // Find access control PDA
        const [accessControl] = PublicKey.findProgramAddressSync(
            [Buffer.from("access_control")],
            programId
        );
        
        console.log('Access Control PDA:', accessControl.toString());
        console.log('Admin:', wallet.publicKey.toString());
        
        // Initialize access control
        const tx = await program.methods
            .initializeAccessControl()
            .accounts({
                accessControl: accessControl,
                admin: wallet.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .rpc();
        
        console.log('\n✅ Access control initialized!');
        console.log('Transaction:', tx);
        
        // Fetch and display the account
        const account = await program.account.accessControl.fetch(accessControl);
        console.log('\nAccess Control State:');
        console.log('- Admin:', account.admin.toString());
        console.log('- Market creators:', account.marketCreators.length);
        
    } catch (error) {
        if (error.message.includes('already in use')) {
            console.log('ℹ️  Access control already initialized');
            
            // Try to fetch existing account
            try {
                const [accessControl] = PublicKey.findProgramAddressSync(
                    [Buffer.from("access_control")],
                    programId
                );
                const account = await program.account.accessControl.fetch(accessControl);
                console.log('\nExisting Access Control State:');
                console.log('- Admin:', account.admin.toString());
                console.log('- Market creators:', account.marketCreators.length);
                account.marketCreators.forEach((creator, i) => {
                    console.log(`  ${i + 1}. ${creator.toString()}`);
                });
            } catch (fetchError) {
                console.log('Could not fetch existing account');
            }
        } else {
            console.error('❌ Error:', error.message);
        }
    }
}

main().catch(console.error); 