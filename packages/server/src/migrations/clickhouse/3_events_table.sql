CREATE TABLE IF NOT EXISTS events
(
    correlationKey              String          NOT NULL,
    correlationValue            String          NOT NULL,
	createdAt 					Datetime64  	DEFAULT now(),
	event 						String 			NOT NULL,
	id 							UInt64          DEFAULT generateSnowflakeID(),
	payload 					String          NOT NULL,
	source						String			NOT NULL,
	timestamp					Datetime64		DEFAULT NULL,
	uuid                        UUID			DEFAULT generateUUIDv7(),
	workspaceId					UUID			NOT NULL
)
ENGINE = MergeTree()
ORDER BY id;