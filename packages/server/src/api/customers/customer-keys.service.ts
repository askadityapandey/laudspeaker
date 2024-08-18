/* eslint-disable no-case-declarations */
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, QueryRunner, Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import * as _ from 'lodash';
import { CacheService } from '@/common/services/cache.service';
import { BadRequestException, forwardRef, HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { CustomerKey } from './entities/customer-keys.entity';
import { ModifyAttributesDto, UpdateAttributeDto } from './dto/modify-attributes.dto';
import {
  KEYS_TO_SKIP,
  validateKeyForMutations,
} from '@/utils/customer-key-name-validator';
import { Account } from '../accounts/entities/accounts.entity';
import { UpdatePK_DTO } from './dto/update-pk.dto';
import { CustomersService } from './customers.service';
import { AttributeTypeName } from './entities/attribute-type.entity';

@Injectable()
export class CustomerKeysService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
    private dataSource: DataSource,
    @InjectRepository(CustomerKey)
    public customerKeysRepository: Repository<CustomerKey>,
    @Inject(CacheService) private cacheService: CacheService,
    @Inject(forwardRef(() => CustomersService)) private customersService: CustomersService,
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


  async createKey(
    account: Account,
    key: string,
    type: AttributeTypeName,
    dateFormat: unknown,
    session: string,
    isArray?: boolean
  ) {
    const workspace = account?.teams?.[0]?.organization?.workspaces?.[0];

    if (!Object.values(AttributeTypeName).includes(type)) {
      throw new BadRequestException(
        `Type: ${type} can't be used for attribute creation.`
      );
    }

    validateKeyForMutations(key);

    const previousKey = await this.customerKeysRepository.findOne({
      where: {
        name: key.trim(),
        workspace: { id: workspace.id },
        attribute_type: { name: type, },
      }
    });

    if (previousKey) {
      throw new HttpException(
        'Similar key already exist, please use different name or type',
        503
      );
    }

    const newKey = await this.customerKeysRepository.save({
      name: key.trim(),
      attribute_type: { name: type },
      workspace: { id: workspace.id },
    });
    return newKey;
  }

  async deleteKey(account: Account, id: string, session: string, queryRunner: QueryRunner) {
    const workspace = account?.teams?.[0]?.organization?.workspaces?.[0];

    const attributeInDb = await this.customerKeysRepository.findOne({
      where: {
        id: parseInt(id),
        workspace: { id: workspace.id },
      }
    });

    if (!attributeInDb) {
      throw new HttpException('Attribute not found', 404);
    }

    await this.customersService.deleteAllKeys(workspace.id, attributeInDb.name, session, queryRunner)
    await this.customerKeysRepository.delete({ id: attributeInDb.id });
  }

  async modifyKeys(
    account: Account,
    modifyAttributes: ModifyAttributesDto,
    session: string,
    queryRunner?: QueryRunner
  ) {
    const { created, updated, deleted } = modifyAttributes;

    for (const createdAttribute of created) {
      try {
        const { key, type, isArray, dateFormat } = createdAttribute; // TODO: arrays handling

        await this.createKey(
          account,
          key,
          type,
          dateFormat,
          undefined,
          isArray
        );
      } catch (e) {
        console.error(e);
      }
    }

    for (const updateAttributeDto of updated) {
      try {
        await this.updateKey(account, updateAttributeDto, session, queryRunner);
      } catch (e) {
        console.error(e);
      }
    }

    for (const deleteAttirubuteDto of deleted) {
      try {
        await this.deleteKey(account, deleteAttirubuteDto.id, session, queryRunner);
      } catch (e) {
        console.error(e);
      }
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

    if (queryRunner) {
      const attributeInDb = await queryRunner.manager.findOne(CustomerKey, {
        where: {
          workspace: { id: workspace.id },
          id: parseInt(updateAttributeDto.id),
        }
      });

      if (!attributeInDb) {
        throw new HttpException('Attribute not found', 404);
      }

      const { key } = updateAttributeDto;

      await queryRunner.manager
        .createQueryBuilder(CustomerKey, 'key')
        .update()
        .set({
          [key.trim()]: () => `"${attributeInDb.name}"`,
        })
        .where("workspaceId = :workspaceId", { workspaceId: workspace.id })
        .execute();

      attributeInDb.name = key
      await queryRunner.manager.save(CustomerKey, attributeInDb);
    } else {
      const attributeInDb = await this.customerKeysRepository.findOne({
        where: {
          workspace: { id: workspace.id },
          id: parseInt(updateAttributeDto.id),
        }
      });

      if (!attributeInDb) {
        throw new HttpException('Attribute not found', 404);
      }

      const { key } = updateAttributeDto;

      await this.customerKeysRepository
        .createQueryBuilder()
        .update()
        .set({
          [key.trim()]: () => `"${attributeInDb.name}"`,
        })
        .where("workspaceId = :workspaceId", { workspaceId: workspace.id })
        .execute();

      attributeInDb.name = key
      await this.customerKeysRepository.save(attributeInDb);
    }
  }

  async updatePrimaryKey(
    account: Account,
    updateDTO: UpdatePK_DTO,
    session: string,
    queryRunner?: QueryRunner
  ) {
    const workspace = account?.teams?.[0]?.organization?.workspaces?.[0];

    if (queryRunner) {
      const pk = await queryRunner.manager.findOne(CustomerKey, {
        where: {
          workspace: { id: workspace.id },
          is_primary: true,
        }
      });

      const keyDuplicates = await this.customersService.getDuplicates(updateDTO.key, workspace.id, queryRunner)

      if (keyDuplicates) {
        throw new HttpException(
          "Selected primary key can't be used because of duplicated or missing values. Primary key values must exist and be unique",
          HttpStatus.BAD_REQUEST
        );
      }

      const newPK = await queryRunner.manager.findOne(CustomerKey, {
        where: {
          workspace: { id: workspace.id },
          is_primary: false,
          name: updateDTO.key
        }
      });

      if (!newPK) {
        throw new HttpException(
          'Passed attribute for new PK not exist, please check again or select another one.',
          HttpStatus.BAD_REQUEST
        );
      }

      if (pk && pk.id === newPK.id) {
        pk.is_primary = true;
      } else {
        if (pk) {
          pk.is_primary = false;
          await queryRunner.manager.save(CustomerKey, pk);
        }

        newPK.is_primary = true;
        await queryRunner.manager.save(CustomerKey, newPK);
        //TODO: Create index on PK
      }

    } else {
      const pk = await this.customerKeysRepository.findOne({
        where: {
          workspace: { id: workspace.id },
          is_primary: true,
        }
      });

      const keyDuplicates = await this.customersService.getDuplicates(updateDTO.key, workspace.id, queryRunner)

      if (keyDuplicates) {
        throw new HttpException(
          "Selected primary key can't be used because of duplicated or missing values. Primary key values must exist and be unique",
          HttpStatus.BAD_REQUEST
        );
      }

      const newPK = await this.customerKeysRepository.findOne({
        where: {
          workspace: { id: workspace.id },
          is_primary: false,
          name: updateDTO.key
        }
      });

      if (!newPK) {
        throw new HttpException(
          'Passed attribute for new PK not exist, please check again or select another one.',
          HttpStatus.BAD_REQUEST
        );
      }

      if (pk && pk.id === newPK.id) {
        pk.is_primary = true;
      } else {
        if (pk) {
          pk.is_primary = false;
          await this.customerKeysRepository.save(pk);
        }

        newPK.is_primary = true;
        await this.customerKeysRepository.save(newPK);
        //TODO: Create index on PK
      }
    }
  }


  public async getPossibleAttributes(
    account: Account,
    session: string,
    key = '',
    type?: string | string[],
    isArray?: boolean,
    removeLimit?: boolean
  ) {
    const workspace = account?.teams?.[0]?.organization?.workspaces?.[0];
    const queryBuilder = this.customerKeysRepository.createQueryBuilder("customerKeys")
      .where("customerKeys.workspaceId = :workspaceId", { workspaceId: workspace.id })
      .andWhere("customerKeys.name ILIKE :key", { key: `%${key}%` }); // Case-insensitive search

    if (type !== null && !(type instanceof Array)) {
      queryBuilder.andWhere("customerKeys.attribute_type.name = :type", { type });
    } else if (type instanceof Array) {
      queryBuilder.andWhere(
        new Brackets(qb => {
          type.forEach((el, index) => {
            qb.orWhere(`customerKeys.attribute_type.name = :type${index}`, { [`type${index}`]: el });
          });
        })
      );
    }

    const attributes = await queryBuilder.getMany();

    return (
      [...attributes]
        .map((el) => ({
          id: el.id,
          key: el.name,
          type: el.attribute_type.name,
          dateFormat: el.attribute_parameter,
          isArray: el.attribute_parameter,
          isPrimary: el.is_primary,
        }))
        // @ts-ignore
        .filter((el) => el.type !== 'undefined')
    );
  }
}
