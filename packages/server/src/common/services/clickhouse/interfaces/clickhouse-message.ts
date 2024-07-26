import { ClickhouseEventProvider } from '../types/clickhouse-event-provider';

export interface ClickhouseMessage {
  audienceId?: string;
  stepId?: string;
  createdAt: Date;
  customerId: string;
  event: string;
  eventProvider: ClickhouseEventProvider;
  messageId: string;
  templateId: string;
  workspaceId: string;
  processed: boolean;
}