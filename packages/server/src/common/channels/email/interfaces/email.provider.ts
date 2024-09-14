import { ClickHouseMessage } from '../../../services/clickhouse/interfaces/clickhouse-message';
import { Credentials, ProviderData, SendingData, SetupData, CallbackData, EmailCredentials, EmailProviderData, EmailCallbackData, EmailSendingData, EmailSetupData } from './email.data';

/**
 * Base interface to be implemented by any email channel provider
 */
export interface EmailProvider {
  /**
   * Uses credentials to retrieve any information required to set up a channel,
   * for example the domain or phone number to send from
   * @param apiKey 
   */
  fetch(credentials: Credentials<EmailCredentials>): Promise<ProviderData<EmailProviderData>>;
  /**
   * Uses the provided credentials to send a message of type T, to the recepient
   * specified by the contact information, with the selected content. Returns 
   * information about what happened during the send
   * @param data 
   */
  send(credentials: Credentials<EmailCredentials>, data: SendingData<EmailSendingData>): Promise<ClickHouseMessage[]>;
  /**
   * Uses the provided credentials to set up the required callback handling, for
   * example setting up the webhooks to hit laudspeaker etc
   * @param apiKey 
   * @param domain 
   */
  setup(credentials: Credentials<EmailCredentials>, data: SetupData<EmailSetupData>): Promise<void>;
  /**
   * Uses the provided credentials to handle any callback information from the
   * service, potentially verifying the calbacks authenticity and parsing 
   * the callback data 
   * 
   */
  handle(credentials: Credentials<EmailCredentials>, data: CallbackData<EmailCallbackData>): Promise<ClickHouseMessage[]>;
  /**
   * Uses the provided credentials to remove any callback handlers that were
   * setup using the setup callback handler; used when a provider is 
   * removed from an account.
   */
  remove<T>(credentials: Credentials<EmailCredentials>): Promise<void>;
}
