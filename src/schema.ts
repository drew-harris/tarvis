import { pgTable, text, vector, timestamp, index } from "drizzle-orm/pg-core";

export const memories = pgTable(
  "memories",
  {
    id: text("id").primaryKey(),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    rememberedText: text("remembered_text").notNull(),
    dateRemembered: timestamp("date_remembered").notNull().defaultNow(),
    userId: text("user_id"),
  },
  (table) => [
    index("embeddingIndex").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
  ],
);
