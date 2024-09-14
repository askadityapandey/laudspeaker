import { Module } from '@nestjs/common';
import { SmsController } from './sms.controller';

@Module({
  imports: [],
  controllers: [SmsController],
})
export class SmsModule {}
