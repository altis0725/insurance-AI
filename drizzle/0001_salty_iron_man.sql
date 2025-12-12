CREATE TABLE `change_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recordingId` int NOT NULL,
	`editorId` int NOT NULL,
	`editorName` varchar(100) NOT NULL,
	`changeType` enum('transcription','extraction') NOT NULL,
	`oldValue` text,
	`newValue` text,
	`memo` text,
	`changedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `change_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `extraction_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recordingId` int NOT NULL,
	`extractionData` json NOT NULL,
	`overallConfidence` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `extraction_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recordings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recordedAt` timestamp NOT NULL,
	`staffName` varchar(100) NOT NULL,
	`customerName` varchar(100) NOT NULL,
	`meetingType` enum('initial','followup','proposal') NOT NULL,
	`status` enum('pending','processing','completed','error') NOT NULL DEFAULT 'pending',
	`productCategory` enum('life','medical','savings','investment'),
	`durationSeconds` int NOT NULL,
	`audioUrl` varchar(500),
	`transcription` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recordings_id` PRIMARY KEY(`id`)
);
