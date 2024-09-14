import { ClickHouseMessage } from '../../../services/clickhouse/interfaces/clickhouse-message';
import { SendingParams, SetupConnectionParams, SetupWebhookParams, HandleWebhookParams } from './sms.data';

export interface SMSProvider {
  fetchSetupInfo(apiKey: string): Promise<SetupInfo>;
  send<T>(data: SendingInfo<T>): Promise<ClickHouseMessage[]>;
  setupCallbackHandler(apiKey: string, domain: string): Promise<void>;
  handleCallbackData()
  removeCallbackHandler()
}
