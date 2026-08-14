export type MarketCategory =
  | "Politics"
  | "Economy"
  | "Sports"
  | "Crypto"
  | "Technology"
  | "Science"
  | "Culture"
  | "World"
  | "Other";

export type SourcedMarket = {
  id: string;
  slug: string;
  question: string;
  description: string;
  category: MarketCategory;
  endAt: string;
  sourceUrl: string;
};

export type MarketFeed = {
  markets: SourcedMarket[];
  fetchedAt: string;
  stale: boolean;
  source: "Polymarket";
};

export type Viewer = {
  userId: string;
  displayName: string;
  email: string;
} | null;
