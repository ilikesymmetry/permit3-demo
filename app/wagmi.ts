import { http, cookieStorage, createConfig, createStorage } from "wagmi";
import { baseSepolia } from "viem/chains";
import { coinbaseWallet, baseAccount } from "wagmi/connectors";

export function getConfig() {
  return createConfig({
    chains: [baseSepolia],
    connectors: [
      // smart wallet
      baseAccount({
        preference: {
          walletUrl: "http://localhost:3005/connect",
        },
      }),
      // EOA
      // coinbaseWallet(),
    ],
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    transports: {
      [baseSepolia.id]: http(),
    },
  });
}

declare module "wagmi" {
  interface Register {
    config: ReturnType<typeof getConfig>;
  }
}
