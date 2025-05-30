const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio'); // Pastikan sudah di-install: npm install cheerio

const TELEGRAM_BOT_TOKEN = "8127447550:AAGKdqsYEwxT9iEYWrrGgijakir9qTzJVsU";
const CHANNEL_ID = "@info_seputarforex";
const DATA_URL = 'https://tradersharing.github.io/Tradersharing/index_V2.html';
const SUPABASE_URL = 'https://oaatowhxrefpjlwucvvg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hYXRvd2h4cmVmcGpsd3VjdnZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0MzgzMDQsImV4cCI6MjA2NDAxNDMwNH0.-Qf6y5JiWVx2P6kYfWv5mQxEEnF7YdFgqT9E4p0jF1g';

const allowedPairs = [
  "EURUSD", "GBPUSD", "AUDUSD", "NZDUSD", "USDJPY", "USDCHF", "USDCAD",
  "EURGBP", "EURJPY", "EURAUD", "EURCAD", "EURCHF", "EURNZD",
  "GBPJPY", "GBPAUD", "GBPCAD", "GBPCHF", "GBPNZD",
  "AUDJPY", "AUDNZD", "AUDCAD", "AUDCHF",
  "CADJPY", "CHFJPY", "NZDJPY", "NZDCAD", "NZDCHF",
  "XAUUSD", "WTI", "OIL"
];

function pipToPrice(pips) {
  return pips * 0.0001;
}

let lastSent = {};

async function insertSignalToSupabase(signal) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/forex`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
    },
    body: JSON.stringify([signal]),
  });
  if (!response.ok) {
    const err = await response.text();
    console.error("Gagal insert ke Supabase:", err);
    return null;
  }
  return await response.json();
}

async function sendSignalToTelegram(text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHANNEL_ID,
      text,
      parse_mode: "Markdown"
    }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    console.error("Gagal kirim ke Telegram:", err);
    return null;
  }
  return await resp.json();
}

const app = express();
const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.send("Forex Bot is running!");
});

async function mainLoop() {
  try {
    const res = await fetch(DATA_URL);
    const html = await res.text();
    const $ = cheerio.load(html);

    // ==== PARSING TABEL ====
    let data = [];
    // Ganti selector dan urutan kolom sesuai HTML Anda!
    // Contoh: Tabel dengan id "signals"
    $('#signals tr').each((i, el) => {
      const tds = $(el).find('td');
      if (tds.length > 0) {
        const name = $(tds[0]).text().trim().toUpperCase();
        const avgPrice = $(tds[1]).text().trim();
        const longPercentage = $(tds[2]).text().trim();
        const shortPercentage = $(tds[3]).text().trim();

        data.push({
          name,
          avgPrice,
          longPercentage,
          shortPercentage
        });
      }
    });
    // ==== END PARSING ====

    for (const sinyal of data) {
      const pair = (sinyal.name || '').toUpperCase();

      if (!allowedPairs.includes(pair)) {
        continue;
      }

      const buy = parseFloat(sinyal.longPercentage);
      const sell = parseFloat(sinyal.shortPercentage);
      const currentPrice = parseFloat(sinyal.avgPrice);

      let type = "";
      if (buy >= 70) type = "BUY";
      else if (sell >= 70) type = "SELL";
      else continue;

      const key = `${pair}-${type}`;
      const now = Date.now();

      if (!lastSent[key] || now - lastSent[key] > 6 * 3600 * 1000) {
        let entry, tp1, tp2, tp3, sl1, sl2, text;

        if (type === "BUY") {
          entry = (currentPrice - pipToPrice(20)).toFixed(5);
          tp1 = (parseFloat(entry) + pipToPrice(20)).toFixed(5);
          tp2 = (parseFloat(entry) + pipToPrice(50)).toFixed(5);
          tp3 = (parseFloat(entry) + pipToPrice(100)).toFixed(5);
          sl1 = (parseFloat(entry) - pipToPrice(20)).toFixed(5);
          sl2 = (parseFloat(entry) - pipToPrice(20)).toFixed(5);

          text = `📈 *New signal BUY*

*Recomend price:* ${entry}

*Take profit:*
TP 1: ${tp1}
TP 2: ${tp2}
TP 3: ${tp3}

*Stop loss:*
SL 1: ${sl1}
SL 2: ${sl2}`;
        } else {
          entry = (currentPrice + pipToPrice(20)).toFixed(5);
          tp1 = (parseFloat(entry) - pipToPrice(20)).toFixed(5);
          tp2 = (parseFloat(entry) - pipToPrice(50)).toFixed(5);
          tp3 = (parseFloat(entry) - pipToPrice(100)).toFixed(5);
          sl1 = (parseFloat(entry) + pipToPrice(20)).toFixed(5);
          sl2 = (parseFloat(entry) + pipToPrice(20)).toFixed(5);

          text = `📉 *New signal SELL*

*Recomend price:* ${entry}

*Take profit:*
TP 1: ${tp1}
TP 2: ${tp2}
TP 3: ${tp3}

*Stop loss:*
SL 1: ${sl1}
SL 2: ${sl2}`;
        }

        const signalObj = {
          pair,
          type,
          entry,
          tp1,
          tp2,
          tp3,
          sl1,
          sl2,
          source: "github-html",
          sent_to: "telegram",
          sent_at: new Date().toISOString(),
          raw_json: JSON.stringify(sinyal),
        };

        await insertSignalToSupabase(signalObj);
        await sendSignalToTelegram(text);

        lastSent[key] = now;
      }
    }
    console.log("Sinyal diproses pada", new Date());
  } catch (err) {
    console.error("Error:", err.message);
  }
}

mainLoop();
setInterval(mainLoop, 600000);

app.listen(PORT, () => {
  console.log(`Forex Bot running on port ${PORT}`);
});