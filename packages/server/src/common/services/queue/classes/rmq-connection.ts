const amqplib = require('amqplib');

export class RMQConnection {
  public connection;
  private connectionTag: string;

  constructor(connectionTag: string) {
    this.connectionTag = connectionTag;
  }

  async init() {
    // TODO: stop primary process from connecting
    // since it doesn't do any actual work
    
    console.log("RMQ: Opening Connection");

    const connectionName = this.getConnectionName();

    this.connection = await amqplib.connect(
      process.env.RMQ_CONNECTION_URI ?? 'amqp://localhost', {
        clientProperties: {
          connection_name: connectionName
        }
    });
  }

  private getConnectionName(): string {
    return `${process.env.LAUDSPEAKER_PROCESS_TYPE}-${process.pid}-${this.connectionTag}`;
  }
  
  async close() {
    console.log("RMQ: Closing Connection");
    return this.connection.close();
  }
}