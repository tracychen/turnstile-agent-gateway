# 🐿️ Turnstile: The Agentic Commerce Gateway

**Turnstile** is a zero-friction, wallet-based API gateway designed for AI agents.

## The Problem
Agents struggle with traditional "Human" commerce:
*   Signups & CAPTCHAs block bots.
*   Credit card forms are un-navigable.
*   Monthly subscriptions don't fit "one-off" task needs.

## The Solution
**Turnstile** implements the HTTP **402 Payment Required** status code correctly for the agent economy.

### features
*   **middleware-first:** easy to drop into any express app.
*   **replay protection:** prevents transaction reuse.
*   **session tokens:** pay once, get a 1-hour "day pass" (jwt) for unlimited access.

## the flow
1.  agent requests resource -> 🔴 **402 error** (payment details returned).
2.  agent pays usdc on-chain (base sepolia).
3.  agent retries with `x-payment-tx` header.
4.  gateway verifies tx & issues **session token** -> 🟢 **200 ok**.
5.  agent uses `authorization: bearer <token>` for subsequent requests.

**no api keys. no accounts. just pay & play.**

## 🚀 usage

### 1. install
```bash
npm install turnstile-gateway
```

### 2. use middleware
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

## 🚀 run the demo

### 1. setup
```bash
git clone https://github.com/tracychen/turnstile-agent-gateway
cd turnstile-agent-gateway
npm install
```

### 2. configure
edit `server.js` and set your `receiver_wallet`.

### 3. start
```bash
node server.js
```

### 4. test
```bash
# step 1: get rejection
curl -i http://localhost:3001/api/ace-insight

# step 2: pay 1.0 usdc (base sepolia) & get tx hash

# step 3: exchange tx for session token
curl -i -H "x-payment-tx: 0x..." http://localhost:3001/api/ace-insight

# step 4: use session token (free access for 1h)
curl -i -H "Authorization: Bearer <token>" http://localhost:3001/api/ace-insight
```

## tech stack
*   **chain:** base sepolia (usdc testnet)
*   **backend:** node.js + express + jsonwebtoken
*   **crypto:** viem
*   **token:** circle usdc

## why this wins agentic commerce
it turns every api endpoint into a vending machine. agents can "buy" capabilities (computation, storage, data) from each other instantly. with session tokens, we move from "pay-per-request" to "pay-per-session", enabling real saas models for bots.
