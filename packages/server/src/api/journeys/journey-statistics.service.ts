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
  format,
  eachDayOfInterval,
  eachWeekOfInterval,
  startOfDay,
  endOfDay
} from 'date-fns';
import { Journey } from './entities/journey.entity';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { StepsService } from '../steps/steps.service';
import { JourneyLocationsService } from './journey-locations.service';
import { JourneyLocation } from './entities/journey-location.entity';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { ClientSession, Model, SortOrder } from 'mongoose';
import { EventDocument, Event } from '../events/schemas/event.schema';
import { BaseLaudspeakerService } from '@/common/services/base.laudspeaker.service';

@Injectable()
export class JourneyStatisticsService extends BaseLaudspeakerService {
  constructor(
    @Inject(StepsService) private stepsService: StepsService,
    @Inject(JourneyLocationsService)
    private readonly journeyLocationsService: JourneyLocationsService,
    @InjectModel(Event.name)
    private EventModel: Model<EventDocument>,
  ) {
    super();
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
    // set start to start of day
    this.startTime = startOfDay(startTime);
    // set end to end of day
    this.endTime = endOfDay(endTime);
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
    const pointDates =
      this.frequency === 'daily'
        ? eachDayOfInterval({ start: this.startTime, end: this.endTime })
        : // Postgres' week starts on Monday
          eachWeekOfInterval(
            { start: this.startTime, end: this.endTime },
            { weekStartsOn: 1 }
          );

    const totalPoints = pointDates.length;

    const {
      enrollementGroupedByDate,
      enrolledCount
    } = await this.getEnrollmentCountsData();

    const {
      finishedGroupedByDate,
      finishedCount
    } = await this.getFinishedCountsData();

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
    
    const events = this.journey.journeySettings?.conversionTracking?.events || [];

    const query: any[] = [{
      $match: {
        event: { $in: events },
        timestamp: {
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
    }];

    const result = await this.EventModel.aggregate(query).exec();

    const totalEvents = result.reduce((acc, group) => {
      return acc + group['count'];
    }, 0);

    const conversionDataPoints = new Array(totalPoints);
    const allEventsInDB = new Set<string>;
    const allEventsPositions = {};

    for(let i = 0; i < totalPoints; i++)
      conversionDataPoints[i] = {
        label: format(pointDates[i], "E LLL d"),
        data: {}
      };

    for (const group of result) {
      let groupDate;

      if (this.frequency == 'weekly')
        groupDate = parse(group._id.date, 'I', new Date());
      else {
        groupDate = new Date(new Date().getFullYear(), 0);
        groupDate = new Date(groupDate.setDate(group._id.date));
      }

      for (let i = 0; i < pointDates.length; i++) {
        if (groupDate.getTime() == pointDates[i].getTime()) {
          let event = group._id.event;

          conversionDataPoints[i].data[event] = group.count;

          allEventsInDB.add(event);

          if (!Object.hasOwn(allEventsPositions, event))
            allEventsPositions[event] = { first: totalPoints, last: -1 };

          allEventsPositions[event].first = Math.min(i, allEventsPositions[event].first);
          allEventsPositions[event].last = Math.max(i, allEventsPositions[event].last);
        }
      }
    }

    const { enrolledCount } = await this.getEnrollmentCountsData();

    // explicitly set the count to 0 for events that don't exist
    // in a particular day/week
    // also convert all numbers to percentages
    for (let event of events) {
      for (let i = 0; i < pointDates.length; i++) {
        conversionDataPoints[i].data[event] = this.getConversionPercentage(
          conversionDataPoints[i].data[event],
          enrolledCount
        );
      }
    }

    // assign colors to events
    const colors = [
      "#3446EB",
      "#61197D",
      "#EB6B34",
      "#8ED613",
      "#B58F12",
      "#0A4F09",
      "#DDA04F",
      "#405630",
      "#C0DBD6",
      "#AD30A5",
      "#2532A8",
      "#5B6B2A",
      "#6D6E75",
      "#0C243A",
      "#F97FB6",
      "#5C5E5B",
      "#6294F7",
      "#931360",
      "#1C3AFF",
      "#515E4A",
    ];

    const lines = [];
    const defaultColor = "#848470";
    let colorsPicked = 0;

    let lineColor = defaultColor;

    for (let event of events) {
      if(colorsPicked < colors.length)
        lineColor = colors[colorsPicked++];
      else
        lineColor = defaultColor;

      lines.push({
        event,
        color: lineColor,
      });
    }

    this.result.conversionData = {
      conversionDataPoints,
      totalEvents,
      lines,
      allEvents: Array.from(events),
    };
  }

  private async getEnrollmentCountsData() {
    const dbFrequency = this.frequency == 'weekly' ? 'week' : 'day';

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

    const enrolledCount = enrollementGroupedByDate.reduce((acc, group) => {
      return acc + group['group_count'];
    }, 0);

    return {
      enrollementGroupedByDate,
      enrolledCount
    }
  }

  private async getFinishedCountsData() {
    const dbFrequency = this.frequency == 'weekly' ? 'week' : 'day';

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

    const finishedCount = finishedGroupedByDate.reduce((acc, group) => {
      return acc + group['group_count'];
    }, 0);

    return {
      finishedGroupedByDate,
      finishedCount
    }
  }

  private getConversionPercentage(eventCount: number, totalCount: number) {
    if (eventCount <= 0 ||
        totalCount <= 0 ||
        !eventCount ||
        !totalCount)
      return 0;
    else {
      const formatter = new Intl.NumberFormat('en-US', {
         minimumFractionDigits: 2,      
         maximumFractionDigits: 2,
      });

      const value = eventCount / totalCount * 100.0;

      return parseFloat(formatter.format(value));
    }
  }
}

