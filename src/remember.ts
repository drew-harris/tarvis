import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { db, schema } from "./db";
import { nanoid } from "nanoid/non-secure";
import type { Message } from "discord.js";

export const saveMemory = async (message: Message) => {
  try {
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: message.content,
    });

    await db.insert(schema.memories).values({
      id: nanoid(),
      embedding,
      rememberedText: message.content,
      dateRemembered: new Date(),
      userId: message.author.id,
    });

    await message.react("✅"); // React with a green checkmark
  } catch (error) {
    console.error("Error saving memory:", error);
    await message.reply(
      "Failed to save memory. Please check the logs for details.",
    );
  }
};
