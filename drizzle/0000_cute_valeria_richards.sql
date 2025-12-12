CREATE TYPE "public"."changeType" AS ENUM('transcription', 'extraction');--> statement-breakpoint
CREATE TYPE "public"."meetingType" AS ENUM('initial', 'followup', 'proposal');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."productCategory" AS ENUM('life', 'medical', 'savings', 'investment');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('pending', 'processing', 'completed', 'error');--> statement-breakpoint
CREATE TYPE "public"."reminderStatus" AS ENUM('pending', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "change_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"recordingId" integer NOT NULL,
	"editorId" integer NOT NULL,
	"editorName" varchar(100) NOT NULL,
	"changeType" "changeType" NOT NULL,
	"oldValue" text,
	"newValue" text,
	"memo" text,
	"changedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"recordingId" integer NOT NULL,
	"complianceData" jsonb NOT NULL,
	"isCompliant" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extraction_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"recordingId" integer NOT NULL,
	"extractionData" jsonb NOT NULL,
	"overallConfidence" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intent_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"recordingId" integer NOT NULL,
	"templateId" integer NOT NULL,
	"pdfUrl" varchar(500),
	"dataSnapshot" jsonb,
	"generatedBy" integer NOT NULL,
	"generatedByName" varchar(100) NOT NULL,
	"generatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intent_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"content" text NOT NULL,
	"isDefault" integer DEFAULT 0 NOT NULL,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recordings" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"recordedAt" timestamp NOT NULL,
	"staffName" varchar(100) NOT NULL,
	"customerName" varchar(100) NOT NULL,
	"meetingType" "meetingType" NOT NULL,
	"status" "status" DEFAULT 'pending' NOT NULL,
	"productCategory" "productCategory",
	"durationSeconds" integer NOT NULL,
	"audioUrl" varchar(500),
	"transcription" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"recordingId" integer,
	"userId" integer NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"dueDate" timestamp,
	"priority" "priority" DEFAULT 'medium' NOT NULL,
	"status" "reminderStatus" DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
