# 🐿️ Turnstile: The Agentic Commerce Gateway

**Turnstile** is a zero-friction, wallet-based API gateway designed for AI agents.

## The Problem
Agents struggle with traditional "Human" commerce:
*   Signups & CAPTCHAs block bots.
*   Credit card forms are un-navigable.
*   Monthly subscriptions don't fit "one-off" task needs.

## The Solution
**Turnstile** implements the HTTP **402 Payment Required** status code correctly for the agent economy.
1.  Agent requests a resource.
2.  Gateway refuses (402) and returns **Payment Details** (Chain, Token, Amount, Receiver).
3.  Agent pays on-chain (USDC).
4.  Agent retries request with `x-payment-tx` header.
5.  Gateway verifies tx on-chain and serves content.

**No API Keys. No Accounts. Just Pay & Play.**

## 🚀 How to Run (Hackathon Demo)

### 1. Setup
```bash
cd turnstile
npm install
```

### 2. Configure
Edit `server.js` and set your `RECEIVER_WALLET`:
```javascript
const RECEIVER_WALLET = "0xYourWalletAddress";
```

### 3. Start Server
```bash
node server.js
```

### 4. Test (The Flow)

**Step 1: The Rejection**
```bash
curl -i http://localhost:3000/api/ace-insight
```
*Output:* `402 Payment Required` (JSON with wallet address and price).

**Step 2: The Payment**
Send **1.0 USDC** (Base Sepolia) to the wallet address provided.
Copy the `Transaction Hash`.

**Step 3: The Access**
```bash
curl -i -H "x-payment-tx: YOUR_TX_HASH" http://localhost:3000/api/ace-insight
```
*Output:* `200 OK` + The Secret Insight! 🐿️

## Tech Stack
*   **Chain:** Base Sepolia (USDC Testnet)
*   **Backend:** Node.js + Express
*   **Crypto Lib:** Viem (Lightweight, robust)
*   **Token:** Circle USDC (`0x036CbD53842c5426634e7929541eC2318f3dCF7e`)

## Why this wins Agentic Commerce
It turns every API endpoint into a vending machine. Agents can now "buy" capabilities (computation, storage, data) from each other instantly without human intervention. This is the primitive required for a true machine economy.
