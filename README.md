![cover](cover.webp)

# Shortcuts Registry

This is a registry of shortcuts (weiroll scripts) used in Royco Campaigns.

## Setup

Request an NPM token from the Enso team.

Install dependencies

`pnpm install`

## Generate

pass the chain, protocol, market

`pnpm generate cartio dolomite dhoney`

## Simulate

pass the amount(s) that you want to simulate. if you shortcut that takes multiple tokens, pass the amounts as comma separated values: e.g. 100,100

`pnpm simulate cartio dolomite dhoney 1000000`

simulation is done via the quoter. please set `QUOTER_URL` in the .env file
