import { NextRequest, NextResponse } from "next/server";
import { createWalletClient, http, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { SPEND_PERMISSION_MANAGER_ABI } from "./abi";

// Spend Permission Manager contract address
// const SPEND_PERMISSION_MANAGER = "0x456a216aC3312d45FF40079405b3a2eb4c88d7a5";
const SPEND_PERMISSION_MANAGER = "0x0de59ad970032a49ca4b88eb33304fc38b4713ea";

export async function POST(request: NextRequest) {
  try {
    // Parse the JSON body
    const body = await request.json();
    console.log("POST /spend", { body });
    const { permission, signature, spendValue } = body;

    if (!permission || !signature) {
      return NextResponse.json(
        { error: "Missing required fields: permission and signature" },
        { status: 400 }
      );
    }

    // Convert string values back to BigInt
    const permissionWithBigInt = {
      ...permission,
      allowance: BigInt(permission.allowance),
      period: BigInt(permission.period),
      start: BigInt(permission.start),
      end: BigInt(permission.end),
      salt: BigInt(permission.salt),
    };

    // Get private key from environment variable
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json(
        { error: "Private key not configured" },
        { status: 500 }
      );
    }

    // Create account from private key
    const account = privateKeyToAccount(privateKey as `0x${string}`);

    // Create wallet client
    const walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(),
    });

    // Send transaction to spend function
    const approveTxHash = await walletClient.writeContract({
      address: SPEND_PERMISSION_MANAGER as Address,
      abi: SPEND_PERMISSION_MANAGER_ABI,
      functionName: "approveWithSignature",
      args: [permissionWithBigInt, signature as `0x${string}`],
    });

    // Wait for 100ms (a tenth of a second)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Send transaction to spend function
    const spendTxHash = await walletClient.writeContract({
      address: SPEND_PERMISSION_MANAGER as Address,
      abi: SPEND_PERMISSION_MANAGER_ABI,
      functionName: "spend",
      args: [permissionWithBigInt, 1, "0x"],
    });

    return NextResponse.json({
      success: true,
      approveTxHash: approveTxHash,
      spendTxHash: spendTxHash,
    });
  } catch (error) {
    console.error("Error processing spend request:", error);
    return NextResponse.json(
      {
        error: "Failed to process spend request",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
