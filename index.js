import { createPublicClient, http, parseAbiItem } from 'viem';
import { baseSepolia } from 'viem/chains';
import fs from 'fs/promises';
import path from 'path';

// --- CONFIGURATION ---
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC
const DB_PATH = path.resolve('./used-txs.json');

// --- CLIENT SETUP ---
const client = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

// --- PERSISTENCE LOGIC ---
async function isTxUsed(txHash) {
    try {
        const data = await fs.readFile(DB_PATH, 'utf8');
        const usedTxs = JSON.parse(data);
        return usedTxs.includes(txHash);
    } catch (e) {
        return false; // File might not exist yet
    }
}

async function markTxUsed(txHash) {
    try {
        let usedTxs = [];
        try {
            const data = await fs.readFile(DB_PATH, 'utf8');
            usedTxs = JSON.parse(data);
        } catch (e) {
            // New file
        }
        usedTxs.push(txHash);
        await fs.writeFile(DB_PATH, JSON.stringify(usedTxs, null, 2));
    } catch (e) {
        console.error("Failed to save TX DB:", e);
    }
}

// --- VERIFICATION LOGIC ---
async function verifyPayment(txHash, receiverWallet, price) {
  try {
    // 0. Replay Protection
    if (await isTxUsed(txHash)) {
        return { valid: false, reason: "Transaction already used. Please pay again." };
    }

    const tx = await client.getTransaction({ hash: txHash });
    const receipt = await client.getTransactionReceipt({ hash: txHash });

    // 1. Check status
    if (receipt.status !== 'success') return { valid: false, reason: "Transaction failed on-chain." };

    // 2. Decode logs to find Transfer event to our wallet
    const logs = receipt.logs.filter(log => 
      log.address.toLowerCase() === USDC_ADDRESS.toLowerCase()
    );

    for (const log of logs) {
      try {
        // Topic 2: To (padded)
        const toTopic = log.topics[2];
        const cleanTo = `0x${toTopic.slice(26)}`; // Remove padding
        
        if (cleanTo.toLowerCase() === receiverWallet.toLowerCase()) {
            // Check Value (USDC has 6 decimals)
            const valueHex = log.data; 
            const value = parseInt(valueHex, 16);
            const valueFormatted = value / 1000000; 

            if (valueFormatted >= parseFloat(price)) {
                // SUCCESS! Mark as used.
                await markTxUsed(txHash);
                return { valid: true };
            }
        }
      } catch (e) {
          continue; 
      }
    }
    
    return { valid: false, reason: "No valid USDC transfer to receiver found in transaction." };

  } catch (error) {
    console.error(error);
    return { valid: false, reason: "Could not fetch transaction. Invalid Hash?" };
  }
}

// --- MIDDLEWARE EXPORT ---
export function turnstile(config) {
    const { receiver, price, chain = "Base Sepolia" } = config;

    return async (req, res, next) => {
        const paymentTx = req.headers['x-payment-tx'];

        if (!paymentTx) {
            return res.status(402).json({
                error: "Payment Required",
                message: "This agent endpoint requires payment.",
                payment_details: {
                    chain: chain,
                    token: "USDC",
                    token_address: USDC_ADDRESS,
                    receiver: receiver,
                    amount: price,
                    instruction: "Send USDC and retry request with header 'x-payment-tx: <your_tx_hash>'"
                }
            });
        }

        console.log(`🐿️ Turnstile: Verifying ${paymentTx}...`);
        const result = await verifyPayment(paymentTx, receiver, price);

        if (!result.valid) {
            return res.status(403).json({ error: "Payment Invalid", reason: result.reason });
        }

        console.log(`✅ Payment Validated! Access Granted.`);
        next();
    };
}
