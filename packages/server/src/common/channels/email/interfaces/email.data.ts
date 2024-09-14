import { Domain } from "mailgun.js/domains";

export interface Credentials<T> {
  credentials: T;
  metadata?: any;
}
export interface ProviderData<T> {
  data: T;
  metadata?: any;
}
export interface SendingData<T> {
  data: T;
  metadata: {
    stepID: string;
    customerID: string;
    templateID: string;
    workspaceID: string;
  };
}
export interface CallbackData<T> {
  data: T;
  metadata?: any;
}
export interface SetupData<T> {
  data: T;
  metadata?: any;
}


export interface EmailCredentials { }
export interface EmailProviderData { }
export interface EmailSendingData { }
export interface EmailCallbackData { }
export interface EmailSetupData { }

export interface MailgunCredentials extends EmailCredentials {
  apiKey: string;
}
export interface MailgunProviderData extends EmailProviderData {
  domains: Domain[];
}

export interface MailgunSendingData extends EmailSendingData {
  domain: Domain;
  to: string;
  from: string;
  subject: string;
  body: string;
  cc?: string[];
  bcc?: string[];
  [key: string]: any;
}


export interface MailgunSetupData extends EmailSetupData {
  domain: Domain;

}

export interface MailgunCallbackData extends EmailCallbackData { }


