export type MarketStatus = "OPEN" | "LOCKED" | "RESOLVING" | "FINALIZED";
export type Outcome = "YES" | "NO";

export type Market = {
  id: string;
  eyebrow: string;
  question: string;
  category: string;
  status: MarketStatus;
  lockAt: string;
  resolutionAt: string;
  sourceLabel: string;
  rules: string;
  yesProbability: number;
  volume: number;
  forecasters: number;
  signal: string;
};

export type Profile = {
  userId: string;
  displayName: string;
  handle: string;
  credits: number;
  overallRating: number;
  totalForecasts: number;
  resolvedForecasts: number;
  correctForecasts: number;
  averageBrier: number | null;
  rank: number | null;
};

export type Leader = {
  userId: string;
  displayName: string;
  handle: string;
  rating: number;
  category: string;
  accuracy: number;
  resolved: number;
  delta: number;
};

export type UserForecast = {
  marketId: string;
  outcome: Outcome;
  confidence: number;
  stake: number;
  status: string;
};

export type AppState = {
  profile: Profile;
  markets: Market[];
  leaderboard: Leader[];
  userForecasts: UserForecast[];
  ledgerMode: "preview" | "indexed" | "contract";
};

export const SEED_MARKETS: Market[] = [
  {
    id: "united-next-league-win",
    eyebrow: "Football · Match market",
    question: "Will Manchester United win their next league match?",
    category: "Football",
    status: "OPEN",
    lockAt: "2026-08-15T18:30:00.000Z",
    resolutionAt: "2026-08-16T23:00:00.000Z",
    sourceLabel: "Premier League + BBC Sport",
    rules:
      "Regulation time only. A draw or loss resolves NO. An abandoned match not completed within seven days resolves VOID.",
    yesProbability: 61,
    volume: 18_420,
    forecasters: 1_284,
    signal: "+4.2% today",
  },
  {
    id: "eth-4500-august",
    eyebrow: "Crypto · Price threshold",
    question: "Will ETH close above $4,500 on August 31?",
    category: "Crypto",
    status: "OPEN",
    lockAt: "2026-08-31T20:00:00.000Z",
    resolutionAt: "2026-09-01T00:30:00.000Z",
    sourceLabel: "Coinbase ETH-USD daily close",
    rules:
      "Use the Coinbase ETH-USD candle closing at 00:00 UTC on September 1. Exactly $4,500 resolves NO.",
    yesProbability: 43,
    volume: 12_760,
    forecasters: 904,
    signal: "-1.8% today",
  },
  {
    id: "starship-before-october",
    eyebrow: "Technology · Milestone",
    question: "Will Starship launch before October 1, 2026?",
    category: "Technology",
    status: "OPEN",
    lockAt: "2026-09-29T23:00:00.000Z",
    resolutionAt: "2026-10-01T23:59:59.000Z",
    sourceLabel: "SpaceX + FAA",
    rules:
      "Launch means the integrated vehicle leaves the launch mount under its own propulsion. Static fires and scrubbed attempts do not count.",
    yesProbability: 72,
    volume: 31_905,
    forecasters: 2_118,
    signal: "+7.1% this week",
  },
  {
    id: "new-flagship-model-q3",
    eyebrow: "AI · Product launch",
    question: "Will a new flagship AI model be publicly released before Q3 ends?",
    category: "Technology",
    status: "OPEN",
    lockAt: "2026-09-28T17:00:00.000Z",
    resolutionAt: "2026-10-01T12:00:00.000Z",
    sourceLabel: "Official release pages",
    rules:
      "A model must be generally available through a public product or API. Private previews, rumors, and benchmark leaks do not count.",
    yesProbability: 54,
    volume: 9_840,
    forecasters: 711,
    signal: "High disagreement",
  },
  {
    id: "arsenal-two-goals",
    eyebrow: "Football · Goals market",
    question: "Will Arsenal score at least two goals in their next match?",
    category: "Football",
    status: "OPEN",
    lockAt: "2026-08-16T14:00:00.000Z",
    resolutionAt: "2026-08-17T23:00:00.000Z",
    sourceLabel: "Club + competition report",
    rules:
      "Count goals in regulation time only. Extra time and penalty shootout goals are excluded. Postponement beyond seven days resolves VOID.",
    yesProbability: 67,
    volume: 7_230,
    forecasters: 536,
    signal: "+2.3% today",
  },
  {
    id: "fed-rate-cut-september",
    eyebrow: "Economy · Policy decision",
    question: "Will the Federal Reserve cut its target range at the September meeting?",
    category: "Economy",
    status: "OPEN",
    lockAt: "2026-09-15T12:00:00.000Z",
    resolutionAt: "2026-09-17T21:00:00.000Z",
    sourceLabel: "Federal Reserve statement",
    rules:
      "YES requires the upper or lower bound of the announced federal funds target range to be below its level immediately before the meeting.",
    yesProbability: 38,
    volume: 22_110,
    forecasters: 1_620,
    signal: "-5.4% this week",
  },
];

export const SEED_LEADERS: Leader[] = [
  {
    userId: "seed-maya",
    displayName: "Maya Chen",
    handle: "@mayamaps",
    rating: 842,
    category: "Technology",
    accuracy: 74,
    resolved: 146,
    delta: 18,
  },
  {
    userId: "seed-kwame",
    displayName: "Kwame A.",
    handle: "@pitchoracle",
    rating: 819,
    category: "Football",
    accuracy: 71,
    resolved: 203,
    delta: 11,
  },
  {
    userId: "seed-lena",
    displayName: "Lena Ortiz",
    handle: "@macrobrief",
    rating: 804,
    category: "Economy",
    accuracy: 69,
    resolved: 188,
    delta: 7,
  },
  {
    userId: "seed-omi",
    displayName: "Omi Rao",
    handle: "@chainweather",
    rating: 786,
    category: "Crypto",
    accuracy: 67,
    resolved: 121,
    delta: -3,
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
      credits: 100,
      overallRating: 500,
      totalForecasts: 0,
      resolvedForecasts: 0,
      correctForecasts: 0,
      averageBrier: null,
      rank: null,
    },
    markets: SEED_MARKETS,
    leaderboard: SEED_LEADERS,
    userForecasts: [],
    ledgerMode: "preview",
  };
}
