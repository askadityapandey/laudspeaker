export interface SendingParams {
    subject: string;
    to: string;
    text: string;
    from: string;
    tags: any;
    provider: string;
    [key: string]: any;
  }
  
  export interface SetupConnectionParams {
  
  }
  
  export interface SetupWebhookParams {
  
  }
  
  export interface HandleWebhookParams { }