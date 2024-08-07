import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Customer } from './entities/customer.entity';
import {
  CustomerKeys,
  CustomerKeysSchema,
} from './schemas/customer-keys.schema';
import { AccountsModule } from '../accounts/accounts.module';
import { SegmentsModule } from '../segments/segments.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '../accounts/entities/accounts.entity';
import { EventsModule } from '../events/events.module';
import { StepsModule } from '../steps/steps.module';
import { CustomersConsumerService } from './customers.consumer';
import { KafkaModule } from '../kafka/kafka.module';
import { JourneysModule } from '../journeys/journeys.module';
import { S3Service } from '../s3/s3.service';
import { Imports } from './entities/imports.entity';
import { ImportProcessor } from './imports.processor';
import { JourneyLocationsService } from '../journeys/journey-locations.service';
import { JourneyLocation } from '../journeys/entities/journey-location.entity';
import { SegmentsService } from '../segments/segments.service';
import { Segment } from '../segments/entities/segment.entity';
import { SegmentCustomers } from '../segments/entities/segment-customers.entity';
import { CustomerChangeProcessor } from './processors/customers.processor';
import { CacheService } from '@/common/services/cache.service';

function getProvidersList() {
  let providerList: Array<any> = [
    CustomersService,
    S3Service,
    JourneyLocationsService,
    CacheService,
  ];

  if (process.env.LAUDSPEAKER_PROCESS_TYPE == 'QUEUE') {
    providerList = [
      ...providerList,
      ImportProcessor,
      CustomersConsumerService,
      CustomerChangeProcessor,
    ];
  }

  return providerList;
}

function getExportsList() {
  let exportList: Array<any> = [CustomersService];

  if (process.env.LAUDSPEAKER_PROCESS_TYPE == 'QUEUE') {
    exportList = [
      ...exportList,
      CustomersConsumerService,
      CustomerChangeProcessor,
    ];
  }

  return exportList;
}

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CustomerKeys.name, schema: CustomerKeysSchema },
    ]),
    AccountsModule,
    SegmentsModule,
    EventsModule,
    StepsModule,
    TypeOrmModule.forFeature([
      Account,
      Customer,
      Imports,
      JourneyLocation,
      Segment,
      SegmentCustomers,
    ]),
    KafkaModule,
    JourneysModule,
  ],
  controllers: [CustomersController],
  providers: getProvidersList(),
  exports: getExportsList(),
})
export class CustomersModule { }
