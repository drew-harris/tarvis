import { openrouter } from "@openrouter/ai-sdk-provider";
import { AsyncLocalStorage } from "async_hooks";
import { generateText, tool } from "ai";
import { Client, Events, GatewayIntentBits, Message } from "discord.js";
import { z } from "zod";
import { searchTenorForGifs } from "./tenor";
import { migrate } from "drizzle-orm/bun-sql/migrator";
import { db } from "./db";
import { recallFromMessage } from "./recall";
import { saveMemory } from "./remember";

export const messageStorage = new AsyncLocalStorage<Message>();

const tools = {
  sendGif: tool({
    parameters: z.object({
      query: z.string().describe("the search query to search gifs by"),
    }),
    description: "Sends a gif from a query",
    execute: async ({ query }) => {
      const message = messageStorage.getStore();
      console.log("sending gif from query ", query);
      if (message?.channel.isSendable()) {
        try {
          const url = await searchTenorForGifs(query);
          message.reply(url);
        } catch (e) {
          console.log(e);
          message?.reply("No gifs found");
        }
      }
    },
  }),
};

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
});

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  client.on(Events.MessageReactionAdd, async (reaction, user) => {
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error("Something went wrong when fetching the message:", error);
        return;
      }
    }

    if (user.bot) return; // Ignore bot reactions

    if (reaction.emoji.name === "🧠") {
      console.log("brain emoji added");
      // Fetch the message if it's partial
      if (reaction.message.partial) {
        try {
          await reaction.message.fetch();
        } catch (error) {
          console.error(
            "Something went wrong when fetching the message:",
            error,
          );
          return;
        }
      }

      if (reaction.message.partial) {
        return;
      }
      await saveMemory(reaction.message);
    }
  });

  client.on("messageCreate", async (m: Message) => {
    console.log("message created");
    console.log(m.content);
    if (m.content.startsWith("hey tarvis")) {
      await messageStorage.run(m, async () => {
        await handleTarvisMessage(m);
      });
    }
  });
});

const handleTarvisMessage = async (message: Message) => {
  const backgroundInfo = await recallFromMessage(message);

  let contentMessage = message.content;
  if (message.content.startsWith("hey tarvis")) {
    contentMessage = message.content.substring(10);
  }

  if (backgroundInfo.length > 0) {
    contentMessage =
      "Background context:\n" +
      backgroundInfo.join("\n") +
      "\n" +
      "\n" +
      contentMessage;
  }

  console.log("--------------prompt--------------");
  console.log(contentMessage);
  console.log("--------------\\prompt--------------");

  const result = await generateText({
    model: openrouter("google/gemini-2.0-flash-lite-preview-02-05:free"),
    tools,
    system:
      "You are a discord bot that makes tool calls to accomplish tasks. If you don't find any tools to be useful then just respond normally. If a user says 'show me' or 'send up', that also means they wanna see a gif. If there is background information given before the prompt/question try to use it. Only send a gif if a user asks to see a gif or it would exceptionally fit the situation with the background context given, otherwise just be helpful",
    prompt: contentMessage,
    maxSteps: 1,
  });

  console.log("FINISH REASON", result.finishReason);

  if (result.warnings?.length) {
    console.log("warnings", result.warnings);
    return message?.reply("Warnings: " + result.warnings.toString());
  }

  console.log("response text", result.text);
  if (result.text.length > 4) {
    const message = messageStorage.getStore();
    message?.reply(result.text);
  }
};

// Log in to Discord with your client's token
const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
  throw new Error("Discord token not found in environment variables!");
}

client.login(TOKEN);

migrate(db, {
  migrationsFolder: "./drizzle",
});
