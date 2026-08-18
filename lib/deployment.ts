export const CREDREP_CONTRACT_ADDRESS =
  "0xd86C67800071c245Bd7BED0AA8C7b34f9a45b868" as const;
export const CREDREP_DEPLOYMENT_TRANSACTION =
  "0xf3c7c4ef3f706a969c994c635191643372fe72a092f0c54ac9e19f8f37d44d83" as const;
export const STUDIONET_EXPLORER_URL =
  "https://explorer-studio.genlayer.com/";
export const STUDIONET_CHAIN_ID = 61999;

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
