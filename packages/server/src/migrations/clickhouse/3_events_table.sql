CREATE TABLE IF NOT EXISTS events
(
    correlation_key             String          NOT NULL,
    correlation_value           String          NOT NULL,
	created_at 					Datetime64(6) 	DEFAULT now64(),
	event 						String 			NOT NULL,
	id 							UInt64          DEFAULT generateSnowflakeID(),
	payload 					String          NOT NULL,
	source						String			NOT NULL,
	generated_at				Datetime64		NOT NULL,
	uuid                        UUID			DEFAULT generateUUIDv7(),
	workspace_id				UUID			NOT NULL
)
ENGINE = MergeTree()
ORDER BY id;