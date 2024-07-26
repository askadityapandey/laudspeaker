import { OnModuleDestroy } from '@nestjs/common';
import { createClient } from '@clickhouse/client';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ClickHouseClient implements OnModuleDestroy {
  private client;

  constructor(options: Record <string, any>) {
    this.client = createClient(options);
  }

  async query(queryDetails) {
    return this.client.query(queryDetails);
  }

  async insert(insertDetails) {
    return this.client.insert(insertDetails);
  }

  async onModuleDestroy() {
    return this.client?.close();
  }
}