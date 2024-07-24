import { RMQConnection } from './rmq-connection';
const amqplib = require('amqplib');

export class RMQChannel {

  public connection;
  public channel;

  constructor(connection: RMQConnection) {
    this.connection = connection;
  }

  async init() {
    console.log("RMQ: Opening Channel");

    this.channel = await this.connection.connection.createChannel();
  }

  async close() {
    console.log("RMQ: Closing Channel");

    return this.channel.close();
  }
}