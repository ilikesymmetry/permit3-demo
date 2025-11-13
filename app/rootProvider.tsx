"use client";
import { ReactNode, useState } from "react";
import { baseSepolia } from "wagmi/chains";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getConfig } from './wagmi';


import "@coinbase/onchainkit/styles.css";
import { WagmiProvider } from "wagmi";

export function RootProvider({ children }: { children: ReactNode }) {
  const [config] = useState(() => getConfig());
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          chain={baseSepolia}
          config={{
            // appearance: {
            //   mode: "auto",
            // },
            // wallet: {
            //   display: "modal",
            //   preference: "all",
            // },
          }}
        >
          {children}
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
