![cover](cover.webp)

# Shortcuts Registry

This is a registry of shortcuts (weiroll scripts) used in Royco Campaigns.

## Setup

Request an NPM token from the Enso team.

Install dependencies:

```sh
pnpm install
```

Setup foundry:

```sh
forge soldeer update
forge remappings
```

Alternatively (npm packages + foundry):

```sh
pnpm registryup
```

## Generate

Pass the chain name (e.g., cartio), the protocol (e.g., dolomite) and the market (e.g., dhoney)

```sh
pnpm generate cartio dolomite dhoney
```

## Simulate

Simulation supported modes are: `forge`, and `quoter`. Simulation mode is set via `--mode=<simulationMode>`. By default
simulation is done via the `quoter`.

### Forge

Please set first:

- `RPC_URL_<network_name>` in the .env file.
- `Shorcut.getTokenHolder(chainId)` TypeScript implementation (responsible of Weiroll wallet funding with `tokensIn`
  before shortcut execution). Optionally, `Shorcut.getAddressData(chainId)` (responsible of labelling addresses).

```sh
pnpm simulate cartio beraborrow mint-nect-lp 100000 --mode=forge
```

Optionally set the fork block number via `--block=`:

```sh
pnpm simulate cartio beraborrow mint-nect-lp 100000 --mode=forge --block=1835295
```

### Quoter

Please set `QUOTER_URL` in the .env file.

Pass the amount(s) that you want to simulate (e.g., 1000000). If you shortcut that takes multiple tokens, pass the
amounts as comma separated values (e.g., 100,100).

```sh
pnpm simulate cartio dolomite dhoney 1000000
```

```sh
pnpm simulate cartio kodiak honey-usdc 10000 --mode=quoter
```

### Execute

To actually execute on-chain you can use the following command:

```sh
pnpm execute cartio dolomite dhoney 0x0a26df1d9EE5e99dF92552979E83BEeA54653E8a
```

Where the address passed is the wallet that will be executing the call. You must set the private key to `PRIVATE_KEY` in
the .env file or pass it directly via `--privateKey=`

The script will only work if the wallet is already deployed and funded.
