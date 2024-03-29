export type GamesType = {
  OddsTypeName: number;
  quote: number;
  sourceGameId: number;
  locked: boolean;
  type: string;
};

export type FixtureType = {
  fixtureId: number;
  source: string;
  type: string;
  competitionString: string;
  region: string;
  regionId: number;
  sport: string;
  sportId: number;
  competition: string;
  competitionId: number;
  fixtureTimestamp: number;
  competitor1: string;
  competitor1Id: string;
  competitor2: string;
  competitor2Id: string;
  scoreboard?: object;
  games?: GamesType[];
  sentTime: Date;
};

export type LiveFeedType = FixtureType[];
