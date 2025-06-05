require('dotenv').config();
const { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram, sendAndConfirmTransaction, Transaction } = require('@solana/web3.js');
const { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, createTransferInstruction, createAssociatedTokenAccountInstruction } = require('@solana/spl-token');
const bs58 = require('bs58').default || require('bs58');
const fs = require('fs');
const path = require('path');

// Config
const RPC_URL = 'https://api.devnet.solana.com';
const APES_MINT = new PublicKey('JDgVjm6Sw2tc2mg13RH15AnUUGWoRadRX4Zb69AVNGWb');
const OLD_WALLET_PATH = path.join(process.env.HOME, '.config/solana/id.json');
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const connection = new Connection(RPC_URL, 'confirmed');

async function main() {
  if (!DEPLOYER_PRIVATE_KEY) {
    throw new Error('DEPLOYER_PRIVATE_KEY not set in .env');
  }

  // Load old wallet
  const oldWallet = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(OLD_WALLET_PATH, 'utf-8')))
  );
  // Load deployer wallet
  const deployerWallet = Keypair.fromSecretKey(bs58.decode(DEPLOYER_PRIVATE_KEY));

  console.log('Old wallet:', oldWallet.publicKey.toBase58());
  console.log('Deployer wallet:', deployerWallet.publicKey.toBase58());

  // Find all token accounts for the old wallet
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
    oldWallet.publicKey,
    { programId: TOKEN_PROGRAM_ID }
  );
  let apesAccount = null;
  for (const { pubkey, account } of tokenAccounts.value) {
    if (account.data.parsed.info.mint === APES_MINT.toBase58()) {
      apesAccount = pubkey;
      break;
    }
  }
  if (apesAccount) {
    const tokenBalance = await connection.getTokenAccountBalance(apesAccount);
    const amount = BigInt(tokenBalance.value.amount);
    if (amount > 0n) {
      const deployerTokenAccount = await getAssociatedTokenAddress(APES_MINT, deployerWallet.publicKey);
      // Check if deployer token account exists
      let deployerTokenAccountInfo = null;
      try {
        deployerTokenAccountInfo = await connection.getAccountInfo(deployerTokenAccount);
      } catch (e) {}
      const tx = new Transaction();
      if (!deployerTokenAccountInfo) {
        tx.add(createAssociatedTokenAccountInstruction(
          oldWallet.publicKey, // payer
          deployerTokenAccount,
          deployerWallet.publicKey,
          APES_MINT
        ));
        console.log('Added instruction to create deployer APES token account.');
      }
      tx.add(createTransferInstruction(
        apesAccount,
        deployerTokenAccount,
        oldWallet.publicKey,
        Number(amount),
        [],
        TOKEN_PROGRAM_ID
      ));
      tx.feePayer = oldWallet.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      const sig = await sendAndConfirmTransaction(
        connection,
        tx,
        [oldWallet]
      );
      console.log(`Transferred ${amount} APES tokens to deployer wallet. Tx: ${sig}`);
    } else {
      console.log('No APES tokens to transfer.');
    }
  } else {
    console.log('No APES token account found.');
  }

  // Transfer all remaining SOL (leave 0.001 SOL for rent)
  const solBalance = await connection.getBalance(oldWallet.publicKey);
  if (solBalance > 1000000) {
    const transferAmount = solBalance - 1000000; // leave 0.001 SOL
    const solTx = new Transaction().add(SystemProgram.transfer({
      fromPubkey: oldWallet.publicKey,
      toPubkey: deployerWallet.publicKey,
      lamports: transferAmount,
    }));
    solTx.feePayer = oldWallet.publicKey;
    solTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    const sig = await sendAndConfirmTransaction(
      connection,
      solTx,
      [oldWallet]
    );
    console.log(`Transferred ${transferAmount / LAMPORTS_PER_SOL} SOL to deployer wallet. Tx: ${sig}`);
  } else {
    console.log('Not enough SOL to transfer.');
  }
}

main().catch(console.error); 