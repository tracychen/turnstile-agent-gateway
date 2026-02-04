import express from 'express';
import { createPublicClient, http, parseAbiItem, formatUnits } from 'viem';
import { baseSepolia } from 'viem/chains';

// --- CONFIGURATION ---
const PORT = process.env.PORT || 3001;
const RECEIVER_WALLET = process.env.WALLET || "0x6113e0f4512BB69a28FA4De9B3cfa0cf7a5B2D50"; // User must set this
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC
const PRICE_USDC = "1.0"; // Cost of the service

// --- CLIENT SETUP ---
const client = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

const app = express();
app.use(express.json());

// --- VERIFICATION LOGIC ---
async function verifyPayment(txHash) {
  try {
    const tx = await client.getTransaction({ hash: txHash });
    const receipt = await client.getTransactionReceipt({ hash: txHash });

    // 1. Check status
    if (receipt.status !== 'success') return { valid: false, reason: "Transaction failed on-chain." };

    // 2. Check age (allow 10 mins drift/delay)
    // Note: In prod, check block timestamp. Simplified here.

    // 3. Decode logs to find Transfer event to our wallet
    // USDC Transfer event: Transfer(address indexed from, address indexed to, uint256 value)
    const transferEventAbi = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');
    
    // Filter logs for this tx that match USDC contract and Transfer event
    const logs = receipt.logs.filter(log => 
      log.address.toLowerCase() === USDC_ADDRESS.toLowerCase()
    );

    for (const log of logs) {
      try {
        // We manually decode or use viem's parseLog if we had the full ABI, 
        // but for a hackathon simplified check, we can check the topics.
        // Topic 0: Keccak256("Transfer(address,address,uint256)")
        // Topic 1: From (padded)
        // Topic 2: To (padded)
        
        const toTopic = log.topics[2];
        const cleanTo = `0x${toTopic.slice(26)}`; // Remove padding
        
        if (cleanTo.toLowerCase() === RECEIVER_WALLET.toLowerCase()) {
            // Check Value
            // USDC has 6 decimals
            const valueHex = log.data; 
            const value = parseInt(valueHex, 16);
            const valueFormatted = value / 1000000; // 6 decimals

            if (valueFormatted >= parseFloat(PRICE_USDC)) {
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

// --- ENDPOINTS ---

// The "Premium" Resource
app.get('/api/ace-insight', async (req, res) => {
  const paymentTx = req.headers['x-payment-tx'];

  if (!paymentTx) {
    // 402 Payment Required
    // We tell the agent EXACTLY how to pay
    return res.status(402).json({
      error: "Payment Required",
      message: "This endpoint requires payment.",
      payment_details: {
        chain: "Base Sepolia",
        token: "USDC",
        token_address: USDC_ADDRESS,
        receiver: RECEIVER_WALLET,
        amount: PRICE_USDC,
        instruction: "Send USDC and retry request with header 'x-payment-tx: <your_tx_hash>'"
      }
    });
  }

  // Verify
  console.log(`Verifying tx: ${paymentTx}...`);
  const verification = await verifyPayment(paymentTx);

  if (!verification.valid) {
    return res.status(403).json({ error: "Payment Invalid", reason: verification.reason });
  }

  // Success
  res.json({
    success: true,
    data: {
      insight: "The Ace says: The future of commerce is automated.",
      secret_code: "QUOKKA_777",
      timestamp: new Date().toISOString()
    }
  });
});

// Root
app.get('/', (req, res) => {
  res.send("Turnstile API Gateway. Try GET /api/ace-insight");
});

app.listen(PORT, () => {
  console.log(`🐿️ Turnstile Gateway running on port ${PORT}`);
  console.log(`💰 Receiver Wallet: ${RECEIVER_WALLET}`);
});
