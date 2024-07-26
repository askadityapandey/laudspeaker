import { Module } from '@nestjs/common';
import { ClickhouseClient } from './clickhouse-client';

@Module({
  providers: [ClickhouseClient],
  exports: [],
})
export class ClickhouseModule {}
