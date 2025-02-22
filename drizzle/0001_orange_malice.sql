CREATE TABLE "memories" (
	"id" text PRIMARY KEY NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"remembered_text" text NOT NULL,
	"date_remembered" timestamp DEFAULT now() NOT NULL,
	"user_id" text
);
--> statement-breakpoint
CREATE INDEX "embeddingIndex" ON "memories" USING hnsw ("embedding" vector_cosine_ops);