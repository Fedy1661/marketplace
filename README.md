# Marketplace

CreateItem, as a constructor, where people push urls

### Coverage

| Contract    | % Stmts | % Branch | % Funcs | % Lines |
|-------------|---------|----------|---------|---------|
| Marketplace | 100     | 100      | 100     | 100     |

### Deploy

```shell
ERC20=ADDRESS npx hardhat run scripts/deploy.ts
```

### Verification

```shell
npx hardhat verify MARKETPLACE_ADDRESS ERC20_ADDRESS
```

### Custom tasks

```shell
npx hardhat createItem
npx hardhat listItem
npx hardhat buyItem
npx hardhat cancel
npx hardhat listItemOnAuction
npx hardhat FinishAuction
npx hardhat makeBid
npx hardhat setAuctionDuration
npx hardhat setMinBids
```

#### Examples

```shell
npx hardhat createItem --marketplace 0xBE9d8D29901CAAfD0B0651305719a29C527819E4 --owner 0xb08a6d31689f15444f9f3060ef6bb63e66be76d2 --network rinkeby
npx hardhat listItem --marketplace 0xBE9d8D29901CAAfD0B0651305719a29C527819E4 --id 0 --price 100 --network rinkeby
npx hardhat cancel --marketplace 0xBE9d8D29901CAAfD0B0651305719a29C527819E4 --id 0 --network rinkeby
npx hardhat listItemOnAuction --marketplace 0xBE9d8D29901CAAfD0B0651305719a29C527819E4 --id 0 --min 10 --network rinkeby
npx hardhat setAuctionDuration --marketplace 0xBE9d8D29901CAAfD0B0651305719a29C527819E4 --duration 20000000 --network rinkeby
```