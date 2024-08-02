import { ClickHouseEventSource } from "../types/clickhouse-event-source";

export interface ClickHouseEvent {
  correlationKey: string;
  correlationValue: string;
  createdAt?: Date;
  event: string;
  source: ClickHouseEventSource;
  payload: string;
  timestamp?: string;
  uuid: string;
  workspaceId: string;
}