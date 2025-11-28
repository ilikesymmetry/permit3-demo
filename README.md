This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-onchain`](https://www.npmjs.com/package/create-onchain).


## Getting Started

First, install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

Next, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.



## Demo setup notes

1) Wallet Mobile branch
- Ensure Wallet Mobile is pointing at the correct branch: eric/ba-surge/permit3
- Run wallet-mobile with yarn nx run scw:start 

2) Environment variables
- Required (server-only): `PRIVATE_KEY`
  - This is the relayer private key used by the demo backend to submit on-chain transactions.
  - Add to `.env.local` (not committed):
    ```
    PRIVATE_KEY=0xYOUR_TEST_PRIVATE_KEY
    ```
  - Fund the corresponding address with some ETH on Base Sepolia.
- Required (client): `NEXT_PUBLIC_DEFAULT_SPENDER`
  - Address used as the spender in the signed Spend Permission (typically your relayer).
  - Add to `.env.local`:
    ```
    NEXT_PUBLIC_DEFAULT_SPENDER=0xYOUR_RELAYER_ADDRESS
    ```

3) Smart contract wallet owner step
- If using a smart contract wallet, visit `http://localhost:3005/settings` and add the Permit3 contract as an owner. Follow the UI flow there to complete owner addition.
