import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";

export async function sendSol(wallet: WalletContextState, to: string, amountSol: number) {
  if (!wallet.publicKey || !wallet.signAndSendTransaction) {
    throw new Error("Wallet not connected");
  }

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: new PublicKey(to),
      lamports: Math.round(amountSol * 1e9),
    })
  );

  const { signature } = await wallet.signAndSendTransaction(tx);
  return signature;
}