CREATE TABLE `reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recordingId` int,
	`userId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`dueDate` timestamp,
	`priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`reminderStatus` enum('pending','completed','cancelled') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reminders_id` PRIMARY KEY(`id`)
);
