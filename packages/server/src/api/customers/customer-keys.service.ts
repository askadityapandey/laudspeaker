/* eslint-disable no-case-declarations */
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, QueryBuilder, QueryRunner, Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import * as _ from 'lodash';
import { CacheService } from '../../common/services/cache.service';
import { BadRequestException, forwardRef, HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { CustomerKey } from './entities/customer-keys.entity';
import { ModifyAttributesDto, UpdateAttributeDto } from './dto/modify-attributes.dto';
import {
  KEYS_TO_SKIP,
  validateKeyForMutations,
} from '../../utils/customer-key-name-validator';
import { Account } from '../accounts/entities/accounts.entity';
import { UpdatePK_DTO } from './dto/update-pk.dto';
import { CustomersService } from './customers.service';
import { AttributeType, AttributeTypeName } from './entities/attribute-type.entity';
import { AttributeParameter } from './entities/attribute-parameter.entity';

@Injectable()
export class CustomerKeysService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
    private dataSource: DataSource,
    @InjectRepository(AttributeParameter)
    public attributeParameterRepository: Repository<AttributeParameter>,
    @InjectRepository(AttributeType)
    public attributeTypeRepository: Repository<AttributeType>,
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
    type_id: string,
    session: string,
    attribute_subtype_id?: string,
    attribute_parameter_id?: string,
    queryRunner?: QueryRunner
  ) {
    let runner;
    if (queryRunner) runner = await queryRunner.manager.getRepository(CustomerKey);
    else runner = await this.customerKeysRepository;

    const workspace = account?.teams?.[0]?.organization?.workspaces?.[0];

    validateKeyForMutations(key);

    const findKeyQuery = {
      where: {
        name: key.trim(),
        workspace: { id: workspace.id },
        attribute_type: { id: parseInt(type_id) },
      }
    };
    const createKeyQuery = {
      name: key.trim(),
      attribute_type: { id: parseInt(type_id) },
      workspace: { id: workspace.id },
      attribute_subtype_id: attribute_subtype_id ? { id: parseInt(attribute_subtype_id) } : undefined,
      attribute_parameter_id: attribute_parameter_id ? { id: parseInt(attribute_parameter_id) } : undefined,
      is_primary: false,
    };

    const previousKey = await runner.findOne(findKeyQuery);

    if (previousKey) {
      throw new HttpException(
        'Similar key already exist, please use different name or type',
        503
      );
    }

    const newKey = await runner.save(createKeyQuery);

    return newKey;
  }

  async deleteKey(account: Account, id: number, session: string, queryRunner: QueryRunner) {
    if (queryRunner) {
      const workspace = account?.teams?.[0]?.organization?.workspaces?.[0];

      const attributeInDb = await queryRunner.manager.findOne(CustomerKey, {
        where: {
          id: id,
          workspace: { id: workspace.id },
        }
      });

      if (!attributeInDb) {
        throw new HttpException('Attribute not found', 404);
      }

      await this.customersService.deleteAllKeys(workspace.id, attributeInDb.name, session, queryRunner)
      await queryRunner.manager.delete(CustomerKey, { id: attributeInDb.id });
    } else {
      const workspace = account?.teams?.[0]?.organization?.workspaces?.[0];

      const attributeInDb = await this.customerKeysRepository.findOne({
        where: {
          id: id,
          workspace: { id: workspace.id },
        }
      });

      if (!attributeInDb) {
        throw new HttpException('Attribute not found', 404);
      }

      await this.customersService.deleteAllKeys(workspace.id, attributeInDb.name, session, queryRunner)
      await this.customerKeysRepository.delete({ id: attributeInDb.id });
    }
  }

  /**
   * Modify cutomer attrubites
   * 
   * Note: Creates query runner automatically
   * @param account 
   * @param modifyAttributes 
   * @param session 
   */
  async modifyKeys(
    account: Account,
    modifyAttributes: ModifyAttributesDto,
    session: string,
  ) {
    let err;
    const { created, updated, deleted } = modifyAttributes;

    const queryRunner = await this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const createdAttribute of created) {
        const { name, attribute_type, attribute_subtype, attribute_parameter } = createdAttribute;
        await this.createKey(
          account,
          name,
          attribute_type.id.toString(),
          session,
          attribute_subtype,
          attribute_parameter,
          queryRunner
        );
      }

      for (const updateAttributeDto of updated) {
        await this.updateKey(account, updateAttributeDto, session, queryRunner);
      }

      for (const deleteAttirubuteDto of deleted) {
        await this.deleteKey(account, deleteAttirubuteDto.id, session, queryRunner);
      }
      await queryRunner.commitTransaction();
    } catch (e) {
      err = e;
      await queryRunner.rollbackTransaction();
    }
    finally {
      await queryRunner.release();
      if (err) throw err;
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

    let runner;
    if (queryRunner) runner = await queryRunner.manager.getRepository(CustomerKey);
    else runner = await this.customerKeysRepository;

    const workspace = account?.teams?.[0]?.organization?.workspaces?.[0];

    const pk = await runner.manager.findOne(CustomerKey, {
      where: {
        workspace: { id: workspace.id },
        is_primary: true,
      }
    });

    const keyDuplicates = await this.customersService.getDuplicates(updateDTO.name, workspace.id, queryRunner)

    if (keyDuplicates) {
      throw new HttpException(
        "Selected primary key can't be used because of duplicated or missing values. Primary key values must exist and be unique",
        HttpStatus.BAD_REQUEST
      );
    }

    const newPK = await runner.manager.findOne(CustomerKey, {
      where: {
        workspace: { id: workspace.id },
        name: updateDTO.name
      }
    });

    // Case: Specified attribute doesnt exist
    if (!newPK) {
      throw new HttpException(
        'The specified customer attribute does not exist, please try a different attribute.',
        HttpStatus.BAD_REQUEST
      );
    }

    // Case: Specified attribute is already the primary key
    if (newPK.is_primary) return;

    // Case: there was previously a primary key
    if (pk) {
      pk.is_primary = false;
      await runner.manager.save(CustomerKey, pk);
    }

    newPK.is_primary = true;
    await runner.manager.save(CustomerKey, newPK);
  }


  public async getPossibleAttributes(
    account: Account,
    session: string,
    key = '',
    type?: string | string[],
    removeLimit?: boolean,
    queryRunner?: QueryRunner
  ) {
    const workspace = account?.teams?.[0]?.organization?.workspaces?.[0];
    if (queryRunner) {
      const queryBuilder = queryRunner.manager.createQueryBuilder(CustomerKey, "customerKeys")
        .leftJoinAndSelect("customerKeys.attribute_type", "attributeType") // Join the attribute_type relation
        .where("customerKeys.workspaceId = :workspaceId", { workspaceId: workspace.id })
        .andWhere("customerKeys.name ILIKE :key", { key: `%${key}%` }); // Case-insensitive search

      if (type !== null && !(type instanceof Array)) {
        queryBuilder.andWhere("attributeType.name = :type", { type });
      } else if (type instanceof Array) {
        queryBuilder.andWhere(
          new Brackets(qb => {
            type.forEach((el, index) => {
              qb.orWhere(`attributeType.name = :type${index}`, { [`type${index}`]: el });
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
            type: el.attribute_type?.name,
            dateFormat: `${el.attribute_parameter?.display_value}, (${el.attribute_parameter.example})`,
            isArray: el.attribute_type?.name === AttributeTypeName.ARRAY,
            isPrimary: el.is_primary,
          }))
          // @ts-ignore
          .filter((el) => el.type !== 'undefined')
      );
    } else {
      const queryBuilder = this.customerKeysRepository.createQueryBuilder("customerKeys")
        .leftJoinAndSelect("customerKeys.attribute_type", "attributeType")
        .where("customerKeys.workspace_id = :workspaceId", { workspaceId: workspace.id })
        .andWhere("customerKeys.name ILIKE :key", { key: `%${key}%` });

      if (type !== null && !(type instanceof Array)) {
        queryBuilder.andWhere("attributeType.name = :type", { type });
      } else if (type instanceof Array) {
        queryBuilder.andWhere(
          new Brackets(qb => {
            type.forEach((el, index) => {
              qb.orWhere(`attributeType.name = :type${index}`, { [`type${index}`]: el });
            });
          })
        );
      }

      const attributes = await queryBuilder.getMany();

      return (
        [...attributes]
          .map((el) => ({
            id: el.id,
            name: el.name,
            attribute_type: el.attribute_type,
            // dateFormat: `${el.attribute_parameter?.display_value}, (${el.attribute_parameter?.example})`,
            // isArray: el.attribute_type?.name === AttributeTypeName.ARRAY,
            is_primary: el.is_primary,
          }))
          // @ts-ignore
          .filter((el) => el.type !== 'undefined')
      );
    }
  }

  /**
   * 
   * @param account 
   * @param session 
   * @returns 
   */
  async getPossibleAttributeTypes(account: Account, session: string): Promise<AttributeType[]> {
    return await this.attributeTypeRepository.find();
  }

  /**
   * 
   * @param account 
   * @param session 
   * @returns 
   */
  async getPossibleAttributeParameters(account: Account, session: string): Promise<AttributeParameter[]> {
    return await this.attributeParameterRepository.find();
  }
}
