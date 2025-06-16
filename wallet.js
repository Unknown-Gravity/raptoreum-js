import { generateKeyPair, getAddressFromWIF } from './signer.js';

export class Wallet {
  constructor(wif, address) {
    this.wif = wif;
    this.address = address;
    this.provider = null;
  }

  static createRandom() {
    const { wif, address } = generateKeyPair();
    return new Wallet(wif, address);
  }

  static fromWIF(wif) {
    const address = getAddressFromWIF(wif);
    return new Wallet(wif, address);
  }

  connect(provider) {
    this.provider = provider;
    return this;
  }

  getAddress() {
    return this.address;
  }

  getWIF() {
    return this.wif;
  }

  async getBalance() {
    if (!this.provider) throw new Error('Provider not connected');

    try {
      const result = await this.provider.call('getaddressbalance', [{ addresses: [this.address] }]);
      return result.balance;
    } catch (err) {
      console.error('❌ Error al consultar balance:', err.message);
      throw err;
    }
  }

  async sendTransaction(toAddress, fee = 10000) {
    if (!this.provider) throw new Error('Provider not connected');

    try {
      const txid = await this.provider.sendRawTransaction(
        this.address,
        toAddress,
        this.wif,
        fee
      );
      return txid;
    } catch (err) {
      console.error('❌ Error al enviar la transacción:', err.message);
      throw err;
    }
  }

  async isValidAddress() {
    if (!this.provider) throw new Error('Provider not connected');

    try {
      const result = await this.provider.call('validateaddress', [this.address]);
      return result.isvalid;
    } catch (err) {
      throw err;
    }
  }

  



}
