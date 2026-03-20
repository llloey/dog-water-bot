const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");
const { google } = require("googleapis");

console.log("🔥 VERSION 2 RUNNING 🔥");

const app = express();
const PORT = process.env.PORT || 3000;

// =========================
// Web server
// =========================
app.get("/", (req, res) => {
  res.send("Dog Water Bot V2 🐶💧");
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// =========================
// CONFIG
// =========================
const TARGET_DRINK = 1000;

// =========================
// Discord
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

// =========================
// Google Sheets
// =========================
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});

async function getSheets() {
  return google.sheets({ version: "v4", auth: await auth.getClient() });
}

async function getAllRows() {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: "Sheet1!A:E"
  });
  return res.data.values || [];
}

// =========================
// Message Handler (debug)
// =========================
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
// LOGIN
// =========================
console.log("TOKEN EXISTS:", !!process.env.DISCORD_TOKEN);

client.login(process.env.DISCORD_TOKEN)
  .then(() => {
    console.log("🎯 Discord login success");
  })
  .catch(err => {
    console.error("❌ Discord login error:");
    console.error(err);
  });
