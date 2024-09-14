import { EmailProvider } from '../interfaces/email.provider';
import { CallbackData, Credentials, MailgunCallbackData, MailgunCredentials, MailgunProviderData, MailgunSendingData, MailgunSetupData, ProviderData, SendingData, SetupData } from '../interfaces/email.data';
import Mailgun from 'mailgun.js';
import formData from 'form-data';
import FormData from 'form-data';
import { ClickHouseMessage } from '../../../services/clickhouse/interfaces/clickhouse-message';
import { ClickHouseEventProvider } from '@/common/services/clickhouse';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { BaseLiquidEngineProvider } from '../../interfaces/base.provider';
import _ from 'lodash';
import Client from 'mailgun.js/client';
import { MessagesSendResult } from 'mailgun.js/interfaces/Messages';

@Injectable()
export class MailgunProvider extends BaseLiquidEngineProvider implements EmailProvider {
  private static readonly MAILGUN_API_USERNAME = `api`;
  private static readonly MAILGUN_API_BASE_URL = `https://api.mailgun.net/v3`;
  private static readonly MAILGUN_HOOKS_TO_INSTALL = [
    'clicked',
    'complained',
    'delivered',
    'opened',
    'permanent_fail',
    'temporary_fail',
    'unsubscribed',
  ];
  private static readonly MAILGUN_DOMAINS_TO_FETCH = [`state`, `active`];

  constructor() {
    super();
  }

  async fetch(creds: Credentials<MailgunCredentials>): Promise<ProviderData<MailgunProviderData>> {
    const { credentials, metadata } = creds;
    const mailgun = new Mailgun(FormData);
    const mg = mailgun.client({ username: MailgunProvider.MAILGUN_API_USERNAME, key: credentials.apiKey });
    return { data: { domains: _.filter(await mg.domains.list(), MailgunProvider.MAILGUN_DOMAINS_TO_FETCH) } };
  }

  async send(creds: Credentials<MailgunCredentials>, sendingData: SendingData<MailgunSendingData>): Promise<ClickHouseMessage[]> {
    const { data, metadata } = sendingData;
    const { credentials, } = creds;
    let textWithInsertedTags: string, subjectWithInsertedTags: string;
    let record: ClickHouseMessage = {
      createdAt: new Date(),
      stepId: metadata.stepID,
      customerId: metadata.customerID,
      event: undefined,
      eventProvider: ClickHouseEventProvider.MAILGUN,
      messageId: undefined,
      templateId: String(metadata.templateID),
      workspaceId: metadata.workspaceID,
      processed: false
    }
    try {
      textWithInsertedTags = await this.parseLiquid(data.text, data.tags);
      subjectWithInsertedTags = await this.parseLiquid(data.subject, data.tags);
    } catch (err) {
      return [{
        ...record,
        event: 'error',
        messageId: (err as Error).stack,
      }];
    }

    try {
      const mailgun: Mailgun = new Mailgun(formData);
      const mg: Client = mailgun.client({ username: MailgunProvider.MAILGUN_API_USERNAME, key: credentials.apiKey });

      const result: MessagesSendResult = await mg.messages.create(data.domain.name, {
        from: `${data.from} <${data.from}>`,
        to: data.to,
        cc: data.cc,
        subject: subjectWithInsertedTags,
        html: textWithInsertedTags,
        'v:stepId': metadata.stepID,
        'v:customerId': metadata.customerID,
        'v:templateId': metadata.templateID,
        'v:workspaceId': metadata.workspaceID,
      });
      return [{
        ...record,
        event: 'sent',
        messageId: result.id ? result.id.replace('<', '').replace('>', '') : '',
      }];
    } catch (err) {
      return [{
        ...record,
        event: 'error',
        messageId: (err as Error).stack,
      }];
    }
  }

  async setup(creds: Credentials<MailgunCredentials>, setupData: SetupData<MailgunSetupData>): Promise<void> {
    const { data, metadata } = setupData;
    const { credentials, } = creds;

    const base64ApiKey: string = Buffer.from(`${MailgunProvider.MAILGUN_API_USERNAME}:${credentials.apiKey}`).toString('base64');
    const headers = {
      Authorization: `Basic ${base64ApiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    const updateWebhook = async (type: string) => {
      const url = `${MailgunProvider.MAILGUN_API_BASE_URL}/domains/${data.domain.name}/webhooks/${type}`;
      try {
        const response = await fetch(url, {
          method: 'PUT',
          headers: headers,
          body: new URLSearchParams({
            url: process.env.MAILGUN_WEBHOOK_ENDPOINT,
          }),
        });

        const data = await response.json();
        return { status: response.status, body: data };
      } catch (error) {
        return { error };
      }
    };

    const updateAllWebhooks = async () => {
      const updatePromises = MailgunProvider.MAILGUN_HOOKS_TO_INSTALL.map((type) =>
        updateWebhook(type)
      );

      const results = await Promise.allSettled(updatePromises);

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.status === 200) {
          this.log(
            `Webhook ${MailgunProvider.MAILGUN_HOOKS_TO_INSTALL[index]} updated successfully`,
            this.setup.name,
            r
          );
        } else {
          this.error(
            `Failed to update webhook ${MailgunProvider.MAILGUN_HOOKS_TO_INSTALL[index]
            }: ${JSON.stringify(result)}`
          );
        }
      });
    };

    await updateAllWebhooks();
  }

  async handle(credentials: Credentials<MailgunCredentials>, data: CallbackData<MailgunCallbackData>): Promise<ClickHouseMessage[]>
  // (
  //   body: {
  //     signature: { token: string; timestamp: string; signature: string };
  //     'event-data': {
  //       event: string;
  //       message: { headers: { 'message-id': string } };
  //       'user-variables': {
  //         stepId: string;
  //         customerId: string;
  //         templateId: string;
  //         accountId: string;
  //       };
  //     };
  //   },
  //   session: string
  // ):Promise<ClickHouseMessage[]> 
  {
    const {
      timestamp: signatureTimestamp,
      token: signatureToken,
      signature,
    } = body.signature;

    const {
      event,
      message: {
        headers: { 'message-id': id },
      },
      'user-variables': { stepId, customerId, templateId, accountId },
    } = body['event-data'];

    const value = signatureTimestamp + signatureToken;

    const hash = createHmac(
      'sha256',
      mailgunAPIKey
    )
      .update(value)
      .digest('hex');

    if (hash !== signature) {
      throw new ForbiddenException('Invalid signature');
    }

    if (!stepId || !customerId || !templateId || !id) return;

    const clickHouseRecord: ClickHouseMessage = {
      workspaceId: workspace.id,
      stepId,
      customerId,
      templateId: String(templateId),
      messageId: id,
      event: event,
      eventProvider: ClickHouseEventProvider.MAILGUN,
      processed: false,
      createdAt: new Date(),
    };

    return [clickHouseRecord];
  }

  async remove<MailgunCredentials>(credentials: Credentials<MailgunCredentials>): Promise<void> {

  }

}
