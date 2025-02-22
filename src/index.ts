import { openrouter } from "@openrouter/ai-sdk-provider";
import { AsyncLocalStorage } from "async_hooks";
import { generateText, tool } from "ai";
import { Client, Events, GatewayIntentBits, Message } from "discord.js";
import { z } from "zod";
import { searchTenorForGifs } from "./tenor";
import { migrate } from "drizzle-orm/bun-sql/migrator";
import { db } from "./db";
import { remember } from "./remember";
import { recall } from "./recall";

export const messageStorage = new AsyncLocalStorage<Message>();

const tools = {
  sendGif: tool({
    parameters: z.object({
      query: z.string().describe("the search query to search gifs by"),
    }),
    description: "Sends a gif from a query",
    execute: async ({ query }, { messages }) => {
      const message = messageStorage.getStore();
      console.log("sending gif from query ", query);
      if (message?.channel.isSendable()) {
        try {
          const url = await searchTenorForGifs(query);
          message.channel.send(url);
        } catch (e) {
          console.log(e);
          message?.reply("No gifs found");
        }
      }
    },
  }),

  remember,
  recall,
};

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
});

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

const handleTarvisMessage = async (message: Message) => {
  const result = await generateText({
    model: openrouter("google/gemini-2.0-flash-lite-preview-02-05:free"),
    tools,
    system:
      "You are a discord bot that makes tool calls to accomplish tasks. If you don't find any tools to be useful then just respond normally. Also if a tool call doesn't have a useful result, such as null or undefined then don't speak again. If a user says 'show me' or 'send up', that also means they wanna see a gif. If a user asks a question that isn't a basic knowledge or obvious answer, use the recall too to gather more infomation before you answer.",
    prompt: message.content,
    maxSteps: 2,
  });
  console.log(result.text);
  if (result.text.length > 4) {
    const message = messageStorage.getStore();
    message?.reply(result.text);
  }
};

client.on("messageCreate", async (m: Message) => {
  console.log("message created");
  console.log(m.content);
  if (m.content.startsWith("hey tarvis") || m.content.startsWith("tarvis")) {
    await messageStorage.run(m, async () => {
      await handleTarvisMessage(m);
    });
  }
});

// Log in to Discord with your client's token
const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
  throw new Error("Discord token not found in environment variables!");
}

client.login(TOKEN);

migrate(db, {
  migrationsFolder: "./drizzle",
});
