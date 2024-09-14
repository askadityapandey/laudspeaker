import { EmailProvider } from '../interfaces/email.provider';
import { SendingParams, SetupConnectionParams, SetupWebhookParams, HandleWebhookParams } from '../interfaces/email.data';
import Mailgun from 'mailgun.js';
import formData from 'form-data';
import { ClickHouseMessage } from '../../../services/clickhouse/interfaces/clickhouse-message';
import { ClickHouseEventProvider } from '@/common/services/clickhouse';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BaseLaudspeakerService } from '@/common/services/base.laudspeaker.service';
import { createHmac } from 'crypto';
import { BaseLiquidEngineProvider } from '../../interfaces/base.provider';

@Injectable()
export class ResendProvider extends BaseLiquidEngineProvider implements EmailProvider {
  private mailgunClient: any;
  private MAILGUN_HOOKS_TO_INSTALL = [
    'clicked',
    'complained',
    'delivered',
    'opened',
    'permanent_fail',
    'temporary_fail',
    'unsubscribed',
  ];

  constructor(private apiKey: string, private domain: string) {
    super();
    const mailgun = new Mailgun(formData);
    this.mailgunClient = mailgun.client({ username: 'api', key: this.apiKey });
  }

  async fetchSetupInfo(apiKey: string): Promise<SetupInfo> {
    const resend = new Resend(key);
    const response: any = await resend.domains.list();
    const domains = response['data']['data'];
    const verified = _.filter(domains, ['status', 'verified']);
    return verified;
  }

  async sendMessage(data: SendingParams): Promise<ClickHouseMessage[]> {
    try {
      const resend = new Resend(key);
      const resendMessage = await resend.emails.send({
        from: `${from} <${email}@${domain}>`,
        to: to,
        cc: cc,
        subject: subjectWithInsertedTags,
        html: textWithInsertedTags,
        tags: [
          {
            name: 'stepId',
            value: stepID,
          },
          {
            name: 'customerId',
            value: customerID,
          },
          {
            name: 'templateId',
            value: String(templateID),
          },
          {
            name: 'accountId',
            value: accountID,
          },
        ],
      });
      this.log(
        `${JSON.stringify({
          message: 'Email sent via: ' + eventProvider,
          result: resendMessage,
          to,
          subjectWithInsertedTags,
        })}}`,
        this.handleEmail.name,
        session,
        account.email
      );
      msg = resendMessage;
      ret = [
        {
          stepId: stepID,
          createdAt: new Date(),
          customerId: customerID,
          event: 'sent',
          eventProvider: ClickHouseEventProvider.RESEND,
          messageId: resendMessage.data ? resendMessage.data.id : '',
          templateId: String(templateID),
          workspaceId: workspace.id,
          processed: false,
        },
      ];
    } catch (error) {
      return [{
        stepId: data.stepID,
        createdAt: new Date(),
        customerId: data.customerID,
        event: 'error',
        eventProvider: ClickHouseEventProvider.MAILGUN,
        messageId: '',
        templateId: String(data.templateID),
        workspaceId: data.workspaceId,
        processed: false,
      }];
    }
  }

  async setupCallbackHandler(mailgunAPIKey: string, sendingDomain: string): Promise<void> {

  }

  async handleCallbackData(req: any, body: any, session: string) {
    const step = await this.stepRepository.findOne({
      where: {
        id: body.data.tags.stepId,
      },
      relations: ['workspace'],
    });

    const payload = req.rawBody.toString('utf8');
    const headers = req.headers;

    const webhook = new Webhook(step.workspace.resendSigningSecret);

    try {
      const event: any = webhook.verify(payload, headers);
      const clickHouseRecord: ClickHouseMessage = {
        workspaceId: step.workspace.id,
        stepId: event.data.tags.stepId,
        customerId: event.data.tags.customerId,
        templateId: String(event.data.tags.templateId),
        messageId: event.data.email_id,
        event: event.type.replace('email.', ''),
        eventProvider: ClickHouseEventProvider.RESEND,
        processed: false,
        createdAt: new Date(),
      };
      await this.insertMessageStatusToClickhouse([clickHouseRecord], session);
    } catch (e) {
      throw new ForbiddenException(e, 'Invalid signature');
    }
  }
}
