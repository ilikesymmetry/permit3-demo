"use client";
import { useState, useEffect } from "react";
import styles from "./page.module.css";
import { Wallet } from "@coinbase/onchainkit/wallet";
import { useAccount, useCapabilities, useChainId, useSignTypedData, useSwitchChain, useSendTransaction, useReadContract } from "wagmi";
import { parseUnits, encodePacked, encodeFunctionData, maxUint256, zeroAddress, hashTypedData } from "viem";
import { baseSepolia } from "viem/chains";

// Token addresses (Base mainnet)
const NATIVE_TOKEN_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

// Spend Permission Manager contract address
const SPEND_PERMISSION_MANAGER = "0x456a216aC3312d45FF40079405b3a2eb4c88d7a5";

// Default spender address (you may want to configure this)
const DEFAULT_SPENDER = "0x2B654aB28f82a2a4E4F6DB8e20791E5AcF4125c6";

const HOOKS = {
  ERC20: "0xe7c50e770cf0b6cd5c5756f9de14fbb343cf9843",
  NATIVE: "0xcbf50e68a02d5d601a38144ee0eca882238ac5b6",
}

// Utility function to deep copy an object and convert BigInts to strings
function deepCopyWithBigIntToString(obj: any): any {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

// ERC20 ABI for approve and allowance functions
const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export default function Home() {
  const { address } = useAccount();
  const { data: capabilities } = useCapabilities();
  const { signTypedData, data: signature } = useSignTypedData();
  const { switchChain } = useSwitchChain();
  const { sendTransaction } = useSendTransaction();
  const chainId = useChainId();
  const [token, setToken] = useState("USDC");
  const [amount, setAmount] = useState("");
  const [balanceAbstraction, setBalanceAbstraction] = useState("none");
  const [signedPermission, setSignedPermission] = useState<any>(null);
  const [isSpending, setIsSpending] = useState(false);

  // console.log(chainId);

  // Switch to baseSepolia if on a different chain
  useEffect(() => {
    if (address && chainId !== baseSepolia.id && switchChain) {
      switchChain({ chainId: baseSepolia.id });
    }
  }, [address, chainId, switchChain]);

  // Check USDC allowance for SpendPermissionManager
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, SPEND_PERMISSION_MANAGER as `0x${string}`] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Check if approval is needed (allowance is 0 or insufficient)
  const needsApproval = !allowance || allowance === BigInt(0);

  // console.log({allowance, needsApproval});

  // Get capabilities for the current chain
  const chainCapabilities = baseSepolia?.id ? capabilities?.[baseSepolia.id] : undefined;

  // console.log({capabilities, chainCapabilities, allowance, needsApproval});
  
  // Check if auxiliary funds (balance abstraction) is supported
  const supportsAuxiliaryFunds = (chainCapabilities as any)?.auxiliaryFunds?.supported === true;

  // Reset token to USDC if ETH is selected but not supported
  useEffect(() => {
    if (token === "ETH" && !supportsAuxiliaryFunds) {
      setToken("USDC");
    }
  }, [token, supportsAuxiliaryFunds]);

  // Reset balance abstraction to "none" if current selection is not supported
  useEffect(() => {
    if (!supportsAuxiliaryFunds && balanceAbstraction !== "none") {
      setBalanceAbstraction("none");
    }
  }, [balanceAbstraction, supportsAuxiliaryFunds]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address || !amount) {
      console.error("Missing required fields");
      return;
    }

    // Get token address based on selection
    const tokenAddress = token === "ETH" ? NATIVE_TOKEN_ADDRESS : USDC_ADDRESS;
    
    // Parse amount to proper decimals (6 for USDC, 18 for ETH)
    const decimals = token === "USDC" ? 6 : 18;
    const allowance = parseUnits(amount, decimals);
    
    // Encode balance abstraction info into extraData
    const extraData = balanceAbstraction !== "none" 
      ? encodePacked(["string"], [balanceAbstraction])
      : "0x";
    
    // Set timestamps (start now, end in 1 year)
    const start = Math.floor(Date.now() / 1000);
    const end = start + (365 * 24 * 60 * 60); // 1 year from now
    
    // Period of 1 day (86400 seconds)
    const period = 86400;
    
    // Random salt
    const salt = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));

    const spendPermission = {
      account: address,
      spender: DEFAULT_SPENDER,
      token: tokenAddress,
      allowance: allowance,
      period: period,
      start: start,
      end: end,
      salt: salt,
      extraData: extraData,
      hook: !supportsAuxiliaryFunds ? zeroAddress : token === "USDC" ? HOOKS.ERC20 : HOOKS.NATIVE,
      hookConfig: "0x",
    };

    // EIP-712 Domain
    const domain = {
      name: "Spend Permission Manager",
      version: "1",
      chainId: chainId,
      verifyingContract: SPEND_PERMISSION_MANAGER as `0x${string}`,
    };

    // EIP-712 Types
    const types = {
      SpendPermission: [
        { name: "account", type: "address" },
        { name: "spender", type: "address" },
        { name: "token", type: "address" },
        { name: "allowance", type: "uint160" },
        { name: "period", type: "uint48" },
        { name: "start", type: "uint48" },
        { name: "end", type: "uint48" },
        { name: "salt", type: "uint256" },
        { name: "extraData", type: "bytes" },
        { name: "hook", type: "address" },
        { name: "hookConfig", type: "bytes" },
      ]
    };

    console.log("Signing spend permission:", spendPermission);

    // Store the permission for later use
    setSignedPermission(spendPermission);

    const messageHash = hashTypedData({
      domain,
      types,
      primaryType: "SpendPermission",
      message: spendPermission,
    });

    console.log("Message:", {domain, types, message: spendPermission});
    console.log("Message hash:", messageHash);

    signTypedData({
      domain,
      types,
      primaryType: "SpendPermission",
      message: spendPermission,
    });
  };

  const handleApprove = () => {
    if (!sendTransaction) {
      console.error("sendTransaction not available");
      return;
    }

    // Encode the approve function call
    const approveData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "approve",
      args: [SPEND_PERMISSION_MANAGER as `0x${string}`, maxUint256],
    });

    // Use max approval for simplicity
    sendTransaction({
      chainId: baseSepolia.id,
      to: USDC_ADDRESS as `0x${string}`,
      data: approveData,
    });
  };

  const handleSpend = async () => {
    if (!signedPermission || !signature) {
      console.error("No signed permission available");
      return;
    }

    setIsSpending(true);

    try {
      const response = await fetch("/spend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          permission: deepCopyWithBigIntToString(signedPermission),
          signature: signature,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Spend successful!");
        console.log("Approve transaction hash:", data.approveTxHash);
        console.log("Spend transaction hash:", data.spendTxHash);
        alert(`Spend successful!\nApprove TX: ${data.approveTxHash}\nSpend TX: ${data.spendTxHash}`);
      } else {
        console.error("Spend failed:", data);
        alert(`Spend failed: ${data.error}`);
      }
    } catch (error) {
      console.error("Error calling spend API:", error);
      alert("Error calling spend API");
    } finally {
      setIsSpending(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.headerWrapper}>
        {address && <Wallet />}
      </header>

      <main className={styles.content}>
        {!address && <Wallet />}
        
        {address && (
          <form 
            className={styles.form}
            onSubmit={handleSubmit}
          >
            <div className={styles.formGroup}>
              <label htmlFor="token">Token</label>
              <select
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className={styles.select}
              >
                <option value="USDC">USDC</option>
                <option value="ETH" disabled={!supportsAuxiliaryFunds}>ETH</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="amount">Amount</label>
              <input
                id="amount"
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="balanceAbstraction">Balance Abstraction</label>
              <select
                id="balanceAbstraction"
                value={balanceAbstraction}
                onChange={(e) => setBalanceAbstraction(e.target.value)}
                className={styles.select}
              >
                <option value="none">None</option>
                <option value="magic-spend" disabled={!supportsAuxiliaryFunds}>Magic Spend</option>
                <option value="subaccount" disabled={!supportsAuxiliaryFunds}>Subaccount</option>
              </select>
            </div>

            {!supportsAuxiliaryFunds && token === "USDC" && needsApproval && (
              <button 
                type="button" 
                onClick={handleApprove} 
                className={styles.button}
              >
                Approve USDC
              </button>
            )}

            <button type="submit" className={styles.button}>
              Sign Permit
            </button>

            {signedPermission && signature && (
              <button 
                type="button" 
                onClick={handleSpend} 
                className={styles.button}
                disabled={isSpending}
              >
                {isSpending ? "Spending..." : "Spend"}
              </button>
            )}
          </form>
        )}
      </main>
    </div>
  );
}