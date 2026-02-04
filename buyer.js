import { createWalletClient, createPublicClient, http, parseAbi, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import fetch from 'node-fetch'; // Requires node-fetch@2 or type=module

// --- CONFIG ---
// USAGE: PRIVATE_KEY=0x... node buyer.js
const TARGET_URL = "http://localhost:3000/api/ace-insight";
const PRIVATE_KEY = process.env.PRIVATE_KEY; 

if (!PRIVATE_KEY) {
    console.error("❌ Error: Set PRIVATE_KEY env var to run the buyer agent.");
    console.error("   Example: PRIVATE_KEY=0x123... node buyer.js");
    process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY);

const client = createPublicClient({ chain: baseSepolia, transport: http() });
const wallet = createWalletClient({ account, chain: baseSepolia, transport: http() });

// USDC Contract (Base Sepolia)
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const USDC_ABI = parseAbi(['function transfer(address to, uint256 amount) returns (bool)']);

async function main() {
    console.log(`🤖 Agent ${account.address} starting...`);
    console.log(`1️⃣  Attempting to fetch resource: ${TARGET_URL}`);

    // 1. Try to fetch (Expect 402)
    let res = await fetch(TARGET_URL);

    if (res.status === 200) {
        console.log("✅ Already paid! Access granted.");
        const data = await res.json();
        console.log("DATA:", data);
        return;
    }

    if (res.status !== 402) {
        console.error(`❌ Unexpected status: ${res.status}`);
        return;
    }

    // 2. Parse Payment Details
    const errorBody = await res.json();
    const details = errorBody.payment_details;
    console.log(`🛑 402 Payment Required.`);
    console.log(`   PAY: ${details.amount} ${details.token}`);
    console.log(`   TO:  ${details.receiver}`);

    // 3. Pay
    console.log(`2️⃣  Initiating USDC Transfer on Base Sepolia...`);
    const amountBigInt = BigInt(parseFloat(details.amount) * 1000000); // 6 decimals

    try {
        const hash = await wallet.writeContract({
            address: USDC_ADDRESS,
            abi: USDC_ABI,
            functionName: 'transfer',
            args: [details.receiver, amountBigInt]
        });

        console.log(`   💸 Sent! Tx: ${hash}`);
        console.log(`   ⏳ Waiting for confirmation...`);

        await client.waitForTransactionReceipt({ hash });
        console.log(`   ✅ Confirmed.`);

        // 4. Retry with Proof
        console.log(`3️⃣  Retrying request with proof...`);
        res = await fetch(TARGET_URL, {
            headers: { 'x-payment-tx': hash }
        });

        if (res.status === 200) {
            const data = await res.json();
            console.log(`🎉 SUCCESS! Data received:`);
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.error(`❌ Failed with status ${res.status} after payment.`);
            console.log(await res.text());
        }

    } catch (e) {
        console.error("❌ Payment failed:", e.message);
    }
}

main();
