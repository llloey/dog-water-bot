const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");
const { google } = require("googleapis");

const app = express();
const PORT = process.env.PORT || 3000;

// =========================
// Web server (กัน Render kill)
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
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: "Tracking water 🐶💧" }],
    status: "online"
  });
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

async function appendRow(date, type, amount, calculatedWater) {
  const sheets = await getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: "Sheet1!A:E",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[date, type, amount, calculatedWater, new Date().toISOString()]]
    }
  });
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
// Utilities
// =========================
function resolveDate(dateInput) {
  if (!dateInput) {
    return new Date().toLocaleDateString("th-TH");
  }

  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateInput)) return null;

  const parsed = new Date(dateInput);
  if (isNaN(parsed)) return null;

  return parsed.toLocaleDateString("th-TH");
}

function calculateByDate(rows, date) {
  let drink = 0;
  let ar = 0;

  rows
    .filter(r => r[0] === date)
    .forEach(r => {
      const type = r[1];
      const value = Number(r[3] || 0);

      if (type === "WATER" || type === "FOOD") {
        drink += value;
      }

      if (type === "AR") {
        ar += value;
      }
    });

  return { drink, ar };
}

function getLastNDaysSummary(rows, days) {
  const now = new Date();
  let totalDrink = 0;
  let totalAR = 0;
  let daySet = new Set();

  rows.forEach(r => {
    const rowDate = new Date(r[0]);
    const diff = (now - rowDate) / (1000 * 60 * 60 * 24);

    if (diff <= days) {
      const type = r[1];
      const value = Number(r[3] || 0);

      daySet.add(r[0]);

      if (type === "WATER" || type === "FOOD") {
        totalDrink += value;
      }

      if (type === "AR") {
        totalAR += value;
      }
    }
  });

  const daysCount = daySet.size || 1;

  return {
    totalDrink,
    totalAR,
    avgDrink: Math.round(totalDrink / daysCount),
    avgAR: Math.round(totalAR / daysCount),
    daysCount
  };
}

// =========================
// Message Handler
// =========================
client.on("messageCreate", async (message) => {
  if (!message.content.startsWith("!")) return;

  const parts = message.content.trim().split(/\s+/);
  const command = parts[0];
  const value = parts[1];
  const dateInput = parts[2];

  const rows = await getAllRows();

  // =========================
  // ADD DATA
  // =========================
  if (command === "!water" || command === "!food" || command === "!ar") {
    const targetDate = resolveDate(dateInput);
    if (!targetDate) {
      return message.reply("รูปแบบวันที่ไม่ถูกต้อง ใช้ YYYY-MM-DD");
    }

    const amount = Number(value);
    if (!amount || amount < 10) {
      return message.reply("ตัวเลขดูผิดปกติ ลองใหม่อีกที 🧐");
    }

    let calculatedWater = amount;
    let type = "";

    if (command === "!water") type = "WATER";

    if (command === "!food") {
      type = "FOOD";
      calculatedWater = Math.round(amount * 0.78);
    }

    if (command === "!ar") type = "AR";

    await appendRow(targetDate, type, amount, calculatedWater);

    const rowsAfter = await getAllRows();
    const { drink, ar } = calculateByDate(rowsAfter, targetDate);

    let drinkMessage =
      drink >= TARGET_DRINK
        ? `+${drink - TARGET_DRINK} ml`
        : `เหลืออีก ${TARGET_DRINK - drink} ml`;

    let drinkStatus =
      drink >= TARGET_DRINK
        ? "✔ เกินเป้าเล็กน้อย"
        : "❗ ยังไม่ถึงเป้า";

    const arMessage =
      ar > 0 ? `ให้แล้ว ${ar} ml` : "วันนี้ยังไม่ได้ให้";

    return message.reply(
      `📅 ${targetDate}\n\n` +
      `💧 Drink (water+food)\n` +
      `   ${drink} / ${TARGET_DRINK} ml\n` +
      `   ${drinkMessage}\n\n` +
      `💉 AR fluid\n` +
      `   ${arMessage}\n\n` +
      `-----------------------------------------\n` +
      `📊 สถานะวันนี้\n` +
      `   ${drinkStatus}`
    );
  }

  // =========================
  // TODAY
  // =========================
  if (command === "!today") {
    const today = new Date().toLocaleDateString("th-TH");
    const { drink, ar } = calculateByDate(rows, today);

    const drinkMessage =
      drink >= TARGET_DRINK
        ? `+${drink - TARGET_DRINK} ml`
        : `เหลืออีก ${TARGET_DRINK - drink} ml`;

    const drinkStatus =
      drink >= TARGET_DRINK
        ? "✔ เกินเป้าเล็กน้อย"
        : "❗ ยังไม่ถึงเป้า";

    const arMessage =
      ar > 0 ? `ให้แล้ว ${ar} ml` : "วันนี้ยังไม่ได้ให้";

    return message.reply(
      `📅 วันนี้\n\n` +
      `💧 Drink (water+food)\n` +
      `   ${drink} / ${TARGET_DRINK} ml\n` +
      `   ${drinkMessage}\n\n` +
      `💉 AR fluid\n` +
      `   ${arMessage}\n\n` +
      `-----------------------------------------\n` +
      `📊 สถานะวันนี้\n` +
      `   ${drinkStatus}`
    );
  }

  // =========================
  // WEEK
  // =========================
  if (command === "!week") {
    const summary = getLastNDaysSummary(rows, 7);

    return message.reply(
      `📊 7 วันล่าสุด\n\n` +
      `💧 Drink รวม: ${summary.totalDrink} ml\n` +
      `   เฉลี่ย/วัน: ${summary.avgDrink} ml\n\n` +
      `💉 AR fluid รวม: ${summary.totalAR} ml\n` +
      `   เฉลี่ย/วันที่ให้: ${summary.avgAR} ml\n\n` +
      `ครอบคลุม ${summary.daysCount} วัน`
    );
  }

  // =========================
  // MONTH
  // =========================
  if (command === "!month") {
    const summary = getLastNDaysSummary(rows, 30);

    return message.reply(
      `📆 30 วันล่าสุด\n\n` +
      `💧 Drink รวม: ${summary.totalDrink} ml\n` +
      `   เฉลี่ย/วัน: ${summary.avgDrink} ml\n\n` +
      `💉 AR fluid รวม: ${summary.totalAR} ml\n` +
      `   เฉลี่ย/วันที่ให้: ${summary.avgAR} ml\n\n` +
      `ครอบคลุม ${summary.daysCount} วัน`
    );
  }
});

console.log("TOKEN EXISTS:", !!process.env.DISCORD_TOKEN);

client.login(process.env.DISCORD_TOKEN)
  .then(() => console.log("Discord login success"))
  .catch(err => console.error("Discord login error:", err));
