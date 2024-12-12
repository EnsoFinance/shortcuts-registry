# shortcuts-registry

## generate
pass the chain name followed by the shortcut name

`pnpm generate cartio dolomite-dhoney`

## simulate
pass the amount(s) that you want to simulate. if you shortcut that takes multiple tokens, pass the amounts as comma separated values: e.g. 100,100

`pnpm simulate cartio dolomite-dhoney 1000000`

simulation is done via the quoter. please set `QUOTER_URL` in the .env file