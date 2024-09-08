import base58 from 'bs58';
import { Buffer } from 'buffer';
import browser from 'webextension-polyfill';

browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const message = msg as { type: string; wallet?: string; payload?: { message?: string; txData?: string } };
  
  if (!sender.tab || !sender.tab.id) {
    return undefined; // Correct return type
  }

  if (message.type === 'getSelectedWallet') {
    browser.storage.local.get('selectedWallet').then((storage) => {
      sendResponse(storage.selectedWallet);
    });
    return true; // Return true for async handling
  }

  if (!message.wallet) {
    return undefined; // Return undefined instead of false
  }

  handleWalletCommunication(sender.tab.id, message.type, message.wallet, message.payload || {})
    .then((res) => sendResponse(res))
    .catch((err) => console.error('Error handling message', err));

  return true;
});

async function handleWalletCommunication(
  tabId: number,
  type: string,
  wallet: string,
  payload: { message?: string; txData?: string }
) {
  if (type === 'connect') {
    const res = await browser.tabs.executeScript(tabId, {
      code: `(${wallet === 'solflare'
        ? async () => {
            const provider = (window as any).solflare;  // Explicit type assertion for window.solflare
            const res = await provider.connect();
            return provider.publicKey.toString();
          }
        : async () => {
            const provider = (window as any).solana;    // Explicit type assertion for window.solana
            const res = await provider.connect();
            return res.publicKey.toString();
          }}())`
    });

    return res[0];
  } else if (type === 'sign_message') {
    const res = await browser.tabs.executeScript(tabId, {
      code: `(${async function(message: string, wallet: string) {
        const provider = wallet === 'solflare'
          ? (window as any).solflare  // Type assertion
          : (window as any).solana;   // Type assertion
        const textToSign = new TextEncoder().encode(message);
        const result = await provider.signMessage(textToSign);
        return result;
      }}("${payload.message}", "${wallet}"))`
    });

    return res[0];
  } else if (type === 'sign_transaction') {
    const txData = payload.txData ? base58.encode(Buffer.from(payload.txData, 'base64')) : '';

    const res = await browser.tabs.executeScript(tabId, {
      code: `(${async function(transaction: string, wallet: string) {
        try {
          const result = wallet === 'solflare'
            ? await (window as any).solflare.request({  // Type assertion
                method: 'signAndSendTransaction',
                params: { transaction },
              })
            : await (window as any).solana.request({  // Type assertion
                method: 'signAndSendTransaction',
                params: { message: transaction },
              });
          return result;
        } catch (e: any) {
          return { error: e.message ?? 'Unknown error' };
        }
      }}("${txData}", "${wallet}"))`
    });

    return res[0];
  }
}
