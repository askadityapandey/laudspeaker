import { Inject, Injectable } from '@nestjs/common';
import {
  InjectQueue,
} from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { StepType } from '../../api/steps/types/step.interface';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('{start.step}') 
    private readonly startStepQueue: Queue,
    @InjectQueue('{wait.until.step}')
    private readonly waitUntilStepQueue: Queue,
    @InjectQueue('{message.step}')
    private readonly messageStepQueue: Queue,
    @InjectQueue('{jump.to.step}')
    private readonly jumpToStepQueue: Queue,
    @InjectQueue('{time.delay.step}')
    private readonly timeDelayStepQueue: Queue,
    @InjectQueue('{time.window.step}')
    private readonly timeWindowStepQueue: Queue,
    @InjectQueue('{multisplit.step}')
    private readonly multisplitStepQueue: Queue,
    @InjectQueue('{experiment.step}')
    private readonly experimentStepQueue: Queue,
    @InjectQueue('{exit.step}')
    private readonly exitStepQueue: Queue
  ) {}

  private getQueueMap() {
    const queueMap = {
      [StepType.START]: this.startStepQueue,
      [StepType.EXPERIMENT]: this.experimentStepQueue,
      [StepType.LOOP]: this.jumpToStepQueue,
      [StepType.EXIT]: this.exitStepQueue,
      [StepType.MULTISPLIT]: this.multisplitStepQueue,
      [StepType.MESSAGE]: this.messageStepQueue,
      [StepType.TIME_WINDOW]: this.timeWindowStepQueue,
      [StepType.TIME_DELAY]: this.timeDelayStepQueue,
      [StepType.WAIT_UNTIL_BRANCH]: this.waitUntilStepQueue,
    }

    return queueMap;
  }

  private getQueueForStepType(type: StepType) {
    const queueMap = this.getQueueMap();

    const queue = queueMap[type];

    if(!queue) {
      throw new Error('Function ${type} is not implemented.');
    }

    return queue;
  }

  private getStepDepthFromBulkJob(jobs: any[]) {
    let depths = new Set();

    for (const job of jobs) {
      if (job.stepDepth)
        depth.add(+job.stepDepth);
    }

    // default to stepDepth of 1
    if(depths.size == 0)
      return 1;

    // get first value
    let it = depths.values();
    let first = it.next();
    let stepDepth = first.value;

    return stepDepth;
  }

  private getStepDepthFromJob(job: any) {
    const stepDepth = this.getStepDepthFromBulkJob([job]);

    return stepDepth;
  }

  /**
   * Generate batchSize priorities for step jobs at a depth stepDepth
   * @param stepDepth (non-zero number)
   * @param batchSize
   * @returns
   */
  private getBulkJobPriority(
    stepDepth: number,
    batchSize: number
  ): number[] {
    const priorities: number[] = [];

    // bullmq max priority
    const maxJobPriority: number = 2000000;

    // max number of steps a journey can take
    const maxJourneyDepth: number = 1000;

    // upperbound to maxJourneyDepth
    stepDepth = Math.min(stepDepth, maxJourneyDepth);

    // priorities will be [1, stepPriorityBlocks[, [stepPriorityBlocks, 2 * stepPriorityBlocks[, etc...
    const stepPriorityBlocks: number = Math.floor(maxJobPriority / maxJourneyDepth);

    const nextStepPriorityStart: number = (stepDepth - 1) * stepPriorityBlocks + 1;
    const nextStepPriorityEnd: number = nextStepPriorityStart + stepPriorityBlocks - 1;

    let nextStepPriority;

    for(let i = 0; i < batchSize; i++) {
      nextStepPriority = Math.floor(Math.random() * (nextStepPriorityEnd - nextStepPriorityStart + 1) + nextStepPriorityStart);

      priorities.push(nextStepPriority);
    }

    return priorities;
  }

  /**
   * Get priority for a single job at a depth stepDepth
   * @param stepDepth (non-zero number)
   * @returns
   */
  private getJobPriority(stepDepth: number): number {
    const priorities = this.getBulkJobPriority(stepDepth, 1);

    return priorities[0];
  }

  /**
   * Adds bulk jobsData to specific queue, can be used for early queues if there
   * is no stepType (enrollment, start)
   * @param queue
   * @param job
   * @param priority
   * @returns
   */
  async addBulkToQueue(queue: Queue, name: string, jobsData: any[]) {
    const stepDepth = this.getStepDepthFromBulkJob(jobsData);
    const priorities = this.getBulkJobPriority(stepDepth, jobsData.length);
    const jobs: Record<string, any>[];

    for(let i = 0; i < jobsData.length; i++) {
      jobs.add({
        name: name,
        data: jobData,
        opts: {
          priority: priorities[i],
        }
      })
    }

    await queue.addBulk(jobs);
  }

  /**
   * Creates a job from jobData and adds a job to specific queue,
   * can be used for early queues if there is no stepType (enrollment, start)
   * @param queue
   * @param jobData
   * @returns
   */
  async addToQueue(queue: Queue, name: string, jobData: any) {
    await this.addBulkToQueue(queue, name, [jobData]);
  }

  /**
   * create jobs from jobsData and add them in bulk it to a queue based on the stepType
   * @param stepType
   * @param jobData
   * @returns
   */
  async addBulk(type: StepType, jobsData: any[]) {
    const queue = this.getQueueForStepType(type);

    await this.addBulkToQueue(queue, type, jobsData);
  }

  /**
   * create a job from jobData and add it to a queue based on the stepType
   * @param stepType
   * @param jobData
   * @returns
   */
  async add(type: StepType, jobData: any) {
    const queue = this.getQueueForStepType(type);

    await this.addToQueue(queue, type, job);
  }
}
