export const CREDREP_CONTRACT_ADDRESS =
  "0xEB16133048b14a38A6C870409625bbFd0dE08780" as const;
export const CREDREP_DEPLOYMENT_TRANSACTION =
  "0xbbac18675bfc8aaeb3ed9d621297c7faa7c77a7b2ac57d7e0553dcb065a6ffb4" as const;
export const STUDIONET_EXPLORER_URL =
  "https://explorer-studio.genlayer.com/";
export const STUDIONET_CHAIN_ID = 61999;

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
