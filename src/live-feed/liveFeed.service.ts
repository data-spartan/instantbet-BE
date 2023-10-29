import { HttpException, Injectable } from '@nestjs/common';
import {
  ClientKafka,
  KafkaRetriableException,
  RpcException,
} from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model, MongooseError } from 'mongoose';
import { type } from 'os';
import { Exception } from 'sass';
import {
  LiveFeed,
  LiveFeedDocument,
} from 'src/database/schemas/liveFeed.schema';
import {
  LiveFeedResolved,
  LiveFeedResolvedDocument,
} from 'src/database/schemas/liveFeedResolved.schema';
import { KafkaExceptionFilter } from 'src/exception-filters/kafkaException.filter';

@Injectable()
export class LiveFeedService {
  constructor(
    @InjectModel(LiveFeed.name)
    private readonly feedRepo: Model<LiveFeedDocument>,
    @InjectModel(LiveFeedResolved.name)
    private readonly resolvedRepo: Model<LiveFeedResolvedDocument>,
  ) {}
  public async insertFeed(feed: any, consErrCount: number) {
    const session = await this.feedRepo.startSession();
    const updateArr = feed.map((obj) => ({
      updateOne: {
        filter: {
          _id: obj.fixtureId,
          updatedAt: { $lte: obj.sentTime },
          //update only latest sent fixtures
          // (can happen that producer send 2 exact fixtures to diff partitions), keep only latest
          //or consumer crashed and and didnt commit offset so it pulls multiple messages(could me multiple fixtures with same id, but sent in diff time )
        },

        update: {
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
            games: obj.games,
            timeSent: obj.time,
          },
        },

        upsert: true,
        // setDefaultsOnInsert: true,
      },
    }));

    try {
      session.startTransaction();
      await this.feedRepo.bulkWrite(updateArr);
      await session.commitTransaction();
      // await session.endSession();
      return true;
    } catch (e) {
      await session.abortTransaction();
      consErrCount['count'] += 1;
      throw new RpcException(`STEFAN CAR ${e}`);
    } finally {
      await session.endSession();
    }
  }

  public async insertResolved(resolved: any, consErrCount) {
    const session = await this.resolvedRepo.startSession();
    const toResolveTickets = [];
    const updateArr = resolved.map((obj) => ({
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
          $push: {
            resolved: {
              $each: obj.resolved,
            },
          },
        },
        upsert: true,
      },
    }));
    //must use tranaction with bulkwrite bcs of dupl key error
    try {
      session.startTransaction();
      await this.resolvedRepo.bulkWrite(updateArr);
      await session.commitTransaction();
      return toResolveTickets;
    } catch (e) {
      await session.abortTransaction();
      consErrCount['count'] += 1;
      throw new RpcException(`STEFAN CAR ${e}`);
    } finally {
      await session.endSession();
    }
  }

  public async insertDlqResolved(resolved: any, consErrCount) {
    const session = await this.feedRepo.startSession();
    const updateArr = resolved.map((obj) => ({
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
    //must use tranaction with bulkwrite bcs of dupl key error
    try {
      session.startTransaction();
      await this.resolvedRepo.bulkWrite(updateArr);
      await session.commitTransaction();
    } catch (e) {
      await session.abortTransaction();
      consErrCount['count'] += 1;
      throw new RpcException(`STEFAN CAR ${e}`);
    } finally {
      await session.endSession();
    }
  }

  public async resolveTickets(resolvedId: number[]) {
    // this.resolvedRepo
  }
}
