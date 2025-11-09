import 'dotenv/config';
import { createAuthenticatedClient, isPendingGrant } from '@interledger/open-payments';

const WALLET = process.env.WALLET_URL;
const KEY_ID = process.env.KEY_ID;
const PRIV = process.env.PRIVATE_KEY_PATH;

const client = await createAuthenticatedClient({
  walletAddressUrl: WALLET,
  privateKey: PRIV,
  keyId: KEY_ID,
});

const wallet = await client.walletAddress.get({ url: WALLET });

const grant = await client.grant.request(
  { url: wallet.authServer },
  {
    access_token: {
      access: [
        { type: 'incoming-payment', actions: ['list','read','read-all','complete','create'] }
      ]
    }
  }
);

if (isPendingGrant(grant)) {
  throw new Error('Expected non-interactive grant for incoming-payment');
}

console.log('INCOMING_TOKEN=', grant.access_token.value);
console.log('INCOMING_MANAGE=', grant.access_token.manage);
console.log('RESOURCE_SERVER=', wallet.resourceServer);
console.log('WALLET_ID=', wallet.id);
