export function normalizeWalletAddress(address: string): `0x${string}` {
  const normalized = address.trim().toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(normalized)) {
    throw new Error("Enter a valid EVM wallet address.");
  }
  return normalized as `0x${string}`;
}
