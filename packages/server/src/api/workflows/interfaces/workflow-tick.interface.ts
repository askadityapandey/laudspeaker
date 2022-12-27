import { Eventtype } from '@/api/events/dto/posthog-event.dto';
import { Template } from '@/api/templates/entities/template.entity';

export interface WorkflowTick {
  workflowId: string;
  jobIds: (string | number)[];
  templates?: Template[];
  status: string;
  failureReason: string;
}

export interface PosthogKeysPayload {
  type?: Eventtype;
  event?: any;
}
