CREATE TABLE `intent_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recordingId` int NOT NULL,
	`templateId` int NOT NULL,
	`pdfUrl` varchar(500),
	`dataSnapshot` json,
	`generatedBy` int NOT NULL,
	`generatedByName` varchar(100) NOT NULL,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `intent_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `intent_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`content` text NOT NULL,
	`isDefault` int NOT NULL DEFAULT 0,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `intent_templates_id` PRIMARY KEY(`id`)
);
