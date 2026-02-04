# 🐿️ Turnstile: The Agentic Commerce Gateway

**Turnstile** is a zero-friction, wallet-based API gateway designed for AI agents.

## The Problem
Agents struggle with traditional "Human" commerce:
*   Signups & CAPTCHAs block bots.
*   Credit card forms are un-navigable.
*   Monthly subscriptions don't fit "one-off" task needs.

## The Solution
**Turnstile** implements the HTTP **402 Payment Required** status code correctly for the agent economy.

### Features
*   **Middleware-First:** Easy to drop into any Express app.
*   **Replay Protection:** Prevents transaction reuse.
*   **Session Tokens:** Pay once, get a 1-hour "Day Pass" (JWT) for unlimited access.

## The Flow
1.  Agent requests resource -> 🔴 **402 Error** (Payment Details returned).
2.  Agent pays USDC on-chain (Base Sepolia).
3.  Agent retries with `x-payment-tx` header.
4.  Gateway verifies TX & issues **Session Token** -> 🟢 **200 OK**.
5.  Agent uses `Authorization: Bearer <token>` for subsequent requests.

**No API Keys. No Accounts. Just Pay & Play.**

## 🚀 Usage

### 1. Install
```bash
npm install turnstile-gateway
```

### 2. Use Middleware
```javascript
import { turnstile } from 'turnstile-gateway';

app.get('/premium-resource', 
  turnstile({ 
    receiver: "0xYourWallet...", 
    price: "1.0" 
  }), 
  (req, res) => {
    res.json({ data: "Premium Content" });
  }
);
```

## 🚀 Run the Demo

### 1. Setup
```bash
git clone https://github.com/tracychen/turnstile-agent-gateway
cd turnstile-agent-gateway
npm install
```

### 2. Configure
Edit `server.js` and set your `RECEIVER_WALLET`.

### 3. Start
```bash
node server.js
```

### 4. Test
```bash
# Step 1: Get Rejection
curl -i http://localhost:3001/api/ace-insight

# Step 2: Pay 1.0 USDC (Base Sepolia) & Get TX Hash

# Step 3: Exchange TX for Session Token
curl -i -H "x-payment-tx: 0x..." http://localhost:3001/api/ace-insight

# Step 4: Use Session Token (Free Access for 1h)
curl -i -H "Authorization: Bearer <token>" http://localhost:3001/api/ace-insight
```

## Tech Stack
*   **Chain:** Base Sepolia (USDC Testnet)
*   **Backend:** Node.js + Express + JSONWebToken
*   **Crypto:** Viem
*   **Token:** Circle USDC

## Why this wins Agentic Commerce
It turns every API endpoint into a vending machine. Agents can "buy" capabilities (computation, storage, data) from each other instantly. With Session Tokens, we move from "Pay-Per-Request" to "Pay-Per-Session", enabling real SaaS models for bots.
