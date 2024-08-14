/* eslint-disable no-case-declarations */
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import * as _ from 'lodash';
import { CacheService } from '@/common/services/cache.service';
import { HttpException, Inject, Injectable, Logger } from '@nestjs/common';
import { CustomerKey } from './entities/customer-keys.entity';
import { UpdateAttributeDto } from './dto/modify-attributes.dto';
import {
  KEYS_TO_SKIP,
  validateKeyForMutations,
} from '@/utils/customer-key-name-validator';
import { Account } from '../accounts/entities/accounts.entity';

@Injectable()
export class CustomerKeysService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
    private dataSource: DataSource,
    @InjectRepository(CustomerKey)
    public customerKeysRepository: Repository<CustomerKey>,
    @Inject(CacheService) private cacheService: CacheService,
  ) { }

  log(message, method, session, user = 'ANONYMOUS') {
    this.logger.log(
      message,
      JSON.stringify({
        class: CustomerKeysService.name,
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
        class: CustomerKeysService.name,
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
        class: CustomerKeysService.name,
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
        class: CustomerKeysService.name,
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
        class: CustomerKeysService.name,
        method: method,
        session: session,
        user: user,
      })
    );
  }

  /**
   * Returns an array of all the customer keys for a workspace; Postgres transaction compatible.
   * @param workspaceId 
   * @param session 
   * @param queryRunner 
   */
  async getAll(workspaceId: string, session: string, queryRunner?: QueryRunner): Promise<CustomerKey[]> {
    if (queryRunner) {
      return await queryRunner.manager.find(CustomerKey, {
        where: {
          workspace: { id: workspaceId }
        }
      });
    } else {
      return await this.customerKeysRepository.find({
        where: {
          workspace: { id: workspaceId }
        }
      });
    }
  }

  /**
   * Returns a customer key object representing the primary key for a workspace
   * @param workspaceId 
   * @param session 
   * @param queryRunner 
   * @returns 
   */
  async getPrimaryKey(workspaceId: string, session: string, queryRunner?: QueryRunner): Promise<CustomerKey> {
    if (queryRunner) {
      return await queryRunner.manager.findOne(CustomerKey, {
        where: {
          workspace: { id: workspaceId },
          is_primary: true,
        }
      });
    } else {
      return await this.customerKeysRepository.findOne({
        where: {
          workspace: { id: workspaceId },
          is_primary: true,
        }
      });
    }
  }


  /**
   * 
   * @param keyName 
   * @param workspaceId 
   * @param session 
   * @param queryRunner 
   * @returns 
   */
  async getKeyByName(keyName: string, workspaceId: string, session: string, queryRunner?: QueryRunner): Promise<CustomerKey> {
    if (queryRunner) {
      return await queryRunner.manager.findOne(CustomerKey, {
        where: {
          workspace: { id: workspaceId },
          name: keyName,
        }
      });
    } else {
      return await this.customerKeysRepository.findOne({
        where: {
          workspace: { id: workspaceId },
          name: keyName,
        }
      });
    }
  }

  /**
   * 
   * @param account 
   * @param updateAttributeDto 
   * @param session 
   * @param queryRunner 
   */
  async updateKey(account: Account, updateAttributeDto: UpdateAttributeDto, session: string, queryRunner?: QueryRunner) {
    validateKeyForMutations(updateAttributeDto.key);

    const workspace = account?.teams?.[0]?.organization?.workspaces?.[0];

    const attributeInDb = await this.CustomerKeysModel.findOne({
      _id: updateAttributeDto.id,
      workspaceId: workspace.id,
    }).exec();

    if (!attributeInDb) {
      throw new HttpException('Attribute not found', 404);
    }

    const { key } = updateAttributeDto;

    await this.CustomerModel.updateMany(
      {
        workspaceId: workspace.id,
      },
      {
        $rename: {
          [attributeInDb.key]: key.trim(),
        },
      }
    );

    await attributeInDb.updateOne({
      $set: {
        key,
      },
    });
  }

}
