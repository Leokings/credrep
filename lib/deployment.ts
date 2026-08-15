export const CREDENCE_CONTRACT_ADDRESS =
  "0x7aD0ca207FdD300801FaD7Df67DDb8A8A1E13dBd" as const;
export const CREDENCE_DEPLOYMENT_TRANSACTION =
  "0xeb18133c1470fe956ea4c0e89cdc2e419f8ed9fe5e0959e21060ca1937577d7a" as const;
export const BRADBURY_EXPLORER_URL =
  "https://explorer-bradbury.genlayer.com/";
export const BRADBURY_FAUCET_URL =
  "https://testnet-faucet.genlayer.foundation/";
export const BRADBURY_CHAIN_ID = 4221;

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
