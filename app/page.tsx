"use client";
import { useState, useEffect } from "react";
import styles from "./page.module.css";
import { Wallet } from "@coinbase/onchainkit/wallet";
import { useAccount, useCapabilities, useChainId, useSignTypedData, useSwitchChain } from "wagmi";
import { parseUnits, encodePacked } from "viem";
import { baseSepolia } from "viem/chains";

// Token addresses (Base mainnet)
const NATIVE_TOKEN_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Spend Permission Manager contract address
const SPEND_PERMISSION_MANAGER = "0xf85210B21cC50302F477BA56686d2019dC9b67Ad";

// Default spender address (you may want to configure this)
const DEFAULT_SPENDER = "0x0000000000000000000000000000000000000000";

export default function Home() {
  const { address } = useAccount();
  const { data: capabilities } = useCapabilities();
  const { signTypedData } = useSignTypedData();
  const { switchChain } = useSwitchChain();
  const chainId = useChainId();
  const [token, setToken] = useState("USDC");
  const [amount, setAmount] = useState("");
  const [balanceAbstraction, setBalanceAbstraction] = useState("none");

  console.log(chainId);

  // Get capabilities for the current chain
  const chainCapabilities = baseSepolia?.id ? capabilities?.[baseSepolia.id] : undefined;

  console.log({capabilities, chainCapabilities});
  
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
        { name: "hookConfig", type: "bytes" },
      ],
    };

    console.log("Signing spend permission:", spendPermission);

    signTypedData({
      domain,
      types,
      primaryType: "SpendPermission",
      message: spendPermission,
    });
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

            <button type="submit" className={styles.button}>
              Submit
            </button>
          </form>
        )}
      </main>
    </div>
  );
}