import '@dialectlabs/blinks/index.css';
import { setupTwitterObserver } from '@dialectlabs/blinks/ext/twitter';
import { ActionConfig, BlockchainIds } from '@dialectlabs/blinks';
import browser from 'webextension-polyfill';

// Adapter function to configure wallet actions
const adapter = (wallet: string) =>
  new ActionConfig(import.meta.env.VITE_RPC_URL, {
    signTransaction: (tx: string) =>
      browser.runtime.sendMessage({
        type: 'sign_transaction',
        wallet,
        payload: {
          txData: tx,
        },
      }),
    connect: () =>
      browser.runtime.sendMessage({
        wallet,
        type: 'connect',
      }),
    metadata: {
      supportedBlockchainIds: [BlockchainIds.SOLANA_MAINNET],
    },
  });

// Function to initialize the Twitter observer
async function initTwitterObserver() {
  try {
    // Send message to get the selected wallet, and await the response
    const wallet = await browser.runtime.sendMessage({ type: 'getSelectedWallet' });
    
    if (wallet) {
      setupTwitterObserver(adapter(wallet as string)); // Typecast the wallet as a string for TypeScript
    }
  } catch (error) {
    console.error('Error getting selected wallet:', error);
  }
}

// Initialize the observer
initTwitterObserver();
