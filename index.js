const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Dog Water Bot is running 🐶");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

const { Client, GatewayIntentBits } = require("discord.js");
const { google } = require("googleapis");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const TARGET = parseInt(process.env.TARGET_WATER || "2500");

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

async function appendToSheet(water, status) {
  const sheets = google.sheets({ version: "v4", auth: await auth.getClient() });

  const date = new Date().toLocaleDateString("th-TH");
  const timestamp = new Date().toISOString();

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: "Sheet1!A:D",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[date, water, status, timestamp]],
    },
  });
}

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (!message.content.startsWith("!water")) return;

  const args = message.content.split(" ");
  const water = parseInt(args[1]);

  if (isNaN(water)) {
    return message.reply("กรุณาใส่ตัวเลข เช่น !water 2350");
  }

  let status = "✔ ครบ";
  if (water < TARGET * 0.8) status = "❗ ต่ำ";
  if (water > TARGET * 1.2) status = "⚠ สูง";

  try {
    await appendToSheet(water, status);
    message.reply(`บันทึกน้ำวันนี้ ${water} ml แล้ว 🐶\nสถานะ: ${status}`);
  } catch (err) {
    console.error(err);
    message.reply("เกิดข้อผิดพลาดในการบันทึก");
  }
});

client.login(process.env.DISCORD_TOKEN);
