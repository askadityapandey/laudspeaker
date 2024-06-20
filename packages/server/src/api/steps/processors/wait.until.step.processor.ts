/* eslint-disable no-case-declarations */
import { Inject, Logger } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  Processor,
  WorkerHost,
  InjectQueue,
  OnWorkerEvent,
} from '@nestjs/bullmq';
import { Job, MetricsTime, Queue } from 'bullmq';
import { StepType } from '../types/step.interface';
import { Step } from '../entities/step.entity';
import { CustomerDocument } from '@/api/customers/schemas/customer.schema';
import { Account } from '@/api/accounts/entities/accounts.entity';
import * as _ from 'lodash';
import * as Sentry from '@sentry/node';
import { JourneyLocationsService } from '@/api/journeys/journey-locations.service';
import { StepsService } from '../steps.service';
import { Journey } from '@/api/journeys/entities/journey.entity';
import { JourneyLocation } from '@/api/journeys/entities/journey-location.entity';
import { CacheService } from '@/common/services/cache.service';
import { Temporal } from '@js-temporal/polyfill';

@Injectable()
@Processor('{wait.until.step}', {
  stalledInterval: process.env.WAIT_UNTIL_STEP_PROCESSOR_STALLED_INTERVAL
    ? +process.env.WAIT_UNTIL_STEP_PROCESSOR_STALLED_INTERVAL
    : 600000,
  removeOnComplete: {
    age: process.env.STEP_PROCESSOR_REMOVE_ON_COMPLETE_AGE
      ? +process.env.STEP_PROCESSOR_REMOVE_ON_COMPLETE_AGE
      : 0,
    count: process.env.WAIT_UNTIL_STEP_PROCESSOR_REMOVE_ON_COMPLETE
      ? +process.env.WAIT_UNTIL_STEP_PROCESSOR_REMOVE_ON_COMPLETE
      : 0,
  },
  metrics: {
    maxDataPoints: MetricsTime.ONE_WEEK,
  },
  concurrency: process.env.WAIT_UNTIL_STEP_PROCESSOR_CONCURRENCY
    ? +process.env.WAIT_UNTIL_STEP_PROCESSOR_CONCURRENCY
    : 1,
})
export class WaitUntilStepProcessor extends WorkerHost {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
    @InjectQueue('{start.step}') private readonly startStepQueue: Queue,
    @InjectQueue('{wait.until.step}')
    private readonly waitUntilStepQueue: Queue,
    @InjectQueue('{message.step}') private readonly messageStepQueue: Queue,
    @InjectQueue('{jump.to.step}') private readonly jumpToStepQueue: Queue,
    @InjectQueue('{time.delay.step}')
    private readonly timeDelayStepQueue: Queue,
    @InjectQueue('{time.window.step}')
    private readonly timeWindowStepQueue: Queue,
    @InjectQueue('{multisplit.step}')
    private readonly multisplitStepQueue: Queue,
    @InjectQueue('{experiment.step}')
    private readonly experimentStepQueue: Queue,
    @InjectQueue('{exit.step}') private readonly exitStepQueue: Queue,
    @Inject(JourneyLocationsService)
    private journeyLocationsService: JourneyLocationsService,
    @Inject(StepsService) private stepsService: StepsService,
    @Inject(CacheService) private cacheService: CacheService
  ) {
    super();
  }

  log(message, method, session, user = 'ANONYMOUS') {
    this.logger.log(
      message,
      JSON.stringify({
        class: WaitUntilStepProcessor.name,
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
        class: WaitUntilStepProcessor.name,
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
        class: WaitUntilStepProcessor.name,
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
        class: WaitUntilStepProcessor.name,
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
        class: WaitUntilStepProcessor.name,
        method: method,
        session: session,
        user: user,
      })
    );
  }

  private processorMap: Record<
    StepType,
    (type: StepType, job: any) => Promise<void>
  > = {
    [StepType.START]: async (type, job) => {
      await this.startStepQueue.add(type, job);
    },
    [StepType.EXPERIMENT]: async (type, job) => {
      await this.experimentStepQueue.add(type, job);
    },
    [StepType.LOOP]: async (type, job) => {
      await this.jumpToStepQueue.add(type, job);
    },
    [StepType.EXIT]: async (type, job) => {
      await this.exitStepQueue.add(type, job);
    },
    [StepType.MULTISPLIT]: async (type, job) => {
      await this.multisplitStepQueue.add(type, job);
    },
    [StepType.MESSAGE]: async (type: StepType, job: any) => {
      await this.messageStepQueue.add(type, job);
    },
    [StepType.TIME_WINDOW]: async (type: StepType, job: any) => {
      await this.timeWindowStepQueue.add(type, job);
    },
    [StepType.TIME_DELAY]: async (type: StepType, job: any) => {
      await this.timeDelayStepQueue.add(type, job);
    },
    [StepType.WAIT_UNTIL_BRANCH]: async (type: StepType, job: any) => {
      await this.waitUntilStepQueue.add(type, job);
    },
    [StepType.AB_TEST]: function (type: StepType, job: any): Promise<void> {
      throw new Error('Function not implemented.');
    },
    [StepType.RANDOM_COHORT_BRANCH]: function (
      type: StepType,
      job: any
    ): Promise<void> {
      throw new Error('Function not implemented.');
    },
    [StepType.TRACKER]: function (type: StepType, job: any): Promise<void> {
      throw new Error('Function not implemented.');
    },
    [StepType.ATTRIBUTE_BRANCH]: function (
      type: StepType,
      job: any
    ): Promise<void> {
      throw new Error('Function not implemented.');
    },
  };

  async process(
    job: Job<
      {
        step: Step;
        owner: Account;
        journey: Journey;
        customer: CustomerDocument;
        location: JourneyLocation;
        session: string;
        event?: string;
        branch?: number;
      },
      any,
      string
    >
  ): Promise<any> {
    return Sentry.startSpan(
      { name: 'WaitUntilStepProcessor.process' },
      async () => {
        let nextJob;
        let nextStep: Step,
          moveCustomer = false;

        // Time branch case
        if (job.data.branch < 0 && job.data.step.metadata.timeBranch) {
          if (job.data.step.metadata.timeBranch.delay) {
            if (
              Date.now() - job.data.location.stepEntry >
              Temporal.Duration.from(
                job.data.step.metadata.timeBranch.delay
              ).total({
                unit: 'millisecond',
              })
            ) {
              moveCustomer = true;
            }
          } else if (job.data.step.metadata.timeBranch.window) {
            if (job.data.step.metadata.timeBranch.window.onDays) {
              const now = new Date();

              const startTime = new Date(now.getTime());
              startTime.setHours(
                job.data.step.metadata.timeBranch.window.fromTime.split(':')[0]
              );
              startTime.setMinutes(
                job.data.step.metadata.timeBranch.window.fromTime.split(':')[1]
              );

              const endTime = new Date(now.getTime());
              endTime.setHours(
                job.data.step.metadata.timeBranch.window.toTime.split(':')[0]
              );
              endTime.setMinutes(
                job.data.step.metadata.timeBranch.window.toTime.split(':')[1]
              );

              const day = now.getDay();

              if (
                startTime < now &&
                endTime > now &&
                job.data.step.metadata.timeBranch.window.onDays[day] === 1
              ) {
                moveCustomer = true;
              }
            }
            // Case2: Date and time of window
            else {
              if (
                new Date(
                  Temporal.Instant.from(
                    job.data.step.metadata.timeBranch.window.from
                  ).epochMilliseconds
                ).getTime() < Date.now() &&
                Date.now() <
                  new Date(
                    Temporal.Instant.from(
                      job.data.step.metadata.timeBranch.window.to
                    ).epochMilliseconds
                  ).getTime()
              ) {
                moveCustomer = true;
              }
            }
          }
          if (moveCustomer) {
            nextStep = await this.cacheService.getIgnoreError(
              Step,
              job.data.step.metadata.timeBranch?.destination,
              async () => {
                return await this.stepsService.lazyFindByID(
                  job.data.step.metadata.timeBranch?.destination
                );
              }
            );

            if (nextStep) {
              if (
                nextStep.type !== StepType.TIME_DELAY &&
                nextStep.type !== StepType.TIME_WINDOW &&
                nextStep.type !== StepType.WAIT_UNTIL_BRANCH
              ) {
                nextJob = {
                  owner: job.data.owner,
                  journey: job.data.journey,
                  step: nextStep,
                  session: job.data.session,
                  customer: job.data.customer,
                  location: job.data.location,
                  event: job.data.event,
                };
              } else {
                // Destination is time based,
                // customer has stopped moving so we can release lock
                await this.journeyLocationsService.unlock(
                  job.data.location,
                  nextStep
                );
              }
            } else {
              // Destination does not exist,
              // customer has stopped moving so we can release lock
              await this.journeyLocationsService.unlock(
                job.data.location,
                job.data.step
              );
            }
          } else {
            // Not yet time to move customer,
            // customer has stopped moving so we can release lock
            await this.journeyLocationsService.unlock(
              job.data.location,
              job.data.step
            );
          }
        } else if (
          job.data.branch > -1 &&
          job.data.step.metadata.branches.length > 0
        ) {
          let nextStepId = job.data.step.metadata.branches.filter(
            (branchItem) => {
              return branchItem.index === job.data.branch;
            }
          )[0].destination;

          nextStep = await this.cacheService.getIgnoreError(
            Step,
            nextStepId,
            async () => {
              return await this.stepsService.lazyFindByID(nextStepId);
            }
          );

          if (nextStep) {
            if (
              nextStep.type !== StepType.TIME_DELAY &&
              nextStep.type !== StepType.TIME_WINDOW &&
              nextStep.type !== StepType.WAIT_UNTIL_BRANCH
            ) {
              nextJob = {
                owner: job.data.owner,
                journey: job.data.journey,
                step: nextStep,
                session: job.data.session,
                customer: job.data.customer,
                location: job.data.location,
                event: job.data.event,
              };
            } else {
              // Destination is time based,
              // customer has stopped moving so we can release lock
              await this.journeyLocationsService.unlock(
                job.data.location,
                nextStep
              );
            }
          } else {
            // Destination does not exist,
            // customer has stopped moving so we can release lock
            await this.journeyLocationsService.unlock(
              job.data.location,
              job.data.step
            );
          }
        } else {
          await this.journeyLocationsService.unlock(
            job.data.location,
            job.data.step
          );
        }
        if (nextStep && nextJob)
          await this.processorMap[nextStep.type](nextStep.type, nextJob);
      }
    );
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job, error: Error, prev?: string) {
    Sentry.withScope((scope) => {
      scope.setTag('job_id', job.id);
      scope.setTag('processor', WaitUntilStepProcessor.name);
      Sentry.captureException(error);
    });
  }
}
