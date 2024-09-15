import {
  Body,
  Controller,
  Logger,
  Post,
  Req,
  Res,
  Inject,
  Query,
  UseInterceptors,
  RawBodyRequest,
  HttpStatus,
  HttpCode,
  Headers,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WebhooksService } from './webhooks.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { randomUUID } from 'crypto';
import { RavenInterceptor } from 'nest-raven';
import { raw } from 'body-parser'; // Ensure you're using raw body parser for Stripe webhooks

@Controller('webhooks')
export class WebhooksController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
    private webhooksService: WebhooksService
  ) {}

  log(message, method, session, user = 'ANONYMOUS') {
    this.logger.log(
      message,
      JSON.stringify({
        class: WebhooksController.name,
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
        class: WebhooksController.name,
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
        class: WebhooksController.name,
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
        class: WebhooksController.name,
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
        class: WebhooksController.name,
        method: method,
        session: session,
        user: user,
      })
    );
  }

  @Post('sendgrid')
  @UseInterceptors(new RavenInterceptor())
  public async processSendgridData(@Req() req: Request, @Body() data: any) {
    const session = randomUUID();
    const signature = req.headers[
      'x-twilio-email-event-webhook-signature'
    ] as string;
    const timestamp = req.headers[
      'x-twilio-email-event-webhook-timestamp'
    ] as string;
    await this.webhooksService.processSendgridData(
      signature,
      timestamp,
      session,
      data
    );
  }

  @Post('stripe')
  @HttpCode(HttpStatus.OK) // Always respond quickly to webhook events
  @UseInterceptors(new RavenInterceptor())
  public async handleStripeWebhook(@Req() req: any, @Res() res: Response) {
    const session = randomUUID();
    const signature = req.headers['stripe-signature'];
    const payload = req.rawBody;
    //const payload = req.body; // Directly accessing raw buffer

    try {
      // Assuming `processStripeEvent` expects a raw buffer and a signature
      const event = await this.webhooksService.processStripePayment(
        payload,
        signature,
        session
      );
      res.status(200).json({ received: true });
    } catch (error) {
      res.status(400).json({ error: error });
    }
  }
}
