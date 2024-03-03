import { LiveFeedQueriesType } from '@live-feed/api/feed/types/liveFeedQueries.type';

import { Injectable } from '@nestjs/common';
import { FixtureType, LiveFeedType } from '../types/liveFeed.type';
import {
  LiveResolvedType,
  ResolvedArrayType,
} from '../types/liveResolved.type';

@Injectable()
export class MongooseQueriesLiveFeed {
  public async insertFeedQueries(feed: LiveFeedType) {
    const ids = [];
    const queries = feed.map((obj: FixtureType) => {
      ids.push(obj.fixtureId);
      const baseUpdate = {
        $setOnInsert: {
          _id: obj.fixtureId,
          source: obj.source,
          type: obj.type,
          competitionString: obj.competitionString,
          region: obj.region,
          regionId: obj.regionId,
          sport: obj.sport,
          sportId: obj.sportId,
          competition: obj.competition,
          competitionId: obj.competitionId,
          fixtureTimestamp: obj.fixtureTimestamp,
          competitor1Id: obj.competitor1Id,
          competitor1: obj.competitor1,
          competitor2Id: obj.competitor2Id,
          competitor2: obj.competitor2,
        },
        $set: {
          scoreboard: obj.scoreboard,
        },
      };

      // Conditionally add "games" if obj.games is not empty, we dont want to insert empty games
      if (obj.games.length > 0) {
        baseUpdate.$set['games'] = obj.games;
      }
      return {
        updateOne: {
          filter: {
            _id: obj.fixtureId,
            updatedAt: { $gte: obj.sentTime },
          },
          update: baseUpdate,
          upsert: true,
        },
      };
    });
    return { queries, ids };
  }

  public async insertResolvedQuery(
    resolvedData: ResolvedArrayType,
  ): Promise<LiveFeedQueriesType> {
    const toResolveTickets = [];
    const queries = resolvedData.map((obj: LiveResolvedType) => ({
      updateOne: {
        filter: {
          _id: obj.fixtureId,
        },
        update: {
          $setOnInsert: {
            _id: obj.fixtureId,
          },
          $set: {
            status:
              obj.status !== 'Ended'
                ? obj.status
                : toResolveTickets.push(obj.fixtureId) && obj.status,
          },
          $addToSet: {
            //check if already exist that object
            resolved: {
              $each: obj.resolved,
            },
          },
        },
        upsert: true,
      },
    }));
    return { queries, toResolveTickets };
  }

  public async insertDlqResolvedQuery(resolvedDlq: any) {
    const queries = resolvedDlq.map((obj: any) => ({
      updateOne: {
        filter: {
          _id: obj.fixtureId,
        },
        update: {
          $setOnInsert: {
            _id: obj.fixtureId,
          },
          $set: {
            status: obj.status,
          },
          $push: {
            resolved: {
              $each: obj.resolved,
            },
          },
        },
        upsert: true,
      },
    }));
    return queries;
  }
}