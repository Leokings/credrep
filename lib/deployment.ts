export const CREDREP_CONTRACT_ADDRESS =
  "0x3Aaed2C86b91013e97221dEEa4613eA211F8810f" as const;
export const CREDREP_DEPLOYMENT_TRANSACTION =
  "0x3e13174a96e25919f7bbb41d22bd9b68064e423cd5c787f2c96a7057bdfbc8c6" as const;
export const STUDIONET_EXPLORER_URL =
  "https://explorer-studio.genlayer.com/";
export const STUDIONET_CHAIN_ID = 61999;

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
