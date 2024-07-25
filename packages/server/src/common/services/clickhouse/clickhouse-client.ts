import { createClient } from '@clickhouse/client';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ClickhouseClient {
	private client = createClient({
	  host: process.env.CLICKHOUSE_HOST
	    ? process.env.CLICKHOUSE_HOST.includes('http')
	      ? process.env.CLICKHOUSE_HOST
	      : `http://${process.env.CLICKHOUSE_HOST}`
	    : 'http://localhost:8123',
	  username: process.env.CLICKHOUSE_USER ?? 'default',
	  password: process.env.CLICKHOUSE_PASSWORD ?? '',
	  database: process.env.CLICKHOUSE_DB ?? 'default',
	});

	constructor() {

	}

	async init() {

	}

	async query(queryDetails) {
		return this.client.query(queryDetails);
	}

	async insert(insertDetails) {
		return this.client.insert(insertDetails);
	}
}