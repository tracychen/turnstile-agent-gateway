import express from 'express';
import { turnstile } from './index.js';

const PORT = process.env.PORT || 3001;
const RECEIVER_WALLET = process.env.WALLET || "0x6113e0f4512BB69a28FA4De9B3cfa0cf7a5B2D50"; 

const app = express();
app.use(express.json());

// --- ROUTES ---

// 1. Public Route
app.get('/', (req, res) => {
  res.send("🐿️ Turnstile Gateway. Try GET /api/ace-insight");
});

// 2. Protected Route (Middleware Applied)
app.get('/api/ace-insight', 
  turnstile({ 
    receiver: RECEIVER_WALLET, 
    price: "1.0" 
  }), 
  (req, res) => {
    // If we get here, payment is valid!
    res.json({
      success: true,
      data: {
        insight: "The Ace says: Replay attacks are for amateurs.",
        secret_code: "QUOKKA_SECURE_777",
        timestamp: new Date().toISOString()
      }
    });
  }
);

app.listen(PORT, () => {
  console.log(`🐿️ Turnstile Gateway running on port ${PORT}`);
  console.log(`💰 Receiver: ${RECEIVER_WALLET}`);
});
