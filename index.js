import { createPublicClient, http, parseAbiItem } from 'viem';
import { baseSepolia } from 'viem/chains';
import fs from 'fs/promises';
import path from 'path';
import jwt from 'jsonwebtoken';

// --- CONFIGURATION ---
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC
const DB_PATH = path.resolve('./used-txs.json');
const JWT_SECRET = process.env.JWT_SECRET || "default_insecure_secret_for_hackathon"; 

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
        return false; 
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
    if (await isTxUsed(txHash)) {
        return { valid: false, reason: "Transaction already used." };
    }

    const tx = await client.getTransaction({ hash: txHash });
    const receipt = await client.getTransactionReceipt({ hash: txHash });

    if (receipt.status !== 'success') return { valid: false, reason: "Transaction failed on-chain." };

    const logs = receipt.logs.filter(log => 
      log.address.toLowerCase() === USDC_ADDRESS.toLowerCase()
    );

    for (const log of logs) {
      try {
        const toTopic = log.topics[2];
        const cleanTo = `0x${toTopic.slice(26)}`; 
        
        if (cleanTo.toLowerCase() === receiverWallet.toLowerCase()) {
            const valueHex = log.data; 
            const value = parseInt(valueHex, 16);
            const valueFormatted = value / 1000000; 

            if (valueFormatted >= parseFloat(price)) {
                await markTxUsed(txHash);
                
                // --- NEW: Generate Session Token ---
                const token = jwt.sign(
                    { 
                        tx: txHash, 
                        buyer: tx.from,
                        tier: "premium" 
                    }, 
                    JWT_SECRET, 
                    { expiresIn: '1h' } // 1 Hour Access
                );

                return { valid: true, token: token };
            }
        }
      } catch (e) {
          continue; 
      }
    }
    
    return { valid: false, reason: "No valid USDC transfer found." };

  } catch (error) {
    console.error(error);
    return { valid: false, reason: "Invalid Hash" };
  }
}

// --- MIDDLEWARE EXPORT ---
export function turnstile(config) {
    const { receiver, price, chain = "Base Sepolia" } = config;

    return async (req, res, next) => {
        // 1. Check for existing Session Token
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                console.log(`✅ Session Valid: ${decoded.tx}`);
                req.agentSession = decoded;
                return next(); // Access Granted
            } catch (err) {
                console.log("❌ Invalid Session Token");
                // Continue to check for new payment
            }
        }

        // 2. Check for New Payment
        const paymentTx = req.headers['x-payment-tx'];

        if (!paymentTx) {
            return res.status(402).json({
                error: "Payment Required",
                message: "Pay once, get a 1-hour session token.",
                payment_details: {
                    chain: chain,
                    token: "USDC",
                    token_address: USDC_ADDRESS,
                    receiver: receiver,
                    amount: price,
                    instruction: "Send USDC and retry with 'x-payment-tx'. You will receive a Bearer token for future requests."
                }
            });
        }

        // 3. Verify Payment & Issue Token
        console.log(`🐿️ Turnstile: Verifying Payment ${paymentTx}...`);
        const result = await verifyPayment(paymentTx, receiver, price);

        if (!result.valid) {
            return res.status(403).json({ error: "Payment Invalid", reason: result.reason });
        }

        // 4. Return the Session Token (Client must save this)
        console.log(`✅ Payment Valid! Issuing Session Token.`);
        res.setHeader('x-turnstile-session', result.token); 
        
        // Optional: If it's a direct API call, maybe we just return the token now?
        // But for middleware transparency, we attach it and let the request proceed.
        // The client will see the header and should save it.
        req.agentSession = { new: true, token: result.token };
        next();
    };
}
