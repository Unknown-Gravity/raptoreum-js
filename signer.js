import bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';

const ECPair = ECPairFactory(ecc);




const raptoreumRegtestNetwork = {
  messagePrefix: '\x18Raptoreum Signed Message:\n', // Estándar de bitcoinjs-lib
  bech32: 'rrtm',    // de: CRegTestParams -> bech32_hrp = "rrtm";
  bip32: {
    public: 0x043587cf, // de: CRegTestParams -> bip32.nExtPubKeyPrefix
    private: 0x04358394, // de: CRegTestParams -> bip32.nExtSecretKeyPrefix
  },
  pubKeyHash: 0x7a, // de: CRegTestParams -> base58Prefixes[PUBKEY_ADDRESS] = 122 (0x7a) -> 'r'
  scriptHash: 0xbe, // de: CRegTestParams -> base58Prefixes[SCRIPT_ADDRESS] = 190 (0xbe) -> '2'
  wif: 0xf0,       // de: CRegTestParams -> base58Prefixes[SECRET_KEY] = 240 (0xf0)
};


const raptoreumTestnetNetwork = {
  messagePrefix: '\x18Raptoreum Signed Message:\n',  // igual en todas las redes
  bech32: 'trtm',                                    // hrp de testnet
  bip32: {
    public:  0x043587cf,    // tpub
    private: 0x04358394,    // tprv
  },
  pubKeyHash: 0x7b,   // 123 decimal → direcciones P2PKH empiezan con “r”
  scriptHash: 0x13,   // 19 decimal  → P2SH empiezan con “8”/“9”
  wif:        0xef,   // 239 decimal → claves privadas WIF empiezan con “c” o “9”
};

const raptoreumMainnetNetwork = {
  messagePrefix: '\x18Raptoreum Signed Message:\n',
  bech32: 'rtm',  // si es que se usa bech32 en algún punto

  // Mantienes BIP32 como en testnet (tpub/tprv) – aunque no es lo típico para mainnet
  bip32: {
    public:  0x043587cf, // tpub
    private: 0x04358394, // tprv
  },

  pubKeyHash: 0x3c, // 60 → direcciones P2PKH comienzan con 'r'
  scriptHash: 0x10, // 16 → direcciones P2SH comienzan con '7'
  wif:        0x80, // 128 → claves privadas WIF comienzan con '5', 'K', 'L'
};





const network = raptoreumMainnetNetwork; // Usar la red personalizada

export function generateKeyPair() {
  const keyPair = ECPair.makeRandom({ network });
  
  const { address } = bitcoin.payments.p2pkh({
    pubkey: keyPair.publicKey,
    network, 
  });
  const wif = keyPair.toWIF();
  return { address, wif };
}



export function getAddressFromWIF(wif) {
  const keyPair = ECPair.fromWIF(wif, network);
  const { address } = bitcoin.payments.p2pkh({
    pubkey: keyPair.publicKey,
    network,
  });
  return address;
}

export default raptoreumMainnetNetwork

