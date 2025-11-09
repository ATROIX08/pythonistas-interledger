// src/node/02_create_incoming.js
import 'dotenv/config';
import { createAuthenticatedClient } from '@interledger/open-payments';

const WALLET_URL = process.env.WALLET_URL;
const KEY_ID = process.env.KEY_ID;
const PRIVATE_KEY_PATH = process.env.PRIVATE_KEY_PATH;

// IMPORTANTE: usa este nombre para el token (el SDK y los snippets lo usan así)
const INCOMING_PAYMENT_ACCESS_TOKEN = process.env.INCOMING_PAYMENT_ACCESS_TOKEN;

if (!INCOMING_PAYMENT_ACCESS_TOKEN) {
  throw new Error('Falta INCOMING_PAYMENT_ACCESS_TOKEN en tu entorno (.env o $env:...)');
}

const client = await createAuthenticatedClient({
  walletAddressUrl: WALLET_URL,
  privateKey: PRIVATE_KEY_PATH,
  keyId: KEY_ID,
});

const wallet = await client.walletAddress.get({ url: WALLET_URL });

// OJO: el token va en el PRIMER argumento como accessToken
const ip = await client.incomingPayment.create(
  {
    url: wallet.resourceServer,                  // el RS viene del discovery
    accessToken: INCOMING_PAYMENT_ACCESS_TOKEN,  // AQUÍ va el token
  },
  {
    walletAddress: wallet.id, // tu payment pointer / wallet address
    incomingAmount: {
      value: '2500',                  // 25.00 (assetScale 2)
      assetCode: wallet.assetCode,    // "EUR" en tu caso de prueba
      assetScale: wallet.assetScale,  // 2
    },
    metadata: { externalRef: 'DEMO-INV-001' },
    // opcional: expiresAt en ISO si quieres caducidad
    // expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
  }
);

console.log('INCOMING_PAYMENT_ID=', ip.id);
console.log('RECEIVE_METHODS=', ip.methods);
