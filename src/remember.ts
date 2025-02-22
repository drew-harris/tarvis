import { tool } from "ai";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { messageStorage } from ".";
import { db, schema } from "./db";
import { nanoid } from "nanoid/non-secure";

export const remember = tool({
  parameters: z.object({
    userSpecific: z
      .boolean()
      .describe(
        "if the memory is user specific (MY favorite color, vs a random fact)",
      ),
    thingToRemember: z.string().describe("the thing to remember"),
  }),
  description: "Remembers a thing",

  execute: async ({ thingToRemember, userSpecific }, { messages }) => {
    const message = messageStorage.getStore();

    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: thingToRemember,
    });

    await db.insert(schema.memories).values({
      id: nanoid(),
      embedding,
      rememberedText: thingToRemember,
      dateRemembered: new Date(),
      userId: userSpecific ? message?.author.id : undefined,
    });

    if (message?.channel.isSendable()) {
      message.channel.send(`remembering ${thingToRemember}`);
    }
  },
});
