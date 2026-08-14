export const CREDENCE_CONTRACT_ADDRESS =
  "0x2d93e493144A0e0f1dc6E4803e15c21EAb219072" as const;
export const CREDENCE_DEPLOYMENT_TRANSACTION =
  "0x09214ecfd8e0e19135a55d8cfd477361196ebec7acbe76e1a11f877e1befa36f" as const;
export const CREDENCE_V4_CONTRACT_ADDRESS =
  "0xe9Cc0C657a157fEce1CE02657819A1d1a139661E" as const;
export const CREDENCE_V4_DEPLOYMENT_TRANSACTION =
  "0x140752c54c772e4fcd4a258c30cd591bf665691f804026c7f40241e17225293d" as const;
export const CREDENCE_V3_CONTRACT_ADDRESS =
  "0xc93f6BcfF7Dd1c6012D9Cb9908682a70E044F742" as const;
export const CREDENCE_V3_DEPLOYMENT_TRANSACTION =
  "0xae5d4da56eb1a1b473348a59c80643ec237984b6addcc9c4f3074649635cd678" as const;
export const CREDENCE_V2_CONTRACT_ADDRESS =
  "0xBFB5C69e93217f3f6AF944225606b9BC60923277" as const;
export const CREDENCE_V2_DEPLOYMENT_TRANSACTION =
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
