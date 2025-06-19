# raptoreum.js

[![NPM Version](https://img.shields.io/npm/v/raptoreum.js.svg)](https://www.npmjs.com/package/raptoreum.js)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern, lightweight JavaScript library for interacting with the Raptoreum blockchain via its RPC interface. Inspired by web3.js and ethers.js, `raptoreum.js` provides a simple and intuitive API for managing wallets, sending transactions, and interacting with Raptoreum's unique asset layer.

## Features

-   **Wallet Management**: Create new wallets or import existing ones from WIF (Wallet Import Format).
-   **Provider Class**: Easily connect to your local or a remote Raptoreum RPC node.
-   **RTM Transactions**: Send RTM and build complex raw transactions.
-   **Asset Layer Interaction**:
    -   Create new assets (fungible or non-fungible).
    -   Mint assets.
    -   Transfer assets between addresses.
-   **Blockchain Queries**: Fetch balances, transaction details, block information, and more.
-   **ESM Support**: Built as a native ES Module.

## Installation

Install the package using npm:

```bash
npm install raptoreum.js
```

## Getting Started

### 1. Setup the Provider

The `Provider` is your connection to the Raptoreum network. You need to provide the RPC credentials and connection details for your Raptoreum node.

```javascript
// filepath: your-app.js
import { Provider } from 'raptoreum.js';

// Configure with your node's RPC credentials
const provider = new Provider(
  'your_rpc_user',
  'your_rpc_password',
  19998, // Default RPC port for mainnet
  '127.0.0.1'
);

console.log('Provider connected!');
```

### 2. Manage a Wallet

The `Wallet` class represents a user's account. You can create a new one randomly or import an existing one from its WIF private key.

```javascript
// filepath: your-app.js
import { Wallet } from 'raptoreum.js';

// Create a new, random wallet
const newWallet = Wallet.createRandom();
console.log('New Address:', newWallet.getAddress());
console.log('New WIF Private Key:', newWallet.getWIF());

// Or import an existing wallet from its WIF
const existingWif = 'cYourPrivateKey...';
const myWallet = Wallet.fromWIF(existingWif);

// Connect the wallet to the provider to interact with the blockchain
myWallet.connect(provider);

console.log('Wallet ready:', myWallet.getAddress());
```

## Usage Examples

Here are some common operations you can perform with `raptoreum.js`.

### Checking RTM Balance

```javascript
// Assumes 'myWallet' is a connected Wallet instance
async function checkBalance() {
  try {
    const balanceInSatoshis = await myWallet.getBalance();
    console.log(`Balance: ${balanceInSatoshis / 1e8} RTM`);
  } catch (error) {
    console.error('Error fetching balance:', error);
  }
}

checkBalance();
```

### Sending RTM

The `Wallet` class provides a `sendTransaction` helper. Note that the second parameter is the amount to send in Satoshis.

```javascript
// Assumes 'myWallet' is a connected Wallet instance
async function sendRTM(toAddress, amountInSatoshis) {
  try {
    console.log(`Sending ${amountInSatoshis} satoshis to ${toAddress}...`);
    // The method in wallet.js is currently bugged.
    // It should be called like this:
    // const txid = await myWallet.sendTransaction(toAddress, amountInSatoshis, 10000);

    // For now, use the provider's method directly:
    const txid = await myWallet.provider.sendRawTransaction(
      myWallet.getAddress(),
      toAddress,
      myWallet.getWIF(),
      amountInSatoshis, // amount in satoshis
      10000 // fee in satoshis
    );

    console.log('Transaction sent! TXID:', txid);
    return txid;
  } catch (error) {
    console.error('Error sending transaction:', error);
  }
}

// Example: send 1 RTM (1 RTM = 100,000,000 satoshis)
const recipientAddress = 'rxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
sendRTM(recipientAddress, 100000000);
```

### Creating and Transferring a New Asset (NFT)

Creating and distributing an asset is a multi-step process:
1.  **Create**: Define the asset's properties and submit the creation transaction.
2.  **Mint**: After the creation is confirmed, mint the asset.
3.  **Transfer**: After minting is confirmed, send the asset to the final owner.

```javascript
// Assumes 'provider' is an initialized Provider instance
// and 'myWallet' is a connected Wallet instance.
async function createAndSendNFT(customerAddress) {
  try {
    // Step 1: Initiate Asset Creation
    const assetMetadata = {
      name: "MyNFT" + Date.now(), // Must be unique
      updatable: false,
      is_root: true,
      is_unique: true, // This makes it an NFT
      decimalpoint: 0,
      referenceHash: "ipfs-hash-or-any-document-hash",
      maxMintCount: 1,
      type: 0, // Manual minting
      amount: 1,
      ownerAddress: myWallet.getAddress(),
      targetAddress: myWallet.getAddress(),
    };

    console.log("1. Creating asset definition...");
    const creationTxid = await provider.initiateAssetCreation(assetMetadata);
    console.log(`   Creation TXID: ${creationTxid}`);
    await provider.waitTransaction(creationTxid, 1); // Wait for 1 confirmation
    console.log("   Asset definition confirmed.");

    // Step 2: Mint the Asset
    console.log("2. Minting asset...");
    const mintTxid = await provider.mintCreatedAsset(creationTxid);
    console.log(`   Minting TXID: ${mintTxid}`);
    await provider.waitTransaction(mintTxid, 1);
    console.log("   Asset minted successfully.");

    // Step 3: Get the numerical Asset ID and Transfer it
    console.log("3. Transferring asset to customer...");
    const assetDetails = await provider.getassetdetailsbyname(assetMetadata.name);
    const numericalAssetId = assetDetails.assetId;

    const transferTxid = await provider.transferMintedAsset(
      numericalAssetId,
      1, // Amount for an NFT is always 1
      customerAddress
    );
    console.log(`   Transfer TXID: ${transferTxid}`);
    await provider.waitTransaction(transferTxid, 1);
    console.log(`✅ NFT successfully sent to ${customerAddress}!`);

  } catch (error) {
    console.error("Error in NFT creation process:", error);
  }
}

const finalOwnerAddress = 'rzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz';
createAndSendNFT(finalOwnerAddress);
```

### Transferring an Existing Asset (NFT)

If your wallet already holds an asset, you can transfer it to another address using `sendAssetTransaction`.

```javascript
// Assumes 'myWallet' is a connected Wallet instance holding the asset.
async function transferExistingNFT(toAddress, assetTicker, uniqueId) {
  try {
    console.log(`Transferring asset ${assetTicker} to ${toAddress}...`);
    const txid = await myWallet.provider.sendAssetTransaction(
      myWallet.getAddress(),
      toAddress,
      myWallet.getWIF(),
      assetTicker, // The name of the asset, e.g., "MyNFT1678886400"
      uniqueId, // The unique ID for the NFT, often 0 if maxMintCount is 1
      10000 // Fee in RTM satoshis
    );
    console.log('Asset transfer successful! TXID:', txid);
    return txid;
  } catch (error) {
    console.error('Error transferring asset:', error);
  }
}

// transferExistingNFT('rzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz', 'MyNFT1678886400', 0);
```

## API Reference

### `Provider` Class

-   `constructor(RPC_USER, RPC_PASSWORD, RPC_PORT, RPC_HOST)`: Creates a new provider instance.
-   `call(method, params)`: Make a generic call to any RPC method.
-   `getBalance(address)`: Gets the RTM balance for an address.
-   `getTransaction(txid)`: Retrieves detailed information about a transaction.
-   `waitTransaction(txid, confirmations)`: Polls the node until a transaction has a minimum number of confirmations.
-   `initiateAssetCreation(metadata)`: Submits the `createasset` transaction.
-   `mintCreatedAsset(assetIdentifier)`: Mints a created asset using its name or creation TXID.
-   `transferMintedAsset(numericalAssetId, amount, customerAddress)`: Sends a newly minted asset from the node's wallet to a customer.
-   `sendAssetTransaction(...)`: Creates and sends a raw transaction to transfer an asset you own.

### `Wallet` Class

-   `static createRandom()`: Creates a new wallet with a random key pair.
-   `static fromWIF(wif)`: Imports a wallet from a WIF private key.
-   `connect(provider)`: Associates a provider with the wallet instance.
-   `getAddress()`: Returns the wallet's public address.
-   `getWIF()`: Returns the wallet's private key in WIF format.
-   `getBalance()`: Gets the wallet's RTM balance.
-   `sendTransaction(toAddress, amount, fee)`: Sends RTM to another address.
-   `isValidAddress()`: Validates the wallet's address format.

### `signer` Module

-   `generateKeyPair()`: A low-level function to generate an `{ address, wif }` object.
-   `getAddressFromWIF(wif)`: Derives a public address from a WIF key.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.