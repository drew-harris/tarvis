import { openai } from "@ai-sdk/openai";
import { embed, tool } from "ai";
import { z } from "zod";
import { cosineDistance, gt, sql, desc, getTableColumns } from "drizzle-orm";
import { db, schema } from "./db";

export const recall = tool({
  parameters: z.object({
    thingToRecall: z.string(),
  }),
  description:
    "Remembers a thing. Recalls a memory. Use whenever someone asks a question that you might need to search for an answer to. Will be highly useful",

  execute: async ({ thingToRecall }) => {
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: thingToRecall,
    });

    const similarity = sql<number>`1 - (${cosineDistance(schema.memories.embedding, embedding)})`;

    const relevantMemories = await db
      .select({
        remembered: schema.memories.rememberedText,
        similarity,
      })
      .from(schema.memories)
      .where(gt(similarity, 0.5))
      .orderBy((t) => desc(t.similarity))
      .limit(4);

    return relevantMemories;
  },
});
