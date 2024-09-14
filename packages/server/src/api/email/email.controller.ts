import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Body,
  Req,
  Inject,
  UseInterceptors,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import Mailgun from 'mailgun.js';
import FormData from 'form-data';
import * as _ from 'lodash';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SendEmailDto } from './dto/send-email.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../accounts/entities/accounts.entity';
import { Request } from 'express';
import { Audience } from '../audiences/entities/audience.entity';
import * as __ from 'async-dash';
import { CustomersService } from '../customers/customers.service';
import { RavenInterceptor } from 'nest-raven';
import { Resend } from 'resend';
import { QueueType } from '@/common/services/queue/types/queue-type';
import { Producer } from '@/common/services/queue/classes/producer';

@Controller('email')
export class EmailController {
  constructor(
    @InjectRepository(Account)
    private usersRepository: Repository<Account>,
    @InjectRepository(Audience)
    private audienceRepository: Repository<Audience>,
    @Inject(CustomersService)
    private readonly customersService: CustomersService
  ) {}

  @UseInterceptors(new RavenInterceptor())
  @Post('send')
  @UseGuards(JwtAuthGuard)
  async send(@Req() { user }: Request, @Body() sendEmailDto: SendEmailDto) {
    const found = <Account>user;

    const workspace = found.teams?.[0]?.organization?.workspaces?.[0];

    await Producer.add(QueueType.MESSAGE, {
      trackingEmail: found.email,
      accountId: found.id,
      key: workspace.mailgunAPIKey,
      from: workspace.sendingName,
      domain: workspace.sendingDomain,
      email: workspace.sendingEmail,
      to: sendEmailDto.to,
      subject: sendEmailDto.subject,
      text: sendEmailDto.text,
    }, 'email');
  }

  @UseInterceptors(new RavenInterceptor())
  @Post('send/:audienceName')
  @UseGuards(JwtAuthGuard)
  async sendBatch(
    @Req() { user }: Request,
    @Body() sendEmailDto: SendEmailDto,
    @Param('audienceName') name: string
  ) {
    const found = <Account>user;
    const workspace = found?.teams?.[0]?.organization?.workspaces?.[0];
    const audienceObj = await this.audienceRepository.findOneBy({
      owner: { id: found.id },
      name: name,
    });
    const jobs = await Promise.all(
      audienceObj.customers.map(async (customerId) => {
        const { email } = (
          await this.customersService.findById(found, customerId)
        ).toObject();

        return {
          accountId: found.id,
          key: workspace.mailgunAPIKey,
          from: workspace.sendingName,
          domain: workspace.sendingDomain,
          email: workspace.sendingEmail,
          to: email,
          subject: sendEmailDto.subject,
          text: sendEmailDto.text,
        };
      })
    );
    await Producer.addBulk(QueueType.MESSAGE,
      jobs,
      'email');
  }
}
