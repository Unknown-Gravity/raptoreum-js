import axios from 'axios';

export class Provider {

  constructor(RPC_USER, RPC_PASSWORD, RPC_PORT, RPC_HOST) {

    this.config = {
      RPC_USER: RPC_USER,
      RPC_PASSWORD: RPC_PASSWORD,
      RPC_PORT: RPC_PORT,
      RPC_HOST: RPC_HOST
    };

  }

  async call(method, params = []) {
    try {
      const response = await axios.post(`http://${this.config.RPC_HOST}:${this.config.RPC_PORT}`, {
        jsonrpc: '1.0',
        id: 'rtnft',
        method,
        params
      }, {
        auth: {
          username: this.config.RPC_USER,
          password: this.config.RPC_PASSWORD
        }
      });


      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      return response.data.result;

    } catch (err) {
      let specificErrorMessage = err.message;
      if (err.response && err.response.data && err.response.data.error) {
        // Extrae el mensaje de error específico del nodo Raptoreum si está disponible
        specificErrorMessage = `Code: ${err.response.data.error.code}, Message: ${err.response.data.error.message}`;
        console.error(`[RPC ERROR DETAIL] ${method}:`, err.response.data.error);
      } else {
        console.error(`[RPC ERROR] ${method}:`, err.message);
      }
      // Lanza un error que incluya el mensaje específico si es posible
      throw new Error(`RPC call ${method} failed: ${specificErrorMessage}`);
    }
  }

  // Amount en satoshis
  async sendRawTransaction(fromAddress, toAddress, privateKeyWIF, amountToSend, fee = 10000) {
    try {
      const utxos = await this.call('getaddressutxos', [{ addresses: [fromAddress] }]);
      if (!utxos || utxos.length === 0) throw new Error('No UTXOs disponibles');

      let total = 0;
      const inputs = [];
      for (const utxo of utxos) {
        total += utxo.satoshis;
        inputs.push({ txid: utxo.txid, vout: utxo.outputIndex });
        if (total >= amountToSend + fee) break;
      }

      if (total < amountToSend + fee) throw new Error('Fondos insuficientes');

      const outputs = {};
      outputs[toAddress] = amountToSend / 1e8;
      const change = total - amountToSend - fee;
      if (change > 0) {
        outputs[fromAddress] = change / 1e8;
      }

      const rawTx = await this.call('createrawtransaction', [inputs, outputs]);

      // Preparar scripts y amounts para firmar cada input
      const prevTxs = utxos
        .filter(utxo => inputs.some(input => input.txid === utxo.txid && input.vout === utxo.outputIndex))
        .map(utxo => ({
          txid: utxo.txid,
          vout: utxo.outputIndex,
          scriptPubKey: utxo.script,
          amount: utxo.satoshis / 1e8
        }));

      const signed = await this.call('signrawtransactionwithkey', [
        rawTx,
        [privateKeyWIF],
        prevTxs
      ]);

      const txid = await this.call('sendrawtransaction', [signed.hex]);

      return txid;

    } catch (err) {
      console.error('❌ Error al enviar la transacción:', err.message);
      throw err;
    }
  }

  async getBalance(address) {
    try {
      const result = await this.call('getaddressbalance', [{ addresses: [address] }]);
      return result.balance; // balance en satoshis
    } catch (err) {
      console.error('❌ Error al consultar balance:', err.message);
      throw err;
    }
  }

  async getBlockchainInfo() {
    try {
      const result = await this.call('getblockchaininfo');
      return result;
    } catch (err) {
      console.error('❌ Error al consultar blockchain info:', err.message);
      throw err;
    }
  }

  async getTransaction(txid) {
    try {
      const result = await this.call('getrawtransaction', [txid, true]);
      return result;
    } catch (err) {
      console.error('❌ Error al consultar transacción:', err.message);
      throw err;
    }
  }

  async getLastBlockHash() {
    try {
      const result = await this.call('getbestblockhash');
      return result;
    } catch (err) {
      console.error('❌ Error al consultar el último bloque:', err.message);
      throw err;
    }
  }

  async getBlock(blockHash) {
    try {
      const result = await this.call('getblock', [blockHash]);
      return result;
    } catch (err) {
      console.error('❌ Error al consultar bloque:', err.message);
      throw err;
    }
  }

  async getBlockTransactions(blockHash) {
    try {
      const result = await this.call('getblock', [blockHash]);
      return result.tx;
    } catch (err) {
      console.error('❌ Error al consultar bloque:', err.message);
      throw err;
    }
  }

  async waitTransaction(txid, N = 1, pollInterval = 1000) {

    return new Promise(async (resolve, reject) => {
      const poll = async () => {
        try {
          const currentBlockHash = await this.getLastBlockHash();
          const currentBlock = await this.getBlock(currentBlockHash);
          const currentHeight = currentBlock.height;

          console.log("Verificando transacción...", txid);
          const tx = await this.call('getrawtransaction', [txid, true]);

          if (!tx.blockhash) {
            return setTimeout(poll, pollInterval);
          }

          const txHeight = await this.getBlock(tx.blockhash).then(block => block.height);
          const confirmations = currentHeight - txHeight + 1;

          console.log(`Transacción en bloque ${txHeight}`);
          console.log(`Altura actual: ${currentHeight}`);
          console.log(`Confirmaciones: ${confirmations} / ${N}`);

          if (confirmations >= N) {
            resolve({ txid, confirmations, tx });
          } else {
            setTimeout(poll, pollInterval);
          }
        } catch (err) {
          reject(err);
        }
      };

      poll();
    });
  }

  async getassetdetailsbyname(name) {
    try {
      const result = await this.call('getassetdetailsbyname', [name]);
      return result;
    } catch (err) {
      console.error('❌ Error al consultar asset:', err.message);
      throw err;
    }
  }

  async getassetdetailsbyid(assetId) {
    try {
      const result = await this.call('getassetdetailsbyid', [assetId]);
      return result;
    } catch (err) {
      console.error('❌ Error al consultar asset:', err.message);
      throw err;
    }
  }

  async listaddressesbyasset(assetName) {
    try {
      const result = await this.call('listaddressesbyasset', [assetName]);
      return result;
    } catch (err) {
      console.error('❌ Error al consultar asset:', err.message);
      throw err;
    }
  }

  //listassetbalancesbyaddress
  async listassetbalancesbyaddress(address) {
    try {
      const result = await this.call('listassetbalancesbyaddress', [address]);
      return result;
    } catch (err) {
      console.error('❌ Error al consultar balances de asset por dirección:', err.message);
      throw err;
    }
  }

  /**
   * Crea un asset en la blockchain de Raptoreum
   * 
   * @param {Object} params - Objeto con los metadatos del asset
   * @param {string} params.name - Nombre del asset
   * @param {boolean} params.updatable - if true this asset can be modify using reissue process
   * @param {boolean} params.is_root - if this asset is root
   * @param {boolean} params.root_name - the root asset name for this sub asset
   * @param {boolean} params.is_unique - if true this is asset is unique it has an identity per token
   * @param {number} params.decimalpoint - [0 to 8] has to be 0 if is_unique is true
   * @param {string} params.referenceHash - hash of the underlying physical or digital assets, IPFS hash can be used here.
   * @param {number} params.maxMintCount - number of times this asset can be mint
   * @param {number} params.type - distribution type manual=0, coinbase=1, address=2, schedule=3
   * @param {string} params.targetAddress - address to be issued to when asset issue transaction is created.
   * @param {number} params.issueFrequency - mint specific amount of token every x blocks
   * @param {number} params.amount - amount to distribute each time if type is not manual.
   * @param {string} params.ownerAddress - address that this asset is owned by. Only key holder of this address will be able to mint new tokens
   */
  /* Antiguo método create_Asset, ahora obsoleto
  async create_Asset({
    name,
    updatable = false,
    is_root = true,
    root_name = '',
    is_unique = true,
    decimalpoint = 0,
    referenceHash = '',
    maxMintCount = 1,
    type = 0,
    issueFrequency = 0,
    amount = 1
  }, nodeWalletAddress, customerAddress) {
    // Validación básica
    if (!name || is_root == null || !nodeWalletAddress || !customerAddress) {
      throw new Error("Faltan parámetros obligatorios: name, ownerAddress, amount");
    }

    const ownerAddress = nodeWalletAddress;
    const targetAddress = nodeWalletAddress;

    const assetMetadata = {
      name,
      updatable,
      is_root,
      root_name,
      is_unique,
      decimalpoint,
      referenceHash,
      maxMintCount,
      type,
      targetAddress,
      issueFrequency,
      amount,
      ownerAddress
    };

    try {

      console.log(`🔧 Creando asset '${name}' con los siguientes metadatos:`, assetMetadata);
      const createResult = await this.call('createasset', [assetMetadata]);
      const assetTxid = createResult.txid;

      (async () => {
        try {

          console.log("Esperando confirmación de la transacción de creación del asset...");
          await this.waitTransaction(assetTxid, 1);
          console.log(`✅ Asset '${name}' creado con éxito: TXID ${assetTxid}`);

          // Mint el asset
          const mintResult = await this.call('mintasset', [assetTxid]);
          const mintTxid = mintResult.txid;

          console.log("Esperando confirmación de la transacción de mint del asset...");
          await this.waitTransaction(mintTxid, 1);
          console.log(`✅ Asset '${name}' minteado con éxito: TXID ${mintTxid}`);

          // Obtener assetID
          const assetInfo = await this.call('getassetdetailsbyname', [name]);
          const assetId = assetInfo.Asset_id;
          console.log(`Asset ID: ${assetId}`);

          // Enviar el asset al cliente
          const sendResult = await this.call('sendasset', [assetId, 1, customerAddress]);
          const sendTxid = sendResult.txid;

          console.log("Esperando confirmación de la transacción de envío del asset...");
          await this.waitTransaction(sendTxid, 1);
          console.log(`✅ Asset '${name}' enviado con éxito a ${customerAddress}: TXID ${sendTxid}`);

        } catch (bgErr) {
          console.error(`❌ Error en el proceso de fondo para asset con TXID de creación ${assetTxid} (nombre: ${name}):`, bgErr.message);
        }
      })();

      return {
        assetTxid
      };

    } catch (err) {
      console.error('❌ Error al crear el asset:', err.message);
      throw err;
    }
  }
  */

  /**
   * Initiates the creation of an asset on the blockchain.
   * This only submits the 'createasset' transaction.
   *
   * @param {Object} assetMetadata - Metadata for the asset to be created.
   * @returns {Promise<string>} The transaction ID of the asset creation.
   */
  async initiateAssetCreation(assetMetadata) {
    if (!assetMetadata || !assetMetadata.name || !assetMetadata.ownerAddress || !assetMetadata.targetAddress) {
      throw new Error("Asset metadata must include name, ownerAddress, and targetAddress.");
    }
    try {
      console.log(`🔧 Initiating asset creation with metadata:`, assetMetadata);
      const createResult = await this.call('createasset', [assetMetadata]);
      return createResult.txid;
    } catch (err) {
      console.error('❌ Error initiating asset creation:', err.message);
      throw err;
    }
  }

  /**
   * Mints a previously defined asset.
   *
   * @param {string} assetIdentifier - The name or creation TXID of the asset to mint.
   * @returns {Promise<string>} The transaction ID of the minting operation.
   */
  async mintCreatedAsset(assetIdentifier) {
    if (!assetIdentifier) {
      throw new Error("Asset identifier (name or creation TXID) is required for minting.");
    }
    try {
      console.log(`⛏️ Minting asset with identifier: ${assetIdentifier}`);
      const mintResult = await this.call('mintasset', [assetIdentifier]);
      return mintResult.txid;
    } catch (err) {
      console.error('❌ Error minting asset:', err.message);
      throw err;
    }
  }

  /**
   * Sends a minted asset to a specified address.
   *
   * @param {string} numericalAssetId - The numerical ID of the asset (from getassetdetailsbyname).
   * @param {number} amount - The amount of the asset to send (e.g., 1 for an NFT).
   * @param {string} customerAddress - The recipient's address.
   * @returns {Promise<string>} The transaction ID of the send operation.
   */
  async transferMintedAsset(numericalAssetId, amount, customerAddress) {
    if (!numericalAssetId || amount == null || !customerAddress) {
      throw new Error("numericalAssetId, amount, and customerAddress are required for sending an asset.");
    }
    try {
      console.log(`➡️ Sending asset ${numericalAssetId} (amount: ${amount}) to ${customerAddress}`);
      const sendResult = await this.call('sendasset', [numericalAssetId, amount, customerAddress]);
      return sendResult.txid;
    } catch (err) {
      console.error('❌ Error sending asset:', err.message);
      throw err;
    }
  }



  /**
 * Envía un asset (incluidos NFT) desde una dirección a otra.
 *
 * @param {string} fromAddress   Dirección fuente.
 * @param {string} toAddress     Dirección destino.
 * @param {string} privateKeyWIF Clave privada de la fuente en WIF.
 * @param {string} assetId       ID del asset a transferir.
 * @param {number} amountToSend  Cantidad del asset (p. ej. 1 para un NFT).
 * @param {number} [uniqueId]    uniqueid del NFT (≥ 0) – opcional.
 * @param {number} [fee=10000]   Fee en satoshis (RTM).
 *
 * @returns {Promise<string>}    TXID, si la transacción se envía con éxito.
 */
  async sendAssetTransaction(
    fromAddress, toAddress, wif,
    assetTicker, uniqueId = undefined, fee = 10_000
  ) {
    /* 1. UTXO con el asset */
    const byAsset = await this.call('getaddressutxos',
      [{ addresses: [fromAddress], asset: assetTicker }]);
    const assetUtxo = Object.values(byAsset).flat()[0];
    if (!assetUtxo) throw new Error(`Sin UTXO para ${assetTicker}`);

    const assetHex = assetUtxo.assetId;
    const assetKey =
      uniqueId !== undefined ? `${assetHex}#${uniqueId}` : assetHex;

    /* 2. Inputs RTM para la fee */
    const all = await this.call('getaddressutxos',
      [{ addresses: [fromAddress] }]);
    const inputs = [{ txid: assetUtxo.txid, vout: assetUtxo.outputIndex }];
    let rtmIn = 0;                    // ¡empieza en cero!
    const feeUtxos = [];

    for (const u of all) {
      if (!u.assetId && u.txid !== assetUtxo.txid) {
        inputs.push({ txid: u.txid, vout: u.outputIndex });
        feeUtxos.push(u);
        rtmIn += u.satoshis;
        if (rtmIn >= fee + 1000) break;    // fee + polvo
      }
    }
    if (rtmIn < fee + 1000)
      throw new Error(`RTM insuficiente: faltan ${fee + 1000 - rtmIn} sats`)

    /* 3. Outputs — formato ARRAY, una clave por objeto */
    const DUST = 1000;                           // 1000 sats = 0.00001 RTM
    const outputs = [
      {
        [toAddress]: {                     // <- clave = dirección
          assetid: assetHex,
          ...(uniqueId !== undefined ? { uniqueid: uniqueId } : {}),
          amount: 1                       // NFT ⇒ 1
        }
      }
    ];

    // añadir cambio (si procede)
    if (rtmIn - fee > 1000) {             // 1000 sats ≈ 0,00001 RTM
      outputs.push({ [fromAddress]: (rtmIn - fee) / 1e8 });
    }


    /* 4. Crear y firmar */
    const raw = await this.call('createrawtransaction', [inputs, outputs]);

    const prevTxs = [assetUtxo, ...feeUtxos].map(u => ({
      txid: u.txid, vout: u.outputIndex,
      scriptPubKey: u.script, amount: u.satoshis / 1e8
    }));

    const signed = await this.call('signrawtransactionwithkey',
      [raw, [wif], prevTxs]);
    if (!signed.complete)
      throw new Error(`Firma incompleta: ${JSON.stringify(signed.errors)}`);

    /* 5. Enviar (bypasslimits opcional) */
    return await this.call('sendrawtransaction',
      [signed.hex, 0.1, false, true]);
  }




}







