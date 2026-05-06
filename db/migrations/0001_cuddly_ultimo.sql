CREATE TABLE `tests` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`age` int NOT NULL,
	`group` varchar(50) NOT NULL,
	`email` varchar(255),
	`grades` json NOT NULL,
	`course` int NOT NULL,
	`image` varchar(255),
	`test` varchar(255) DEFAULT '',
	CONSTRAINT `tests_id` PRIMARY KEY(`id`)
);
