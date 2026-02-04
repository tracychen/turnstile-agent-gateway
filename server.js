import express from 'express';
import { turnstile } from './index.js';

const PORT = process.env.PORT || 3001;
const RECEIVER_WALLET = process.env.WALLET || "0x6113e0f4512BB69a28FA4De9B3cfa0cf7a5B2D50"; 

const app = express();
app.use(express.json());

// 1. Public Route
app.get('/', (req, res) => {
  res.send("🐿️ Turnstile Gateway. Try GET /api/ace-insight");
});

// 2. Protected Route
app.get('/api/ace-insight', 
  turnstile({ 
    receiver: RECEIVER_WALLET, 
    price: "1.0" 
  }), 
  (req, res) => {
    // Check if a new session was just created
    const responseData = {
      success: true,
      data: {
        insight: "The Ace says: Sessions are stateful. Wallets are forever.",
        secret_code: "QUOKKA_SESSION_777",
        timestamp: new Date().toISOString()
      }
    };

    // If new session, include it in body for convenience
    if (req.agentSession && req.agentSession.new) {
        responseData.session_token = req.agentSession.token;
        responseData.message = "Payment Accepted! Save this token and use 'Authorization: Bearer <token>' for 1 hour access.";
    }

    res.json(responseData);
  }
);

app.listen(PORT, () => {
  console.log(`🐿️ Turnstile Gateway running on port ${PORT}`);
});
