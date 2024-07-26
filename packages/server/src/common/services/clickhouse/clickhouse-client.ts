import { OnModuleDestroy } from '@nestjs/common';
import { createClient } from '@clickhouse/client';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ClickHouseClient implements OnModuleDestroy {
  private client;

  private readonly insertAsyncSettings = {
    date_time_input_format: 'best_effort',
    async_insert: 1,
    wait_for_async_insert: 1,
    async_insert_max_data_size:
      process.env.CLICKHOUSE_MESSAGE_STATUS_ASYNC_MAX_SIZE
      ? +process.env.CLICKHOUSE_MESSAGE_STATUS_ASYNC_MAX_SIZE
      : 1000000,
    async_insert_busy_timeout_ms: 
      process.env.CLICKHOUSE_MESSAGE_STATUS_ASYNC_TIMEOUT_MS
      ? +process.env.CLICKHOUSE_MESSAGE_STATUS_ASYNC_TIMEOUT_MS
      : 1000,
  };

  constructor(options: Record <string, any>) {
    this.client = createClient(options);
  }

  async query(queryDetails) {
    return this.client.query(queryDetails);
  }

  async insert(insertDetails) {
    return this.client.insert(insertDetails);
  }

  async insertAsync(insertAsyncDetails) {
    const insertOptions = {
      ...insertAsyncDetails,
      clickhouse_settings: {
        ...this.insertAsyncSettings
      },
    };

    return this.client.insert(insertOptions);
  }

  async onModuleDestroy() {
    await this.client?.close();
  }
}