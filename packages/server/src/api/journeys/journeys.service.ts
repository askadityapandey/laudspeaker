import {
  Logger,
  Inject,
  Injectable,
  HttpException,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  FindOptionsWhere,
  In,
  Like,
  QueryRunner,
  Repository,
} from 'typeorm';
import { Account } from '../accounts/entities/accounts.entity';
import { UpdateJourneyDto } from './dto/update-journey.dto';
import { Journey } from './entities/journey.entity';
import errors from '../../shared/utils/errors';
import { CustomersService } from '../customers/customers.service';
import {
  Customer,
  CustomerDocument,
} from '../customers/schemas/customer.schema';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { createClient } from '@clickhouse/client';
import { isUUID } from 'class-validator';
import mongoose, { ClientSession, Model } from 'mongoose';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common/exceptions';
import { StepsService } from '../steps/steps.service';
import { Step } from '../steps/entities/step.entity';
import { Graph, alg } from '@dagrejs/graphlib';
import { UpdateJourneyLayoutDto } from './dto/update-journey-layout.dto';
import { v4 as uuid } from 'uuid';
import {
  BranchType,
  EdgeType,
  NodeType,
  TimeType,
} from './types/visual-layout.interface';
import {
  AllStepTypeMetadata,
  AnalyticsEvent,
  StartStepMetadata,
  StepType,
} from '../steps/types/step.interface';
import { MessageStepMetadata } from '../steps/types/step.interface';
import { WaitUntilStepMetadata } from '../steps/types/step.interface';
import { LoopStepMetadata } from '../steps/types/step.interface';
import { ExitStepMetadata } from '../steps/types/step.interface';
import { TimeDelayStepMetadata } from '../steps/types/step.interface';
import { TimeWindow } from '../steps/types/step.interface';
import { TimeWindowStepMetadata } from '../steps/types/step.interface';
import { CustomerAttribute } from '../steps/types/step.interface';
import { MultiBranchMetadata } from '../steps/types/step.interface';
import { template } from 'lodash';
import { Temporal } from '@js-temporal/polyfill';

export enum JourneyStatus {
  ACTIVE = 'Active',
  PAUSED = 'Paused',
  STOPPED = 'Stopped',
  DELETED = 'Deleted',
  EDITABLE = 'Editable',
}

function isObjKey<T extends object>(key: PropertyKey, obj: T): key is keyof T {
  return key in obj;
}

@Injectable()
export class JourneysService {
  private clickhouseClient = createClient({
    host: process.env.CLICKHOUSE_HOST
      ? process.env.CLICKHOUSE_HOST.includes('http')
        ? process.env.CLICKHOUSE_HOST
        : `http://${process.env.CLICKHOUSE_HOST}`
      : 'http://localhost:8123',
    username: process.env.CLICKHOUSE_USER ?? 'default',
    password: process.env.CLICKHOUSE_PASSWORD ?? '',
  });

  constructor(
    private dataSource: DataSource,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
    @InjectRepository(Journey)
    public journeysRepository: Repository<Journey>,
    @Inject(StepsService) private stepsService: StepsService,
    @InjectModel(Customer.name) public CustomerModel: Model<CustomerDocument>,
    @Inject(forwardRef(() => CustomersService))
    private customersService: CustomersService,
    @InjectConnection() private readonly connection: mongoose.Connection
  ) { }

  log(message, method, session, user = 'ANONYMOUS') {
    this.logger.log(
      message,
      JSON.stringify({
        class: JourneysService.name,
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
        class: JourneysService.name,
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
        class: JourneysService.name,
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
        class: JourneysService.name,
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
        class: JourneysService.name,
        method: method,
        session: session,
        user: user,
      })
    );
  }

  /**
   * Creates a journey.
   *
   * @param account
   * @param name
   * @param session
   * @returns
   */
  async create(account: Account, name: string, session: string) {
    try {
      const startNodeUUID = uuid();
      const nextNodeUUID = uuid();

      const journey = await this.journeysRepository.create({
        name,
        owner: { id: account.id },
        visualLayout: {
          nodes: [],
          edges: [
            {
              id: `e${startNodeUUID}-${nextNodeUUID}`,
              type: EdgeType.PRIMARY,
              source: startNodeUUID,
              target: nextNodeUUID,
            },
          ],
        },
      });

      await this.journeysRepository.save(journey);

      const step = await this.stepsService.insert(
        account,
        {
          type: StepType.START,
          journeyID: journey.id,
        },
        session
      );

      journey.visualLayout.nodes = [
        {
          id: startNodeUUID,
          type: NodeType.START,
          data: {
            stepId: step.id,
          },
          position: { x: 0, y: 0 },
        },
        {
          id: nextNodeUUID,
          type: NodeType.EMPTY,
          data: {},
          position: { x: 0, y: 0 },
        },
      ];

      return await this.journeysRepository.save(journey);
    } catch (err) {
      this.error(err, this.create.name, session, account.email);
      throw err;
    }
  }

  /**
   * Duplicate a journey.
   * @param user
   * @param id
   * @param session
   */
  async duplicate(user: Account, id: string, session: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    let err: any;
    try {
      const oldJourney = await queryRunner.manager.findOne(Journey, {
        where: {
          owner: { id: user.id },
          id,
        },
      });
      if (!oldJourney) throw new NotFoundException('Journey not found');

      let copyEraseIndex = oldJourney.name.indexOf('-copy');
      if (copyEraseIndex === -1) copyEraseIndex = oldJourney.name.length;

      const res = await queryRunner.manager
        .createQueryBuilder(Journey, 'journey')
        .select('COUNT(*)')
        .where('starts_with(name, :oldName) = TRUE AND "ownerId" = :ownerId', {
          oldName: oldJourney.name.substring(0, copyEraseIndex),
          ownerId: user.id,
        })
        .execute();
      const newName =
        oldJourney.name.substring(0, copyEraseIndex) +
        '-copy-' +
        (res?.[0]?.count || '0');
      const newJourney = await this.create(user, newName, session);

      const oldSteps = await this.stepsService.transactionalfindByJourneyID(
        user,
        oldJourney.id,
        queryRunner
      );

      const newSteps: Step[] = await queryRunner.manager.save(
        Step,
        oldSteps.map((oldStep) => ({
          createdAt: new Date(),
          owner: oldStep.owner,
          type: oldStep.type,
          journey: newJourney,
          customers: [],
          metadata: oldStep.metadata,
          isEditable: true,
        }))
      );

      let visualLayout = JSON.stringify(oldJourney.visualLayout);

      for (let i = 0; i < oldSteps.length; i++) {
        const oldStepID = oldSteps[i].id;
        const newStepID = newSteps[i].id;
        visualLayout = visualLayout.replaceAll(oldStepID, newStepID);
      }

      visualLayout = JSON.parse(visualLayout);

      await this.transactionalUpdate(
        user,
        {
          id: newJourney.id,
          name: newName,
          visualLayout,
          isDynamic: oldJourney.isDynamic,
        },
        session,
        queryRunner
      );

      await queryRunner.commitTransaction();
    } catch (e) {
      err = e;
      this.error(e, this.duplicate.name, session, user.email);
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
      if (err) throw err;
    }
  }

  /**
   * Adds a customer to dynamic primary audience of all active workflows,
   * and sends them any relevant messages. Similar to  start,
   * one customer -> many workflows
   *
   * @remarks Throws an error if the workflow is not found
   * @param account The owner of the workflow
   * @param updateAudienceDto DTO with the updated information
   *
   */
  async enrollCustomer(
    account: Account,
    customer: CustomerDocument,
    queryRunner: QueryRunner,
    clientSession: ClientSession,
    session: string
  ): Promise<void> {
    try {
      const journeys = await queryRunner.manager.find(Journey, {
        where: {
          owner: { id: account.id },
          isActive: true,
          isStopped: false,
          isPaused: false,
        },
      });

      for (
        let journeyIndex = 0;
        journeyIndex < journeys?.length;
        journeyIndex++
      ) {
        const journey = journeys[journeyIndex];
        if (
          journey.isDynamic &&
          (await this.customersService.checkInclusion(
            customer,
            journey.inclusionCriteria,
            account
          )) &&
          customer.workflows.indexOf(journey.id) < 0
        ) {
          await this.stepsService.addToStart(
            account,
            journey.id,
            customer,
            queryRunner,
            session
          );
          await this.CustomerModel.updateOne(
            { _id: customer._id },
            { $addToSet: { journeys: journey.id } }
          )
            .session(clientSession)
            .exec();
        }
      }
    } catch (err) {
      this.error(err, this.enrollCustomer.name, session, account.id);
      throw err;
    }
  }

  /**
   * Finds all journeys matching a certain criteria.
   *
   * @param {Account} account The owner of the journeys
   * @param {string} session HTTP session token
   * @param {number} [take=100] No. of journeys to show; used for pagination, together with skip
   * @param {number} [skip=0] No. of journeys to skip; used for pagination, together with take
   * @param {keyof Journey} [orderBy]
   *
   */
  async findAll(
    account: Account,
    session: string,
    take = 100,
    skip = 0,
    orderBy?: keyof Journey,
    orderType?: 'asc' | 'desc',
    showDisabled?: boolean,
    search = '',
    filterStatusesString = ''
  ): Promise<{ data: Journey[]; totalPages: number }> {
    try {
      const filterStatusesParts = filterStatusesString.split(',');
      const isActive = filterStatusesParts.includes(JourneyStatus.ACTIVE);
      const isPaused = filterStatusesParts.includes(JourneyStatus.PAUSED);
      const isStopped = filterStatusesParts.includes(JourneyStatus.STOPPED);
      const isDeleted = filterStatusesParts.includes(JourneyStatus.DELETED);
      const isEditable = filterStatusesParts.includes(JourneyStatus.EDITABLE);

      const whereOrParts: FindOptionsWhere<Journey>[] = [];

      if (isEditable) {
        whereOrParts.push({
          name: Like(`%${search}%`),
          owner: { id: account.id },
          isDeleted: false,
          isActive: false,
          isPaused: false,
          isStopped: false,
        });
      }

      const filterStatuses = {
        isActive,
        isPaused,
        isStopped,
        isDeleted,
      };

      if (isActive || isPaused || isStopped || isDeleted || isEditable) {
        for (const [key, value] of Object.entries(filterStatuses)) {
          if (value)
            whereOrParts.push({
              name: Like(`%${search}%`),
              owner: { id: account.id },
              isDeleted: In([!!showDisabled, false]),
              [key]: value,
              ...(key === 'isActive'
                ? { isStopped: false, isPaused: false }
                : key === 'isPaused'
                  ? { isStopped: false }
                  : {}),
            });
        }
      } else {
        whereOrParts.push({
          name: Like(`%${search}%`),
          owner: { id: account.id },
          isDeleted: In([!!showDisabled, false]),
        });
      }

      const totalPages = Math.ceil(
        (await this.journeysRepository.count({
          where: whereOrParts,
        })) / take || 1
      );
      const orderOptions = {};
      if (orderBy && orderType) {
        orderOptions[orderBy] = orderType;
      }
      const journeys = await this.journeysRepository.find({
        where: whereOrParts,
        order: orderOptions,
        take: take < 100 ? take : 100,
        skip,
      });
      return { data: journeys, totalPages };
    } catch (err) {
      this.error(err, this.findAll.name, session, account.email);
      throw err;
    }
  }

  /**
   * Finds all active journeys
   *
   * @param account - The owner of the workflows
   *
   */
  findAllActive(account: Account): Promise<Journey[]> {
    return this.journeysRepository.find({
      where: {
        owner: { id: account.id },
        isActive: true,
        isStopped: false,
        isPaused: false,
      },
    });
  }

  /**
   * Finds a journey by ID.
   *
   * @param account
   * @param id
   * @param needStats
   * @param session
   * @returns
   */
  async findOne(account: Account, id: string, session: string): Promise<any> {
    if (!isUUID(id)) throw new BadRequestException('Id is not valid uuid');

    let found: Journey;
    try {
      found = await this.journeysRepository.findOne({
        where: {
          owner: { id: account.id },
          id,
        },
      });

      return Promise.resolve({
        name: found.name,
        nodes: found.visualLayout.nodes,
        edges: found.visualLayout.edges,
        segments: found.inclusionCriteria,
        isDynamic: found.isDynamic,
        isActive: found.isActive,
        isPaused: found.isPaused,
        isStopped: found.isStopped,
        isDeleted: found.isDeleted,
      });
    } catch (err) {
      this.error(err, this.findOne.name, session, account.email);
      throw err;
    }
  }

  private async getStats(audienceId?: string) {
    if (!audienceId) return {};
    const sentResponse = await this.clickhouseClient.query({
      query: `SELECT COUNT(*) FROM message_status WHERE event = 'sent' AND audienceId = {audienceId:UUID}`,
      query_params: { audienceId },
    });
    const sentData = (await sentResponse.json<any>())?.data;
    const sent = +sentData?.[0]?.['count()'] || 0;

    const deliveredResponse = await this.clickhouseClient.query({
      query: `SELECT COUNT(*) FROM message_status WHERE event = 'delivered' AND audienceId = {audienceId:UUID}`,
      query_params: { audienceId },
    });
    const deliveredData = (await deliveredResponse.json<any>())?.data;
    const delivered = +deliveredData?.[0]?.['count()'] || 0;

    const openedResponse = await this.clickhouseClient.query({
      query: `SELECT COUNT(DISTINCT(audienceId, customerId, templateId, messageId, event, eventProvider)) FROM message_status WHERE event = 'opened' AND audienceId = {audienceId:UUID}`,
      query_params: { audienceId },
    });
    const openedData = (await openedResponse.json<any>())?.data;
    const opened =
      +openedData?.[0]?.[
      'uniqExact(tuple(audienceId, customerId, templateId, messageId, event, eventProvider))'
      ];

    const openedPercentage = (opened / sent) * 100;

    const clickedResponse = await this.clickhouseClient.query({
      query: `SELECT COUNT(DISTINCT(audienceId, customerId, templateId, messageId, event, eventProvider)) FROM message_status WHERE event = 'clicked' AND audienceId = {audienceId:UUID}`,
      query_params: { audienceId },
    });
    const clickedData = (await clickedResponse.json<any>())?.data;
    const clicked =
      +clickedData?.[0]?.[
      'uniqExact(tuple(audienceId, customerId, templateId, messageId, event, eventProvider))'
      ];

    const clickedPercentage = (clicked / sent) * 100;

    const whResponse = await this.clickhouseClient.query({
      query: `SELECT COUNT(*) FROM message_status WHERE event = 'sent' AND audienceId = {audienceId:UUID} AND eventProvider = 'webhooks' `,
      query_params: {
        audienceId,
      },
    });
    const wsData = (await whResponse.json<any>())?.data;
    const wssent = +wsData?.[0]?.['count()'] || 0;

    return {
      sent,
      delivered,
      openedPercentage,
      clickedPercentage,
      wssent,
    };
  }

  /**
   * Mark a journey as deleted.
   * @param account
   * @param id
   * @param session
   * @returns
   */

  async markDeleted(account: Account, id: string, session: string) {
    try {
      return await this.journeysRepository.update(
        {
          owner: { id: account.id },
          id: id,
        },
        {
          isActive: false,
          isDeleted: true,
          isPaused: true,
          isStopped: true,
        }
      );
    } catch (err) {
      this.error(err, this.markDeleted.name, session, account.email);
      throw err;
    }
  }

  /**
   * Pause a journey.
   * @param account
   * @param id
   * @param value
   * @param session
   * @param queryRunner
   * @returns
   */
  async setPaused(
    account: Account,
    id: string,
    value: boolean,
    session: string
  ) {
    try {
      const found: Journey = await this.journeysRepository.findOneBy({
        owner: { id: account.id },
        id,
      });
      if (found?.isStopped)
        throw new HttpException('The Journey has already been stopped.', 400);
      if (!found?.isActive)
        throw new HttpException('The Journey has not been started yet.', 400);
      if (found?.isDeleted)
        throw new HttpException('The Journey has already been deleted', 400);
      if (value) {
        found.latestPause = new Date();
      } else {
        found.latestPause = null;
      }
      return await this.journeysRepository.save({
        ...found,
        isPaused: value,
      });
    } catch (error) {
      this.error(error, this.setPaused.name, session, account.email);
      throw error;
    }
  }

  /**
   * Start a journey.
   * @param account
   * @param workflowID
   * @param session
   * @returns
   */
  async start(
    account: Account,
    journeyID: string,
    session: string
  ): Promise<(string | number)[]> {
    let journey: Journey; // Workflow to update
    let customers: CustomerDocument[]; // Customers to add to primary audience
    const jobIDs: (string | number)[] = [];

    const transactionSession = await this.connection.startSession();
    await transactionSession.startTransaction();
    const queryRunner = await this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (!account) throw new HttpException('User not found', 404);

      journey = await queryRunner.manager.findOne(Journey, {
        where: {
          owner: { id: account?.id },
          id: journeyID,
        },
      });
      if (!journey) {
        throw new Error(errors.ERROR_DOES_NOT_EXIST);
      }

      if (journey.isActive || journey.isStopped || journey.isDeleted) {
        throw new Error('This journey is no longer editable.');
      }

      if (!journey.inclusionCriteria)
        throw new Error('To start journey a filter should be defined');

      const graph = new Graph();
      const steps = await this.stepsService.transactionalfindByJourneyID(
        account,
        journey.id,
        queryRunner
      );
      this.debug(
        `${JSON.stringify({ steps: steps })}`,
        this.start.name,
        session,
        account.email
      );
      for (let i = 0; i < steps.length; i++) {
        graph.setNode(steps[i].id);
        if (steps[i].metadata?.branches) {
          for (let j = 0; j < steps[i].metadata.branches.length; j++) {
            graph.setEdge(
              steps[i].id,
              steps[i].metadata.branches[j].destination
            );
          }
        } else if (steps[i].metadata?.destination) {
          graph.setEdge(steps[i].id, steps[i].metadata.destination);
        }
      }
      if (!alg.isAcyclic(graph))
        throw new Error('Flow has infinite loops, cannot start.');

      customers = await this.customersService.findByInclusionCriteria(
        account,
        journey.inclusionCriteria,
        transactionSession
      );

      const unenrolledCustomers = customers.filter(
        (customer) => customer.workflows.indexOf(journeyID) < 0
      );
      await this.CustomerModel.updateMany(
        {
          _id: { $in: unenrolledCustomers.map((customer) => customer.id) },
        },
        { $addToSet: { journeys: journeyID } }
      )
        .session(transactionSession)
        .exec();

      await this.stepsService.bulkAddToStart(
        account,
        journeyID,
        unenrolledCustomers,
        queryRunner,
        session
      );

      await queryRunner.manager.save(Journey, {
        ...journey,
        isActive: true,
        startedAt: new Date(Date.now()),
      });

      await transactionSession.commitTransaction();
      await queryRunner.commitTransaction();
    } catch (err) {
      await transactionSession.abortTransaction();
      await queryRunner.rollbackTransaction();
      this.logger.error('Error: ' + err);
      throw err;
    } finally {
      await transactionSession.endSession();
      await queryRunner.release();
    }

    return Promise.resolve(jobIDs);
  }

  /**
   * Stops a journey.
   * @param account
   * @param id
   * @param session
   * @returns
   */
  async stop(account: Account, id: string, session: string) {
    try {
      const found: Journey = await this.journeysRepository.findOneBy({
        owner: { id: account.id },
        id,
      });
      if (!found?.isActive)
        throw new HttpException('The workflow was not activated', 400);
      await this.journeysRepository.save({
        ...found,
        isStopped: true,
        isActive: false,
        isPaused: true,
      });
    } catch (err) {
      this.error(err, this.stop.name, session, account.email);
      throw err;
    }
  }

  /**
   * Update a journey using a DB transaction
   * @param account
   * @param updateJourneyDto
   * @param session
   * @param queryRunner
   * @returns
   */
  async transactionalUpdate(
    account: Account,
    updateJourneyDto: UpdateJourneyDto,
    session: string,
    queryRunner: QueryRunner
  ): Promise<Journey> {
    try {
      const journey = await queryRunner.manager.findOne(Journey, {
        where: {
          id: updateJourneyDto.id,
        },
      });

      if (!journey) throw new NotFoundException('Journey not found');
      if (journey.isActive || journey.isDeleted || journey.isPaused)
        throw new Error('Journey is no longer editable.');

      const { visualLayout, isDynamic, name, inclusionCriteria } =
        updateJourneyDto;

      return await queryRunner.manager.save(Journey, {
        ...journey,
        visualLayout,
        isDynamic,
        name,
        inclusionCriteria,
      });
    } catch (e) {
      this.error(e, this.update.name, session, account.email);
      throw e;
    }
  }

  /**
   * Update a journey.
   * @param account
   * @param updateJourneyDto
   * @param session
   * @returns
   */
  async update(
    account: Account,
    updateJourneyDto: UpdateJourneyDto,
    session: string
  ): Promise<Journey> {
    try {
      const journey = await this.journeysRepository.findOne({
        where: {
          id: updateJourneyDto.id,
        },
      });

      if (!journey) throw new NotFoundException('Journey not found');
      if (journey.isActive || journey.isDeleted || journey.isPaused)
        throw new Error('Journey is no longer editable.');

      const { isDynamic, name, inclusionCriteria } = updateJourneyDto;

      return await this.journeysRepository.save({
        ...journey,
        isDynamic,
        name,
        inclusionCriteria,
      });
    } catch (e) {
      this.error(e, this.update.name, session, account.email);
      throw e;
    }
  }

  /**
   * Update a journey.
   * @param account
   * @param updateJourneyDto
   * @param session
   * @returns
   */
  async updateLayout(
    account: Account,
    updateJourneyDto: UpdateJourneyLayoutDto,
    session: string
  ): Promise<Journey> {
    const queryRunner = this.dataSource.createQueryRunner();
    queryRunner.startTransaction();
    let err;
    try {
      let journey = await queryRunner.manager.findOne(Journey, {
        where: {
          id: updateJourneyDto.id,
        },
      });

      if (!journey) throw new NotFoundException('Journey not found');
      if (journey.isActive || journey.isDeleted || journey.isPaused)
        throw new Error('Journey is no longer editable.');

      const { nodes, edges } = updateJourneyDto;
      for (let i = 0; i < nodes.length; i++) {
        let step = await queryRunner.manager.findOne(Step, {
          where: {
            id: nodes[i].data.stepId,
          },
        });
        let relevantEdges = edges.filter((edge) => {
          return edge.source === nodes[i].id;
        });
        let metadata;
        switch (nodes[i].type) {
          case NodeType.START:
            if (relevantEdges.length > 1)
              throw new Error(
                'Cannot have more than one branch for Start Step'
              );
            metadata = new StartStepMetadata();
            metadata.destination = nodes.filter((node) => {
              return node.id === relevantEdges[0].target;
            })[0].data.stepId;
            break;
          case NodeType.EMPTY:
            break;
          case NodeType.MESSAGE:
            if (relevantEdges.length > 1)
              throw new Error(
                'Cannot have more than one branch for Message Step'
              );
            metadata = new MessageStepMetadata();
            metadata.destination = nodes.filter((node) => {
              return node.id === relevantEdges[0].target;
            })[0].data.stepId;
            metadata.channel = nodes[i].data['template']['type'];
            if (nodes[i].data['template']['selected'])
              metadata.template = nodes[i].data['template']['selected']['id'];
            break;
          case NodeType.WAIT_UNTIL:
            // metadata = new WaitUntilStepMetadata();
            // let timeBranch = nodes[i].data['branches'].filter((branch) => { branch.type === BranchType.MAX_TIME })[0]
            // if (timeBranch.timeType === TimeType.TIME_DELAY) {
            //   metadata.timeBranch = new TimeDelayStepMetadata();
            //   metadata.timeBranch.delay = new Temporal.Duration(timeBranch.delay.years, timeBranch['delay']['months'], timeBranch['delay']['weeks'], timeBranch['delay']['days'], timeBranch['delay']['hours'], timeBranch['delay']['minutes'])
            // } else if (timeBranch.timeType === TimeType.TIME_WINDOW) {
            //   metadata.timeBranch = new TimeWindowStepMetadata();
            //   metadata.timeBranch.window = new TimeWindow()
            //   metadata.timeBranch.window.from = Temporal.Instant.from(new Date(timeBranch['from']).toISOString())
            //   metadata.timeBranch.window.to = Temporal.Instant.from(new Date(timeBranch['to']).toISOString())
            // }
            // metadata.branches = [];
            // for (let i = 0; i < relevantEdges.length; i++) {
            //   if (relevantEdges[i].data['branch'].type === BranchType.MAX_TIME) metadata.timeBranch.destination = relevantEdges[i].target;
            //   else if (relevantEdges[i].data['branch'].type === BranchType.EVENT) {
            //     const branch = new AnalyticsEvent();
            //     branch.conditions =
            //     branch.provider
            //     branch.providerParams
            //     branch.destination
            //     metadata.branches.push(branch);
            //   }
            // }
            break;
          case NodeType.JUMP_TO:
            if (relevantEdges.length > 1)
              throw new Error(
                'Cannot have more than one branch for Jump To Step'
              );
            metadata = new LoopStepMetadata();
            metadata.destination = nodes.filter((node) => {
              return node.id === relevantEdges[0].target;
            })[0].data.stepId;
            break;
          case NodeType.EXIT:
            if (relevantEdges.length > 0)
              throw new Error('Cannot have any branches for Exit Step');
            metadata = new ExitStepMetadata();
            break;
          case NodeType.TIME_DELAY:
            if (relevantEdges.length > 1)
              throw new Error(
                'Cannot have more than one branch for Time Delay Step'
              );
            metadata = new TimeDelayStepMetadata();
            metadata.destination = nodes.filter((node) => {
              return node.id === relevantEdges[0].target;
            })[0].data.stepId;
            metadata.delay = new Temporal.Duration(
              nodes[i].data['delay']['years'],
              nodes[i].data['delay']['months'],
              nodes[i].data['delay']['weeks'],
              nodes[i].data['delay']['days'],
              nodes[i].data['delay']['hours'],
              nodes[i].data['delay']['minutes']
            );
            break;
          case NodeType.TIME_WINDOW:
            if (relevantEdges.length > 1)
              throw new Error(
                'Cannot have more than one branch for Time Window Step'
              );
            metadata = new TimeWindowStepMetadata();
            metadata.destination = nodes.filter((node) => {
              return node.id === relevantEdges[0].target;
            })[0].data.stepId;
            metadata.window = new TimeWindow();
            metadata.window.from = Temporal.Instant.from(
              new Date(nodes[i].data['from']).toISOString()
            );
            metadata.window.to = Temporal.Instant.from(
              new Date(nodes[i].data['to']).toISOString()
            );
            break;
          case NodeType.USER_ATTRIBUTE:
            metadata = new MultiBranchMetadata();
            break;
        }
        await queryRunner.manager.save(Step, {
          ...step,
          metadata,
        });
      }

      journey = await queryRunner.manager.save(Journey, {
        ...journey,
        visualLayout: {
          nodes,
          edges,
        },
      });
      await queryRunner.commitTransaction();
      return Promise.resolve(journey);
    } catch (e) {
      this.error(e, this.updateLayout.name, session, account.email);
      err = e;
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
      if (err) throw err;
    }
  }
}