const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");

console.log("🔥 VERSION 3 RUNNING 🔥");

const app = express();
const PORT = process.env.PORT || 3000;

// =========================
// Web server
// =========================
app.get("/", (req, res) => {
  res.send("Dog Water Bot V3 🐶💧");
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// =========================
// Discord Client
// =========================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  console.log("📨 EVENT FIRED:", message.content);

  if (message.author.bot) return;
  if (!message.content.startsWith("!")) return;

  if (message.content === "!ping") {
    return message.reply("🏓 pong");
  }

  if (message.content === "!today") {
    return message.reply("📅 bot working");
  }
});

// =========================
// FORCE LOGIN (สำคัญ)
// =========================
(async () => {
  try {
    console.log("🚀 Starting Discord login...");
    console.log("TOKEN EXISTS:", !!process.env.DISCORD_TOKEN);

    await client.login(process.env.DISCORD_TOKEN);

    console.log("🎯 Discord login success");

  } catch (err) {
    console.error("❌ Discord login error:");
    console.error(err);
  }
})();
