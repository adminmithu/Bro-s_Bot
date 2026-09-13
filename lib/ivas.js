/**
 * Bro's Number Bot - IVAS Portal Automated Fetcher for Vercel Serverless & Cron Jobs
 * Logs into ivasms.com using credentials, fetches Link 1 & Link 2, parses SMS, and sends Telegram OTP Cards.
 */

const { getFlagEmoji, buildOTPFormattedCard, searchOTPByNumber, detectCountryFromPhone } = require('./db.js');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8848165401:AAFiUELKvW-apfBB5xBdQc92yzKcqgViwa4";
const GROUP_ID = process.env.GROUP_ID || "-1004296466829";
const IVAS_EMAIL = process.env.IVAS_EMAIL || "mithuchandra647@gmail.com";
const IVAS_PASSWORD = process.env.IVAS_PASSWORD || "Mithu@808";

const LINK_1_URL = "https://www.ivasms.com/portal/live/my_sms";
const LOGIN_URL = "https://www.ivasms.com/portal/login";

// Track processed SMS in memory / session
const processedMessages = new Set();

async function sendTelegram(payload) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    console.error("Telegram Send Error:", err);
    return null;
  }
}

// Simple HTML regex parser for IVAS portal table rows
function parseIVASHtml(html) {
  const rows = [];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;

  while ((match = trRegex.exec(html)) !== null) {
    const rowHtml = match[1];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cols = [];
    let tdMatch;

    while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
      // Strip HTML tags
      const text = tdMatch[1].replace(/<[^>]+>/g, '').trim();
      cols.push(text);
    }

    if (cols.length >= 4) {
      const country = cols[0];
      const phone = cols[1].replace(/\s+/g, '');
      const sid = cols[2];
      const message = cols[3];

      if (phone && message) {
        rows.push({ country, phone, sid, message });
      }
    }
  }

  return rows;
}

function getRequestHeaders() {
  const cookies = [];
  const sessionVal = process.env.IVAS_SMS_SESSION || process.env.ivas_sms_session;
  const cfVal = process.env.CF_CLEARANCE || process.env.cf_clearance;
  const xsrfVal = process.env.XSRF_TOKEN || process.env['XSRF-TOKEN'];

  if (sessionVal) cookies.push(`ivas_sms_session=${sessionVal}`);
  if (cfVal) cookies.push(`cf_clearance=${cfVal}`);
  if (xsrfVal) cookies.push(`XSRF-TOKEN=${xsrfVal}`);

  const cookieStr = process.env.IVAS_COOKIE || cookies.join('; ');
  const h = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9'
  };
  if (cookieStr) {
    h['Cookie'] = cookieStr;
  }
  return h;
}

async function fetchAndProcessIVAS() {
  console.log(`[IVAS Fetcher] Connecting with ${IVAS_EMAIL}...`);
  let link1Count = 0;
  let link2Count = 0;

  try {
    // 1. Fetch Link 1: /portal/live/my_sms (User + Group)
    const res1 = await fetch(LINK_1_URL, { headers: getRequestHeaders() });

    if (res1.ok) {
      const html1 = await res1.text();
      const items1 = parseIVASHtml(html1);

      for (const item of items1) {
        const msgId = `link1_${item.phone}_${item.message}`;
        if (!processedMessages.has(msgId)) {
          processedMessages.add(msgId);
          link1Count++;

          // Match found user order
          const found = searchOTPByNumber(item.phone);
          const userId = found ? found.data.userId : null;
          const countryCode = found ? found.data.countryCode : (item.country || detectCountryFromPhone(item.phone) || 'GLOBAL');
          const serviceId = found ? found.data.serviceId : item.sid;

          const card = buildOTPFormattedCard(serviceId, countryCode, item.phone, item.message);

          // Send to Group (-1004296466829)
          await sendTelegram({ chat_id: GROUP_ID, ...card });

          // Send to User if registered
          if (userId) {
            await sendTelegram({ chat_id: userId, ...card });
          }
        }
      }
    }

    // 2. Link 2 disabled as requested (Only Link 1 is active)
    return { success: true, processedLink1: link1Count, processedLink2: 0 };
  } catch (error) {
    console.error("[IVAS Fetcher Error]:", error);
    return { success: false, error: error.message };
  }
}

module.exports = { fetchAndProcessIVAS };
