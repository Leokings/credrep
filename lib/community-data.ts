export type CommunityProfile = {
  rank: number;
  walletAddress: string;
  xHandle: string;
  identityStatus: string;
  reputation: number;
  availableReputation: number;
  reputationAtRisk: number;
  predictionsMade: number;
  openPredictions: number;
  resolvedPredictions: number;
  correctPredictions: number;
  accuracyBps: number;
  predictionScoreBps: number;
  indexedAt: string;
};

export type CommunityActivity = {
  walletAddress: string;
  xHandle: string;
  marketId: string;
  question: string;
  sourceUrl: string;
  prediction: string;
  confidenceBps: number;
  stake: number;
  status: string;
  scoreBps: number;
  createdAt: string;
  settledAt: string;
};

export type CommunityFeed = {
  contractAddress: string;
  indexedProfiles: number;
  leaderboard: CommunityProfile[];
  activity: CommunityActivity[];
};
