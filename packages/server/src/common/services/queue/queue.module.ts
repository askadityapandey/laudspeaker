import { DynamicModule, Module } from '@nestjs/common';
import { QueueExplorer } from './queue.explorer';
import { DiscoveryModule } from '@nestjs/core';

@Module({})
export class QueueModule {
  static forRoot(options: Record<string, any>): DynamicModule {
    // const connection = await this.connect();

    // const queueProviders = createQueueConsumerProviders(optionsArr);

    return {
      module: QueueModule,
      imports: [DiscoveryModule],
      providers: [QueueExplorer],
      // exports: queueProviders,
    };

    // return {
    //   module: QueueModule,
    //   providers: [
    //     {
    //       provide: 'QUEUE_CONFIG',
    //       useValue: connection,
    //     },
    //     QueueConsumerService,
    //     QueueProducerService
    //   ],
    //   exports: [QueueConsumerService, QueueProducerService],
    // };
  }
}