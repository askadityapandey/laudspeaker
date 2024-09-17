import {
  Logger,
  Inject,
  Injectable,
  HttpException,
  NotFoundException,
  forwardRef,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  DataSource,
  FindOptionsWhere,
  In,
  Like,
  QueryRunner,
  Repository,
} from 'typeorm';
import {
  parse,
  eachDayOfInterval,
  eachWeekOfInterval
} from 'date-fns';
import { Journey } from './entities/journey.entity';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { StepsService } from '../steps/steps.service';
import { JourneyLocationsService } from './journey-locations.service';
import { JourneyLocation } from './entities/journey-location.entity';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { ClientSession, Model, SortOrder } from 'mongoose';
import { EventDocument, Event } from '../events/schemas/event.schema';

@Injectable()
export class JourneyStatisticsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
    @Inject(StepsService) private stepsService: StepsService,
    @Inject(JourneyLocationsService)
    private readonly journeyLocationsService: JourneyLocationsService,
    @InjectModel(Event.name)
    private EventModel: Model<EventDocument>,
  ) {}

  log(message, method, session, user = 'ANONYMOUS') {
    this.logger.log(
      message,
      JSON.stringify({
        class: JourneyStatisticsService.name,
        method: method,
        session: session,
        user: user,
      })
    );
  }
  debug(message, method, session, user = 'ANONYMOUS') {
    this.logger.debug(
      message,
      JSON.stringify({
        class: JourneyStatisticsService.name,
        method: method,
        session: session,
        user: user,
      })
    );
  }
  warn(message, method, session, user = 'ANONYMOUS') {
    this.logger.warn(
      message,
      JSON.stringify({
        class: JourneyStatisticsService.name,
        method: method,
        session: session,
        user: user,
      })
    );
  }
  error(error, method, session, user = 'ANONYMOUS') {
    this.logger.error(
      error.message,
      error.stack,
      JSON.stringify({
        class: JourneyStatisticsService.name,
        method: method,
        session: session,
        cause: error.cause,
        name: error.name,
        user: user,
      })
    );
  }
  verbose(message, method, session, user = 'ANONYMOUS') {
    this.logger.verbose(
      message,
      JSON.stringify({
        class: JourneyStatisticsService.name,
        method: method,
        session: session,
        user: user,
      })
    );
  }

  private journey: Journey;
  private startTime: Date;
  private endTime: Date;
  private frequency: 'daily' | 'weekly';
  private session: string;
  private result;

  async getStatistics(
    journey: Journey,
    startTime: Date,
    endTime: Date,
    frequency: 'daily' | 'weekly',
    session: string
  ) {

    this.journey = journey;
    this.startTime = startTime;
    this.endTime = endTime;
    this.frequency = frequency;
    this.session = session;

    this.result = {
      enrollmentData: {},
      conversionData: {}
    };

    await Promise.all([
      this.processEnrollmentData(),
      this.processConversionData()
    ]);

    return this.result;
  }

  private async processEnrollmentData() {
    const dbFrequency = this.frequency == 'weekly' ? 'week' : 'day';

    const pointDates =
      this.frequency === 'daily'
        ? eachDayOfInterval({ start: this.startTime, end: this.endTime })
        : // Postgres' week starts on Monday
          eachWeekOfInterval(
            { start: this.startTime, end: this.endTime },
            { weekStartsOn: 1 }
          );

    const totalPoints = pointDates.length;

    const enrollementGroupedByDate =
      await this.journeyLocationsService.journeyLocationsRepository
        .createQueryBuilder('location')
        .where({
          journey: this.journey.id,
          journeyEntryAt: Between(
            this.startTime.toISOString(),
            this.endTime.toISOString()
          ),
        })
        .select([
          `date_trunc('${dbFrequency}', "journeyEntryAt") as "date"`,
          `count(*)::INTEGER as group_count`,
        ])
        .groupBy('date')
        .orderBy('date', 'ASC')
        .getRawMany();

    const terminalSteps = await this.stepsService.findAllTerminalInJourney(
      this.journey.id,
      this.session,
      ['step.id']
    );
    const terminalStepIds = terminalSteps.map((step) => step.id);

    const finishedGroupedByDate =
      await this.journeyLocationsService.journeyLocationsRepository
        .createQueryBuilder('location')
        .where({
          journey: this.journey.id,
          stepEntryAt: Between(this.startTime.toISOString(), this.endTime.toISOString()),
          step: In(terminalStepIds),
        })
        .select([
          `date_trunc('${dbFrequency}', "journeyEntryAt") as "date"`,
          `count(*)::INTEGER as group_count`,
        ])
        .groupBy('date')
        .orderBy('date', 'ASC')
        .getRawMany();

    const enrolledCount = enrollementGroupedByDate.reduce((acc, group) => {
      return acc + group['group_count'];
    }, 0);

    const finishedCount = finishedGroupedByDate.reduce((acc, group) => {
      return acc + group['group_count'];
    }, 0);

    const enrolledDataPoints: number[] = new Array(totalPoints).fill(
      0,
      0,
      totalPoints
    );
    const finishedDataPoints: number[] = new Array(totalPoints).fill(
      0,
      0,
      totalPoints
    );

    for (const group of enrollementGroupedByDate) {
      for (var i = 0; i < pointDates.length; i++) {
        if (group.date.getTime() == pointDates[i].getTime())
          enrolledDataPoints[i] += group.group_count;
      }
    }

    for (const group of finishedGroupedByDate) {
      for (var i = 0; i < pointDates.length; i++) {
        if (group.date.getTime() == pointDates[i].getTime())
          finishedDataPoints[i] += group.group_count;
      }
    }

    this.result.enrollmentData = {
      enrolledDataPoints,
      finishedDataPoints,
      enrolledCount,
      finishedCount
    };
  }

  private async processConversionData() {
    const dbFrequency = this.frequency == 'weekly' ? '$week' : '$dayOfYear';

    const pointDates =
      this.frequency === 'daily'
        ? eachDayOfInterval({ start: this.startTime, end: this.endTime })
        : // Postgres' week starts on Monday
          eachWeekOfInterval(
            { start: this.startTime, end: this.endTime },
            { weekStartsOn: 1 }
          );

    const totalPoints = pointDates.length;

    const isoStart = this.startTime.toISOString();
    const isoEnd = this.endTime.toISOString();
    
    const events = ["example1", "eventB", "eventX"];

    const docs = await this.EventModel.aggregate([{
      $match: {
        event: { $in: events },
        createdAt: {
          $gte: isoStart,
          $lte: isoEnd
        }
      }
    },
    {
      $addFields: {
        timestampDate: {
          [dbFrequency]: {
            $dateFromString: {
              dateString: "$timestamp"
            }
          }
        }
      }
    },
    {
      $group: {
        _id: {
          event: "$event",
          date: "$timestampDate"
        },
        count: {
          $sum: 1
        }
      }
    },
    {
      $sort: {
        "_id.date": 1,
        "_id.event": 1
      }
    }]).exec();

    const totalEvents = docs.reduce((acc, group) => {
      return acc + group['count'];
    }, 0);

    const conversionDataPoints = new Array(totalPoints).fill(
      [],
      0,
      totalPoints
    );

    for (const group of docs) {
      let groupDate;

      if (this.frequency == 'weekly')
        groupDate = parse(group._id.date, 'I', new Date());
      else {
        groupDate = new Date(new Date().getFullYear(), 0);
        groupDate = new Date(groupDate.setDate(group._id.date));
      }

      for (let i = 0; i < pointDates.length; i++) {
        if (groupDate.getTime() == pointDates[i].getTime())
          conversionDataPoints[i].push({
            event: group._id.event,
            date: groupDate,
            count: group.count
          });
      }
    }

    this.result.conversionData = {
      conversionDataPoints,
      totalEvents
    };
  }
}

