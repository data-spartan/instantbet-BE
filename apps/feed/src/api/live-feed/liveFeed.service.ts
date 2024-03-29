import { MongooseService } from '@app/common/database/mongodb/mongoose-service/mongoose.service';
import { KafkaProducerService } from '@app/common/kafka/producerKafka';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { InjectModel } from '@nestjs/mongoose';
import { Producer, TopicPartitionOffsetAndMetadata } from 'kafkajs';
import { Model } from 'mongoose';
import { MongooseQueriesLiveFeed } from './queries/liveFeedService.queries';
import {
  DlqResolved,
  DlqResolvedDocument,
  LiveFeed,
  LiveFeedDocument,
  LiveFeedResolved,
  LiveFeedResolvedDocument,
} from '@app/common';
import { FixturesArrayDto } from './dto/feed.dto';
import { ResolvedFixturesDto } from './dto/resolvedFixtures.dto';

// import { liveFeedTransaction } from 'src/database/mongodb/transactions_/liveFeed.transactions';

@Injectable()
export class LiveFeedService {
  private defaultConsumerRetries;
  private defaultProducerRetries;
  private consumerErrCount;
  private producerErrCount;
  constructor(
    @InjectModel(LiveFeed.name)
    private readonly feedRepo: Model<LiveFeedDocument>,
    @InjectModel(LiveFeedResolved.name)
    private readonly resolvedRepo: Model<LiveFeedResolvedDocument>,
    @InjectModel(DlqResolved.name)
    private readonly dlqResolvedRepo: Model<DlqResolvedDocument>,
    private readonly configService: ConfigService,
    private readonly liveFeedQueries: MongooseQueriesLiveFeed,
    private readonly kafkaProducerService: KafkaProducerService,
    private readonly mongooseService: MongooseService,
  ) {
    this.defaultConsumerRetries = Number(
      this.configService.get('KAFKA_CONSUMER_DEFAULT_RETRIES'),
    );
    this.defaultProducerRetries = Number(
      this.configService.get('KAFKA_PRODUCER_DEFAULT_RETRIES'),
    );
    this.consumerErrCount = [];
    this.producerErrCount = [];
  }
  public async insertFeed(
    feed: FixturesArrayDto['fixtures'],
    topPartOff: TopicPartitionOffsetAndMetadata,
  ): Promise<number[]> {
    let errIndex: number;
    const { queries, ids } = await this.liveFeedQueries.insertFeedQueries(feed);
    const insertFeed = await this.mongooseService.bulkWrite(
      this.feedRepo,
      queries,
      this.consumerErrCount,
      topPartOff,
    );

    if (insertFeed['errIndex'] !== undefined) {
      // there is no need to retry more than defined retries or sent to dlq bcs feed is comming every 10s
      errIndex = insertFeed['errIndex'];
      if (
        this.consumerErrCount[errIndex]['count'] <= this.defaultConsumerRetries
      ) {
        console.log('IN ERROR FEED', this.consumerErrCount[errIndex]);
        throw insertFeed['error'];
      }
      //after threshold exceeded just clean consumerErrCount, bsc feed batch is comming every 10s
      //and send to slack bcs maybe there are some serious problems that need to be investigated
      console.log('SENT TO SLACK');
      this.consumerErrCount.splice(errIndex, 1);
    }
    this.consumerErrCount.splice(errIndex, 1);
    //in case when operation is succesfull and offset is about to be commited in controller,
    //so  need to remove from err count that offset
    return ids;
  }

  public async insertResolved(
    resolvedData: ResolvedFixturesDto['resolved'],
    producer: Producer,
    topPartOff: TopicPartitionOffsetAndMetadata,
  ): Promise<boolean> {
    let errIndex: number;
    const { queries, toResolveTickets } =
      await this.liveFeedQueries.insertResolvedQuery(resolvedData);
    const resolved = await this.mongooseService.liveFeedTransaction(
      this.resolvedRepo,
      queries,
      this.consumerErrCount,
      topPartOff,
    );

    //Regarding resolved data its cruccial not to commit messages until all operations are executed successfuly
    //otherwise trigger for resolving payed tickets wont we executed bcs that message is already commited
    //e.g. toResolveTickets is sent to resolve_tickets topic
    if (resolved['errIndex'] !== undefined) {
      errIndex = resolved['errIndex'];
      if (
        this.consumerErrCount[errIndex]['count'] <= this.defaultConsumerRetries
      ) {
        console.log(
          'IN ERROR CONSUMER RESOLVED',
          this.consumerErrCount[errIndex],
        );
        throw resolved['error'];
      }
      //TODO create separate mciroservice which will take care of dlq
      const toSlack = await this.kafkaProducerService.kafkaProducer(
        resolvedData,
        'dlq_resolved',
        producer,
        this.producerErrCount,
        topPartOff,
        this.defaultProducerRetries,
        true,
      );
      this.consumerErrCount.splice(errIndex, 1); //splice to trigger new cycle of retries
      console.log('CONSUMER ERR COUNT SPLICED');

      if (toSlack) {
        //TODO Send to slack
        // don commit after slack message, try until resolved data
        // is writen to db and sent to resolve_tickets topic successfully
        console.log('SENT TO SLACK');
        return false;
      }
    }
    if (resolved['errIndex'] === undefined) {
      if (toResolveTickets) {
        console.log('IN RESOLVE TIKCETS');
        //toResolveTickets doesnt need to be sent via dlq bcs non-sent resolved data is sent to 'dlq_resolved'
        //from dlq_resolved topic and associated microservice(we again extract toResolveTickets) and try to write in database
        await this.kafkaProducerService.kafkaProducer(
          toResolveTickets,
          'resolve_tickets',
          producer,
          this.producerErrCount,
          topPartOff,
          this.defaultProducerRetries,
          false, //if producer have some error we dont need to retry indefinite until send is succesfull as i mentioned above why
        );
      }
    }
    this.consumerErrCount.splice(errIndex, 1);
    //it will go to  cotnorller and commit only if all opeartions are successfull
    return true;
  }

  public async insertDlqResolved(
    resolvedDlq: any,
    topPartOff: TopicPartitionOffsetAndMetadata,
  ): Promise<boolean> {
    let errIndex: number;
    const queries =
      await this.liveFeedQueries.insertDlqResolvedQuery(resolvedDlq);
    const dlqResolved = await this.mongooseService.liveFeedTransaction(
      this.dlqResolvedRepo,
      queries,
      this.consumerErrCount,
      topPartOff,
    );
    if (dlqResolved['errIndex'] !== undefined) {
      errIndex = dlqResolved['errIndex'];
      if (
        this.consumerErrCount[errIndex]['count'] <= this.defaultConsumerRetries
      ) {
        console.log(
          'IN ERROR CONSUMER DLQ RESOLVED',
          this.consumerErrCount[errIndex],
        );
        throw dlqResolved['error'];
      }
      this.consumerErrCount.splice(errIndex, 1);
      return false; //in case when num of retries exceded limit, try all again until succeded
    }
    this.consumerErrCount.splice(errIndex, 1);
    return true;
  }

  public async resolveTickets(resolvedId: number[]) {
    console.log(resolvedId);
    // this.resolvedRepo
  }
}
