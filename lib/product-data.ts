export type ClaimStatus = "OPEN" | "RESOLVING" | "WON" | "LOST" | "VOID";
export type ClaimOutcome = "TRUE" | "FALSE" | "VOID";

export type Claim = {
  id: string;
  contractClaimId?: string;
  transactionHash?: string;
  ownerAddress?: string;
  ownerId: string;
  ownerName: string;
  ownerHandle: string;
  statement: string;
  category: string;
  status: ClaimStatus;
  stake: number;
  resolutionAt: string;
  sourceLabel: string;
  sourceUrl: string;
  rules: string;
  createdAt: string;
  outcome: ClaimOutcome | null;
};

export type ClaimInput = {
  statement: string;
  category: string;
  stake: number;
  resolutionAt: string;
  sourceLabel: string;
  sourceUrl: string;
  rules: string;
};

export type Profile = {
  userId: string;
  displayName: string;
  handle: string;
  reputation: number;
  availableReputation: number;
  reputationAtRisk: number;
  totalClaims: number;
  resolvedClaims: number;
  correctClaims: number;
  rank: number | null;
};

export type Leader = {
  userId: string;
  displayName: string;
  handle: string;
  reputation: number;
  atRisk: number;
  category: string;
  accuracy: number;
  resolved: number;
  delta: number;
};

export type AppState = {
  profile: Profile;
  claims: Claim[];
  leaderboard: Leader[];
  ledgerMode: "preview" | "indexed" | "contract";
};

export const SEED_CLAIMS: Claim[] = [
  {
    id: "lena-fed-september-cut",
    ownerId: "seed-lena",
    ownerName: "Lena Ortiz",
    ownerHandle: "@macrobrief",
    statement:
      "The Federal Reserve will cut its target range at the September meeting.",
    category: "Economy",
    status: "OPEN",
    stake: 1,
    resolutionAt: "2026-09-17T21:00:00.000Z",
    sourceLabel: "Federal Reserve statement",
    sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    rules:
      "TRUE requires either bound of the announced federal funds target range to be lower than immediately before the September meeting.",
    createdAt: "2026-08-13T09:15:00.000Z",
    outcome: null,
  },
  {
    id: "kwame-united-opener",
    ownerId: "seed-kwame",
    ownerName: "Kwame A.",
    ownerHandle: "@pitchoracle",
    statement: "Manchester United will win their opening league match.",
    category: "Football",
    status: "OPEN",
    stake: 4,
    resolutionAt: "2026-08-16T23:00:00.000Z",
    sourceLabel: "Premier League match report",
    sourceUrl: "https://www.premierleague.com/",
    rules:
      "Regulation time only. A draw or loss resolves FALSE. A match not completed within seven days resolves VOID.",
    createdAt: "2026-08-13T08:42:00.000Z",
    outcome: null,
  },
  {
    id: "maya-starship-october",
    ownerId: "seed-maya",
    ownerName: "Maya Chen",
    ownerHandle: "@mayamaps",
    statement: "Starship will launch before October 1, 2026.",
    category: "Technology",
    status: "OPEN",
    stake: 3,
    resolutionAt: "2026-10-01T23:59:59.000Z",
    sourceLabel: "SpaceX and FAA",
    sourceUrl: "https://www.spacex.com/launches/",
    rules:
      "The integrated vehicle must leave the launch mount under its own propulsion. Static fires and scrubbed attempts do not count.",
    createdAt: "2026-08-12T19:20:00.000Z",
    outcome: null,
  },
  {
    id: "omi-eth-august-close",
    ownerId: "seed-omi",
    ownerName: "Omi Rao",
    ownerHandle: "@chainweather",
    statement: "ETH will close above $4,500 on August 31, 2026.",
    category: "Crypto",
    status: "OPEN",
    stake: 5,
    resolutionAt: "2026-09-01T00:30:00.000Z",
    sourceLabel: "Coinbase ETH-USD close",
    sourceUrl: "https://www.coinbase.com/price/ethereum",
    rules:
      "Use the Coinbase ETH-USD daily candle closing at 00:00 UTC on September 1. Exactly $4,500 resolves FALSE.",
    createdAt: "2026-08-12T16:05:00.000Z",
    outcome: null,
  },
  {
    id: "maya-flagship-model-q3",
    ownerId: "seed-maya",
    ownerName: "Maya Chen",
    ownerHandle: "@mayamaps",
    statement: "A new flagship AI model will be publicly released before Q3 ends.",
    category: "Technology",
    status: "OPEN",
    stake: 2,
    resolutionAt: "2026-10-01T12:00:00.000Z",
    sourceLabel: "Official model release pages",
    sourceUrl: "https://openai.com/news/",
    rules:
      "The model must be generally available through a public product or API. Private previews and rumors do not count.",
    createdAt: "2026-08-11T14:40:00.000Z",
    outcome: null,
  },
  {
    id: "kwame-arsenal-two-goals",
    ownerId: "seed-kwame",
    ownerName: "Kwame A.",
    ownerHandle: "@pitchoracle",
    statement: "Arsenal will score at least two goals in their next match.",
    category: "Football",
    status: "OPEN",
    stake: 3,
    resolutionAt: "2026-08-17T23:00:00.000Z",
    sourceLabel: "Official competition report",
    sourceUrl: "https://www.arsenal.com/fixtures",
    rules:
      "Count regulation-time goals only. Extra time and shootout goals are excluded. A postponement beyond seven days resolves VOID.",
    createdAt: "2026-08-10T11:25:00.000Z",
    outcome: null,
  },
];

export const SEED_LEADERS: Leader[] = [
  {
    userId: "seed-maya",
    displayName: "Maya Chen",
    handle: "@mayamaps",
    reputation: 134,
    atRisk: 5,
    category: "Technology",
    accuracy: 74,
    resolved: 46,
    delta: 34,
  },
  {
    userId: "seed-kwame",
    displayName: "Kwame A.",
    handle: "@pitchoracle",
    reputation: 127,
    atRisk: 7,
    category: "Football",
    accuracy: 71,
    resolved: 63,
    delta: 27,
  },
  {
    userId: "seed-lena",
    displayName: "Lena Ortiz",
    handle: "@macrobrief",
    reputation: 119,
    atRisk: 1,
    category: "Economy",
    accuracy: 69,
    resolved: 38,
    delta: 19,
  },
  {
    userId: "seed-omi",
    displayName: "Omi Rao",
    handle: "@chainweather",
    reputation: 112,
    atRisk: 5,
    category: "Crypto",
    accuracy: 67,
    resolved: 31,
    delta: 12,
  },
];

export function createPreviewState(
  user?: { userId: string; displayName: string; email: string } | null,
): AppState {
  const fallbackName = user?.displayName?.split(" ")[0] || "Forecaster";
  const handleBase = user?.email?.split("@")[0] || "newsignal";
  return {
    profile: {
      userId: user?.userId || "local-preview",
      displayName: fallbackName,
      handle: `@${handleBase.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 24)}`,
      reputation: 100,
      availableReputation: 100,
      reputationAtRisk: 0,
      totalClaims: 0,
      resolvedClaims: 0,
      correctClaims: 0,
      rank: null,
    },
    claims: SEED_CLAIMS,
    leaderboard: SEED_LEADERS,
    ledgerMode: "preview",
  };
}
