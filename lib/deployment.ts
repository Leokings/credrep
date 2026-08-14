export const CREDENCE_CONTRACT_ADDRESS =
  "0xBFB5C69e93217f3f6AF944225606b9BC60923277" as const;
export const CREDENCE_DEPLOYMENT_TRANSACTION =
  "0x8baab27651e9b2075c2d682f5c299e6cd3ed2d9241c1257d74fa45cbb045dc22" as const;
export const CREDENCE_V1_CONTRACT_ADDRESS =
  "0x164868c406fe6cFB4a70F93bAE9e3246b5873D34" as const;
export const CREDENCE_V1_DEPLOYMENT_TRANSACTION =
  "0xac6a2c68c5a6e07d70d5683e30476e751558af6fd3ecf5bf95b4d95d48f27714" as const;
export const BRADBURY_EXPLORER_URL =
  "https://explorer-bradbury.genlayer.com/";
export const BRADBURY_FAUCET_URL =
  "https://testnet-faucet.genlayer.foundation/";
export const BRADBURY_CHAIN_ID = 4221;

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
