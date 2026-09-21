/**
 * Bro's Number Bot - Telegram Serverless Bot for Vercel
 * Ultra-Robust Architecture with Zero Fallback Kickouts
 */

const {
  getServices, getServiceIcon, toggleService, addService, deleteService, clearAllServices,
  getCountries, addCountry, deleteCountry, toggleCountry, clearAllCountries,
  addStock, buildStockAddedCard, getAllStockSummary, exportStock, getViewStocksReport,
  get4Numbers, getStockCount, clearAllStock, getLiveTrafficAnalytics,
  searchOTPByNumber, processIncomingSMS, buildOTPFormattedCard, getUserOtpCount,
  getUserInfo, banUser, unbanUser, isUserBanned, setMaintenance,
  getMaintenance, registerUser, getAllUsers, recordLiveRange, getLiveRanges, getFlagEmoji,
  allocateVoltxNumber, getVoltxLiveAccess, getVoltxSuccessOtp, getVoltxConsole, registerVoltxIssuedNumber,
  formatConsoleHitCard, processAndBroadcastConsoleHits, buildNumberAddedCard, buildGroupOTPBroadcastCard,
  setGlobalDispenseQuantity, getGlobalDispenseQuantity, setUserDispenseQuantity, getUserDispenseQuantity,
  generate2FACode
} = require('../lib/db.js');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8848165401:AAFiUELKvW-apfBB5xBdQc92yzKcqgViwa4";
const ADMIN_ID = process.env.ADMIN_ID ? String(process.env.ADMIN_ID).trim() : "8929349073";
const OTP_GROUP_ID = process.env.OTP_GROUP_ID || process.env.GROUP_ID || '-1004462028404';
const RANGE_GROUP_ID = process.env.RANGE_GROUP_ID || '-1004296466829';
const GROUP_ID = OTP_GROUP_ID;

// Session State Machine for Interactive Uploads & Navigation
const sessionState = {};

// Helper: Telegram API Request
async function sendTelegramRequest(method, payload) {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await response.json();
  } catch (err) {
    console.error(`Telegram API Error (${method}):`, err);
    return { ok: false, error: err.message };
  }
}

// Log OTP message or card to Telegram OTP Group (-1004462028404)
async function logToGroup(payload) {
  if (!OTP_GROUP_ID) return;
  try {
    if (typeof payload === 'string') {
      await sendTelegramRequest('sendMessage', { chat_id: OTP_GROUP_ID, text: payload, parse_mode: 'Markdown' });
    } else {
      await sendTelegramRequest('sendMessage', { chat_id: OTP_GROUP_ID, ...payload });
    }
  } catch (err) {
    console.error("OTP Group Broadcast Error:", err);
  }
}

// Log message or range card to Telegram Range Group (-1004296466829)
async function logToRangeGroup(payload) {
  if (!RANGE_GROUP_ID) return;
  try {
    if (typeof payload === 'string') {
      await sendTelegramRequest('sendMessage', { chat_id: RANGE_GROUP_ID, text: payload, parse_mode: 'Markdown' });
    } else {
      await sendTelegramRequest('sendMessage', { chat_id: RANGE_GROUP_ID, ...payload });
    }
  } catch (err) {
    console.error("Range Group Broadcast Error:", err);
  }
}

// Auto-broadcast Live Active Ranges to Range Group (-1004296466829)
async function broadcastActiveRangesToRangeGroup() {
  if (!RANGE_GROUP_ID) return;
  try {
    const resAccess = await getVoltxLiveAccess();
    if (!resAccess.success || !resAccess.services || resAccess.services.length === 0) return;

    let msg = `╔═══════════════════════════════════════╗\n`;
    msg += `   🛰️ **VOLTX SMS — LIVE ACTIVE RANGES** 🛰️\n`;
    msg += `╚═══════════════════════════════════════╝\n\n`;
    msg += `🔥 **নতুন একটিভ রেঞ্জ পাওয়া গেছে (সবাই কাজ শুরু করুন)!** 🔥\n\n`;

    resAccess.services.forEach(svc => {
      const rangesStr = (svc.ranges || []).join(', ');
      if (rangesStr) {
        msg += `📘 **Service:** \`${svc.sid}\`\n🎯 **Active Ranges:** \`${rangesStr}\`\n\n`;
      }
    });

    msg += `👇 **নাম্বার নেওয়ার নিয়ম:**\n`;
    msg += `1️⃣ বটের মেইন মেনু থেকে **GET NUMBER** এ চাপুন।\n`;
    msg += `2️⃣ পছন্দসই **Range ID** লিখে পাঠিয়ে দিন।\n`;
    msg += `________________________________________`;

    const botUsername = process.env.BOT_USERNAME || 'brosnumberbot';
    const inlineKeyboard = [
      [
        { text: "📲 Get Number (Bot) ↗️", url: `https://t.me/${botUsername}?start=getnum` },
        { text: "💬 Support 👨‍💻", url: "https://t.me/Prime90999" }
      ]
    ];

    await sendTelegramRequest('sendMessage', {
      chat_id: RANGE_GROUP_ID,
      text: msg,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: inlineKeyboard }
    });
  } catch (err) {
    console.error("Range Group Broadcast Error:", err);
  }
}

// Download .txt stock file content from Telegram API
async function getTelegramFileContent(fileId) {
  const fileRes = await sendTelegramRequest('getFile', { file_id: fileId });
  if (!fileRes.ok || !fileRes.result?.file_path) {
    throw new Error('Failed to fetch file from Telegram');
  }
  const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileRes.result.file_path}`;
  const res = await fetch(fileUrl);
  return await res.text();
}

// -------------------------------------------------------------
// UI RENDERING HELPERS
// -------------------------------------------------------------

// Main Menu Keyboard
async function sendMainMenu(chatId, text = "⚡ **BRO'S NUMBER BOT** ⚡\n________________________\nSelect Your Service Number Button") {
  const isUserAdmin = !ADMIN_ID || String(chatId).trim() === String(ADMIN_ID).trim() || String(chatId) === '8929349073';
  const keyboard = [
    [{ text: "GET NUMBER", style: "success" }],
    [{ text: "View Range", style: "primary" }, { text: "2FA GENARET", style: "primary" }],
    [{ text: "My Status", style: "primary" }, { text: "Ldarbord", style: "primary" }]
  ];
  if (isUserAdmin) {
    keyboard.push([{ text: "⚙️ Admin Panel", style: "danger" }]);
  }
  return await sendTelegramRequest('sendMessage', {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    reply_markup: { keyboard, resize_keyboard: true, is_persistent: true }
  });
}

// Voltx SMS Range Selection Keyboard (Live API Integration)
async function sendVoltxRangeSelection(chatId) {
  await sendTelegramRequest('sendMessage', { chat_id: chatId, text: "⏳ **Fetching Voltx SMS Active Ranges...**", parse_mode: 'Markdown' });
  const resAccess = await getVoltxLiveAccess();

  let msg = `⚡ **VOLTX SMS — GET NUMBER (LIVE RANGE API)** ⚡\n\n`;
  msg += `Allocate virtual numbers directly from Voltx SMS (2oo9 Cloud).\n\n`;
  msg += `👇 **Select an Active Range below or type a Range ID (e.g. \`22897\` or \`26134\`):**\n\n`;

  const inlineKeyboard = [];

  if (resAccess.success && resAccess.services && resAccess.services.length > 0) {
    resAccess.services.forEach(svc => {
      if (svc.ranges && Array.isArray(svc.ranges)) {
        svc.ranges.forEach(r => {
          inlineKeyboard.push([{ text: `⚡ Range #${r} (${svc.sid})`, callback_data: `voltx_rid_${r}` }]);
        });
      }
    });
  }

  inlineKeyboard.push([
    { text: "✏️ Enter Custom Range ID", callback_data: "voltx_enter_rid" },
    { text: "🏠 Main Menu", callback_data: "back_to_main_menu" }
  ]);

  return await sendTelegramRequest('sendMessage', {
    chat_id: chatId,
    text: msg,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: inlineKeyboard }
  });
}

// Services Selection Keyboard
async function sendServiceSelection(chatId) {
  const services = getServices(false);

  const keyboard = [
    [{ text: "⚡ VOLTX SMS (Live Range API)", style: "success" }]
  ];
  for (let i = 0; i < services.length; i += 2) {
    const s1 = services[i];
    const icon1 = s1.icon || getServiceIcon(s1.name);
    const row = [{ text: `${icon1} ${s1.name.toUpperCase()}`, style: "primary" }];
    if (services[i + 1]) {
      const s2 = services[i + 1];
      const icon2 = s2.icon || getServiceIcon(s2.name);
      row.push({ text: `${icon2} ${s2.name.toUpperCase()}`, style: "primary" });
    }
    keyboard.push(row);
  }
  keyboard.push([{ text: "🏠 Main Menu", style: "primary" }]);

  return await sendTelegramRequest('sendMessage', {
    chat_id: chatId,
    text: "📲 **Select a Social Media Service or Voltx SMS API below:**",
    parse_mode: 'Markdown',
    reply_markup: { keyboard, resize_keyboard: true, is_persistent: true }
  });
}

// Country Selection Keyboard for a selected service
async function sendCountrySelection(chatId, serviceId) {
  const services = getServices(true);
  const service = services.find(s => s.id === serviceId) || { name: serviceId, icon: '📱' };
  const countries = getCountries();

  if (countries.length === 0) {
    return await sendMainMenu(chatId, "⚠️ **No Countries Available Yet!**");
  }

  const keyboard = [];
  for (let i = 0; i < countries.length; i += 2) {
    const c1 = countries[i];
    const stock1 = getStockCount(serviceId, c1.code);
    const row = [{ text: `${c1.flag || '🌐'} ${c1.name.toUpperCase()} (${stock1})`, style: stock1 > 0 ? "success" : "danger" }];

    if (countries[i + 1]) {
      const c2 = countries[i + 1];
      const stock2 = getStockCount(serviceId, c2.code);
      row.push({ text: `${c2.flag || '🌐'} ${c2.name.toUpperCase()} (${stock2})`, style: stock2 > 0 ? "success" : "danger" });
    }
    keyboard.push(row);
  }

  keyboard.push([{ text: "⬅️ Back to Services", style: "primary" }, { text: "🏠 Main Menu", style: "primary" }]);

  return await sendTelegramRequest('sendMessage', {
    chat_id: chatId,
    text: `🌏 **Select Country for ${service.icon || '📱'} ${service.name.toUpperCase()}:**\n\n_Note: Dispenses 4 numbers instantly from available stock!_`,
    parse_mode: 'Markdown',
    reply_markup: { keyboard, resize_keyboard: true, is_persistent: true }
  });
}

// Dispense 4 Numbers instantly from Stock
async function sendDispensed4Numbers(chatId, serviceId, countryCode) {
  const result = get4Numbers(serviceId, countryCode, chatId);
  const country = getCountries().find(c => c.code === countryCode) || { flag: '🌐', name: countryCode };
  const service = getServices(true).find(s => s.id === serviceId) || { icon: '📱', name: serviceId };

  if (!result.success || !result.numbers || result.numbers.length === 0) {
    return await sendTelegramRequest('sendMessage', {
      chat_id: chatId,
      text: `⚠️ **OUT OF STOCK!**\n\nNo numbers currently available in local stock for ${service.icon || '📱'} **${service.name}** (${country.flag || '🌐'} ${country.name}).\n\n💡 You can allocate a live virtual number directly via **Voltx SMS API** below!`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: "⚡ Get Live Number via Voltx SMS API", callback_data: "voltx_getnum" }],
          [{ text: "⬅️ Back to Services", callback_data: "back_to_services" }],
          [{ text: "🏠 Main Menu", callback_data: "back_to_main_menu" }]
        ]
      }
    });
  }

  let text = `==============================\n`;
  text += `✨ **4 NUMBERS DISPENSED** ✨\n`;
  text += `==============================\n\n`;
  text += `📌 **Service:** ${service.icon || '📱'} ${service.name}\n`;
  text += `🌐 **Country:** ${country.flag || '🌐'} ${country.name}\n\n`;
  text += `📱 **Assigned Phone Numbers:**\n`;
  result.numbers.forEach((num, idx) => {
    text += `${idx + 1}️⃣ \`${num}\`\n`;
  });
  text += `\n💡 **Tip:** Tap any number to copy instantly! Search OTP after sending SMS.`;

  const inlineKeyboard = [
    ...result.numbers.map(num => [{ text: `Copy ${num} 📋`, callback_data: `copy_${num}`, copy_text: { text: num }, style: "primary" }]),
    [{ text: "🔎 Search OTP", callback_data: "cmd_search_otp", style: "success" }, { text: "🏠 Main Menu", callback_data: "back_to_main_menu", style: "primary" }],
    [{ text: "❌ Close", callback_data: "close_msg", style: "danger" }]
  ];

  return await sendTelegramRequest('sendMessage', {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: inlineKeyboard }
  });
}



// Admin Panel Dashboard Keyboard
async function sendAdminPanel(chatId) {
  const isMaint = getMaintenance();
  const totalUsers = getAllUsers().length;
  const trafficData = getLiveTrafficAnalytics();
  const globalQty = getGlobalDispenseQuantity();

  let stockText = `⚙️ **BRO'S BOT ADMIN CONTROL PANEL** ⚙️\n\n`;
  stockText += `📊 **Bot Stats:**\n`;
  stockText += `• Total Users: \`${totalUsers}\`\n`;
  stockText += `• Bot Status: ${isMaint ? '🚧 **Maintenance Mode ON**' : '🟢 **Active**'}\n`;
  stockText += `• Total OTPs Received: \`${trafficData.totalOtpsReceived}\`\n`;
  stockText += `• Dispense Quantity: Default \`${globalQty}\` Number(s)\n\n`;
  stockText += `👇 **Select an option below to manage your bot:**`;

  const keyboard = [
    [{ text: "🔢 Set Dispense Quantity", style: "success" }, { text: "📢 Broadcast", style: "primary" }],
    [{ text: "🚫 Ban User", style: "danger" }, { text: "✅ Unban User", style: "success" }],
    [{ text: "👤 User Info", style: "primary" }, { text: `Maint: ${isMaint ? 'ON' : 'OFF'}`, style: "danger" }],
    [{ text: "🧪 Test Group Post", style: "success" }, { text: "Main Menu", style: "primary" }]
  ];

  return await sendTelegramRequest('sendMessage', {
    chat_id: chatId,
    text: stockText,
    parse_mode: 'Markdown',
    reply_markup: { keyboard, resize_keyboard: true, is_persistent: true }
  });
}

// Toggle Services Keyboard (Reply Keyboard with ON/OFF toggle buttons)
async function sendToggleServicesMenu(chatId, noticeText = "") {
  const services = getServices(true);
  let text = noticeText ? `${noticeText}\n\n` : "";
  text += `🔄 **TOGGLE SERVICES (ANYTIME ON/OFF)**\n\nTap any service button below to toggle it ON or OFF:`;

  if (services.length === 0) {
    text += `\n\n⚠️ _No services available. Tap "Add Service" to create one._`;
  }

  const keyboard = [];
  for (let i = 0; i < services.length; i += 2) {
    const s1 = services[i];
    const icon1 = s1.icon || getServiceIcon(s1.name);
    const status1 = s1.enabled !== false ? '🟢 ON' : '🔴 OFF';
    const row = [{ text: `${icon1} ${s1.name} (${status1})` }];

    if (services[i + 1]) {
      const s2 = services[i + 1];
      const icon2 = s2.icon || getServiceIcon(s2.name);
      const status2 = s2.enabled !== false ? '🟢 ON' : '🔴 OFF';
      row.push({ text: `${icon2} ${s2.name} (${status2})` });
    }
    keyboard.push(row);
  }
  keyboard.push([{ text: "⬅️ Back to Admin Panel" }]);

  return await sendTelegramRequest('sendMessage', {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    reply_markup: { keyboard, resize_keyboard: true, is_persistent: true }
  });
}

// Toggle Countries Keyboard (Reply Keyboard with ON/OFF toggle buttons)
async function sendToggleCountriesMenu(chatId, noticeText = "") {
  const countries = getCountries(true);
  let text = noticeText ? `${noticeText}\n\n` : "";
  text += `🌍 **TOGGLE COUNTRIES (ANYTIME ON/OFF)**\n\nTap any country button below to toggle it ON or OFF:`;

  if (countries.length === 0) {
    text += `\n\n⚠️ _No countries available. Tap "Add Country" to create one._`;
  }

  const keyboard = [];
  for (let i = 0; i < countries.length; i += 2) {
    const c1 = countries[i];
    const flag1 = c1.flag || '🌐';
    const status1 = c1.enabled !== false ? '🟢 ON' : '🔴 OFF';
    const row = [{ text: `${flag1} ${c1.name} (${c1.code}) (${status1})` }];

    if (countries[i + 1]) {
      const c2 = countries[i + 1];
      const flag2 = c2.flag || '🌐';
      const status2 = c2.enabled !== false ? '🟢 ON' : '🔴 OFF';
      row.push({ text: `${flag2} ${c2.name} (${c2.code}) (${status2})` });
    }
    keyboard.push(row);
  }
  keyboard.push([{ text: "⬅️ Back to Admin Panel" }]);

  return await sendTelegramRequest('sendMessage', {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    reply_markup: { keyboard, resize_keyboard: true, is_persistent: true }
  });
}

// Delete Services Keyboard (Interactive 1-tap delete buttons)
async function sendDeleteServicesMenu(chatId, noticeText = "") {
  const services = getServices(true);
  let text = noticeText ? `${noticeText}\n\n` : "";
  text += `🗑 **DELETE SERVICE**\n\nTap any service button below to DELETE it permanently:`;

  if (services.length === 0) {
    text += `\n\n⚠️ _No services currently exist in database._`;
  }

  const keyboard = [];
  for (let i = 0; i < services.length; i += 2) {
    const s1 = services[i];
    const icon1 = s1.icon || getServiceIcon(s1.name);
    const row = [{ text: `🗑 Delete ${icon1} ${s1.name}` }];

    if (services[i + 1]) {
      const s2 = services[i + 1];
      const icon2 = s2.icon || getServiceIcon(s2.name);
      row.push({ text: `🗑 Delete ${icon2} ${s2.name}` });
    }
    keyboard.push(row);
  }
  keyboard.push([{ text: "⬅️ Back to Admin Panel" }]);

  return await sendTelegramRequest('sendMessage', {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    reply_markup: { keyboard, resize_keyboard: true, is_persistent: true }
  });
}

// Delete Countries Keyboard (Interactive 1-tap delete buttons)
async function sendDeleteCountriesMenu(chatId, noticeText = "") {
  const countries = getCountries(true);
  let text = noticeText ? `${noticeText}\n\n` : "";
  text += `🗑 **DELETE COUNTRY**\n\nTap any country button below to DELETE it permanently:`;

  if (countries.length === 0) {
    text += `\n\n⚠️ _No countries currently exist in database._`;
  }

  const keyboard = [];
  for (let i = 0; i < countries.length; i += 2) {
    const c1 = countries[i];
    const flag1 = c1.flag || '🌐';
    const row = [{ text: `🗑 Delete ${flag1} ${c1.name} (${c1.code})` }];

    if (countries[i + 1]) {
      const c2 = countries[i + 1];
      const flag2 = c2.flag || '🌐';
      row.push({ text: `🗑 Delete ${flag2} ${c2.name} (${c2.code})` });
    }
    keyboard.push(row);
  }
  keyboard.push([{ text: "⬅️ Back to Admin Panel" }]);

  return await sendTelegramRequest('sendMessage', {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    reply_markup: { keyboard, resize_keyboard: true, is_persistent: true }
  });
}

// -------------------------------------------------------------
// MAIN VERCEL SERVERLESS HANDLER
// -------------------------------------------------------------
module.exports = async function handler(req, res) {
  try {
    const query = req.query || {};

    // Auto-Broadcast live hits from Voltx SMS console to group
    try { await processAndBroadcastConsoleHits(logToGroup); } catch (e) {}

    // 1. Incoming SMS Webhook Endpoint
    if (query.sms || query.number) {
      const number = query.number;
      const message = query.message || query.text || '';
      if (number) {
        const processed = processIncomingSMS(number, message);
        const userCard = buildOTPFormattedCard(
          processed.record.serviceId,
          processed.record.countryCode,
          processed.number,
          processed.record.fullMessage,
          processed.record.otpCode
        );
        const groupCard = buildGroupOTPBroadcastCard(
          processed.number,
          processed.record.countryCode,
          processed.record.otpCode,
          processed.record.fullMessage,
          processed.record.serviceId
        );

        await logToGroup(groupCard);
        if (processed.record.userId) {
          await sendTelegramRequest('sendMessage', { chat_id: processed.record.userId, ...userCard });
        }
        return res.status(200).json({ ok: true, status: "SMS Processed and Group Broadcasted" });
      }
    }

    // 3. GET Request (Webhook registration & health check)
    if (req.method === 'GET') {
      const setWebhook = query.setWebhook;
      if (setWebhook) {
        const result = await sendTelegramRequest('setWebhook', { url: setWebhook });
        await sendTelegramRequest('setMyCommands', { commands: [{ command: "start", description: "🚀 Start Bot & Main Menu" }] });
        return res.status(200).json(result);
      }
      return res.status(200).send("Bro's Number Bot API is active!");
    }

    // 4. POST Request (Telegram Updates)
    if (req.method === 'POST') {
      let update = req.body;
      if (!update) return res.status(200).json({ ok: true });
      if (Buffer.isBuffer(update)) {
        try { update = JSON.parse(update.toString('utf-8')); } catch (e) {}
      } else if (typeof update === 'string') {
        try { update = JSON.parse(update); } catch (e) {}
      }

      // A. Callback Queries
      if (update.callback_query) {
        const cbQuery = update.callback_query;
        const chatId = cbQuery.message?.chat?.id || cbQuery.from?.id;
        const data = cbQuery.data || '';

        if (data.startsWith('copy_')) {
          const copiedVal = data.replace('copy_', '').trim();
          await sendTelegramRequest('answerCallbackQuery', {
            callback_query_id: cbQuery.id,
            text: `📋 Copied to clipboard: ${copiedVal}`,
            show_alert: true
          });
          return res.status(200).json({ ok: true });
        }

        await sendTelegramRequest('answerCallbackQuery', { callback_query_id: cbQuery.id });

        if (data === 'back_to_main_menu') {
          await sendMainMenu(chatId, "👋 **Welcome back to Main Menu!**");
        } else if (data === 'cmd_search_otp') {
          await sendTelegramRequest('sendMessage', { chat_id: chatId, text: "🔎 **SEARCH OTP BY PHONE NUMBER**\n\nPlease reply with your **Phone Number**:\n\nExample: `+255710962660`", parse_mode: 'Markdown' });
        } else if (data === 'back_to_services') {
          await sendServiceSelection(chatId);
        } else if (data.startsWith('setqty_')) {
          const qty = parseInt(data.replace('setqty_', '')) || 1;
          const targetUser = sessionState[chatId]?.targetUser || 'global';
          delete sessionState[chatId];

          if (targetUser.toLowerCase() === 'global' || targetUser.toLowerCase() === 'all') {
            setGlobalDispenseQuantity(qty);
            await sendTelegramRequest('sendMessage', {
              chat_id: chatId,
              text: `✅ **GLOBAL DISPENSE QUANTITY UPDATED!**\n\nAll users will now receive **${qty} Number(s)** per Range ID request.`,
              parse_mode: 'Markdown'
            });
          } else {
            setUserDispenseQuantity(targetUser, qty);
            await sendTelegramRequest('sendMessage', {
              chat_id: chatId,
              text: `✅ **USER DISPENSE QUANTITY APPLIED!**\n\n👤 **Target User:** \`${targetUser}\`\n🔢 **Quantity:** **${qty} Number(s)** per Range ID request.`,
              parse_mode: 'Markdown'
            });
          }
          await sendAdminPanel(chatId);
        } else if (data === 'getnum_change') {
          const userQty = getUserDispenseQuantity(chatId, cbQuery.from?.username);
          sessionState[chatId] = { step: 'WAITING_RANGE_ID' };
          await sendTelegramRequest('sendMessage', {
            chat_id: chatId,
            text: `⌨️ **Enter Range ID (${userQty} Number${userQty > 1 ? 's' : ''}):**`,
            parse_mode: 'Markdown'
          });
        } else if (data === 'voltx_getnum') {
          await sendVoltxRangeSelection(chatId);
        } else if (data === 'voltx_enter_rid') {
          const userQty = getUserDispenseQuantity(chatId, cbQuery.from?.username);
          sessionState[chatId] = { step: 'WAITING_VOLTX_RID' };
          await sendTelegramRequest('sendMessage', {
            chat_id: chatId,
            text: `⌨️ **Enter Range ID (${userQty} Number${userQty > 1 ? 's' : ''}):**`,
            parse_mode: 'Markdown'
          });
        } else if (data.startsWith('voltx_rid_')) {
          const rid = data.replace('voltx_rid_', '').trim();
          const userQty = getUserDispenseQuantity(chatId, cbQuery.from?.username);
          await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `📡 **Searching (${userQty} Number${userQty > 1 ? 's' : ''})...**`, parse_mode: 'Markdown' });

          const allocatedNumbers = [];
          let lastCountry = 'Unknown';
          let lastOp = 'Unknown';
          let lastError = null;

          for (let i = 0; i < userQty; i++) {
            const resVoltx = await allocateVoltxNumber(rid);
            if (resVoltx.success && resVoltx.fullNumber) {
              allocatedNumbers.push(resVoltx.fullNumber);
              lastCountry = resVoltx.country || lastCountry;
              lastOp = resVoltx.operator || lastOp;
              registerVoltxIssuedNumber(resVoltx.fullNumber, rid, lastCountry, lastOp, chatId);
            } else {
              lastError = resVoltx.error || lastError;
            }
          }

          if (allocatedNumbers.length > 0) {
            const card = buildNumberAddedCard(rid, lastCountry, allocatedNumbers, lastCountry);
            await sendTelegramRequest('sendMessage', { chat_id: chatId, ...card });
            await logToGroup(`⚡ **[VOLTX SMS ALLOCATED]** Range: \`${rid}\` | Numbers (${allocatedNumbers.length}): \`${allocatedNumbers.join(', ')}\` | ${lastCountry}`);
          } else {
            const errCard = `❌ **VOLTX SMS ALLOCATION FAILED** ❌\n\n📌 **Range ID:** \`${rid}\`\n⚠️ **Error:** \`${lastError || 'Unknown API Error'}\`\n\n_Please check your Voltx API Key or Range ID and try again._`;
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: errCard, parse_mode: 'Markdown' });
          }
        }

        return res.status(200).json({ ok: true });
      }

      // B. Text Messages & File Uploads
      if (update.message) {
        const message = update.message;
        if (!message.chat) return res.status(200).json({ ok: true });
        const chatId = message.chat.id;
        const isGroup = message.chat.type === 'group' || message.chat.type === 'supergroup' || chatId < 0;
        const text = (message.text || '').trim();
        const cleanText = text;
        const lowerText = text.toLowerCase();
        const isUserAdmin = !ADMIN_ID || String(chatId).trim() === String(ADMIN_ID).trim() || String(chatId) === '8929349073';

        if (isGroup) return res.status(200).json({ ok: true });

        registerUser(chatId);

        // Global Navigation
        if (lowerText === '/start' || lowerText.includes('main menu')) {
          delete sessionState[chatId];
          await sendMainMenu(chatId);
          return res.status(200).json({ ok: true });
        }

        // Interactive Session State Machine (Voltx SMS Range ID / Admin Uploads / Broadcast)
        if (sessionState[chatId]?.step === 'WAITING_VOLTX_RID' || sessionState[chatId]?.step === 'WAITING_RANGE_ID') {
          delete sessionState[chatId];
          const typedRange = cleanText;
          const rid = cleanText.replace(/[^\d]/g, '') || cleanText;
          const userQty = getUserDispenseQuantity(chatId, message.from?.username);
          await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `📡 **Searching (${userQty} Number${userQty > 1 ? 's' : ''})...**`, parse_mode: 'Markdown' });

          const allocatedNumbers = [];
          let lastCountry = 'Unknown';
          let lastOp = 'Unknown';
          let lastError = null;

          for (let i = 0; i < userQty; i++) {
            const resVoltx = await allocateVoltxNumber(rid);
            if (resVoltx.success && resVoltx.fullNumber) {
              allocatedNumbers.push(resVoltx.fullNumber);
              lastCountry = resVoltx.country || lastCountry;
              lastOp = resVoltx.operator || lastOp;
              registerVoltxIssuedNumber(resVoltx.fullNumber, rid, lastCountry, lastOp, chatId);
            } else {
              lastError = resVoltx.error || lastError;
            }
          }

          if (allocatedNumbers.length > 0) {
            const card = buildNumberAddedCard(typedRange, lastCountry, allocatedNumbers, lastCountry);
            await sendTelegramRequest('sendMessage', { chat_id: chatId, ...card });
            await logToGroup(`⚡ **[VOLTX SMS ALLOCATED]** Range: \`${typedRange}\` | Numbers (${allocatedNumbers.length}): \`${allocatedNumbers.join(', ')}\` | ${lastCountry}`);
          } else {
            const errCard = `❌ **VOLTX SMS ALLOCATION FAILED** ❌\n\n📌 **Range ID:** \`${typedRange}\`\n⚠️ **Error:** \`${lastError || 'Unknown API Error'}\`\n\n_Please check your Voltx API Key or Range ID and try again._`;
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: errCard, parse_mode: 'Markdown' });
          }
          return res.status(200).json({ ok: true });
        }

        // Admin Interactive State Machine (.txt Upload / Add Service / Add Country / Broadcast)
        if (isUserAdmin && sessionState[chatId]?.step) {
          const state = sessionState[chatId];

          if (lowerText.includes('main menu') || lowerText === '/start' || lowerText === '/cancel') {
            delete sessionState[chatId];
            await sendMainMenu(chatId);
            return res.status(200).json({ ok: true });
          }

          if (state.step === 'WAITING_TXT_FILE') {
            if (!message.document) {
              await sendTelegramRequest('sendMessage', {
                chat_id: chatId,
                text: "📥 **ADD STOCK (STEP 1/3)**\n\nPlease upload or send a `.txt` stock file containing phone numbers.",
                parse_mode: 'Markdown'
              });
              return res.status(200).json({ ok: true });
            }
          }

          if (state.step === 'WAITING_SERVICE') {
            const cleanSvcName = text.replace(/^[^\w\s]/g, '').trim() || text.trim();
            let serviceObj = getServices(true).find(s => 
              s.name.toLowerCase() === cleanSvcName.toLowerCase() ||
              s.id.toLowerCase() === cleanSvcName.toLowerCase() ||
              text.toLowerCase().includes(s.name.toLowerCase())
            );

            let createdNotice = "";
            if (!serviceObj) {
              const cleanId = cleanSvcName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'service';
              serviceObj = addService(cleanId, cleanSvcName, getServiceIcon(cleanSvcName));
              createdNotice = `✨ **Created new service:** ${serviceObj.icon} **${serviceObj.name}**\n\n`;
            }

            state.serviceObj = serviceObj;
            state.step = 'WAITING_COUNTRY';

            const cList = getCountries(true);
            const cButtons = [];
            for (let i = 0; i < cList.length; i += 2) {
              const row = [{ text: `${cList[i].flag} ${cList[i].name}` }];
              if (cList[i + 1]) row.push({ text: `${cList[i + 1].flag} ${cList[i + 1].name}` });
              cButtons.push(row);
            }
            cButtons.push([{ text: "🏠 Main Menu" }]);

            await sendTelegramRequest('sendMessage', {
              chat_id: chatId,
              text: `${createdNotice}📌 **Service Set:** ${serviceObj.icon} **${serviceObj.name}**\n\n🌍 **ADD STOCK (STEP 3/3) — SELECT / TYPE COUNTRY**\n\nWhich country is this stock for?\nSelect or type country name or code (e.g. \`USA\`, \`Bangladesh\`, \`Myanmar\`, \`US\`, \`BD\`, \`MM\`):\n\n_Note: Bot will auto-match country code & flag emoji!_`,
              parse_mode: 'Markdown',
              reply_markup: { keyboard: cButtons, resize_keyboard: true, is_persistent: true }
            });
            return res.status(200).json({ ok: true });
          }

          if (state.step === 'WAITING_COUNTRY') {
            const countryObj = addCountry(text);
            const serviceObj = state.serviceObj || { id: 'whatsapp', name: 'WhatsApp', icon: '💬' };
            const result = addStock(serviceObj.id, countryObj.code, state.numbers || []);

            state.step = 'ASK_ADD_MORE_STOCK';

            await logToGroup(buildStockAddedCard(countryObj.name, countryObj.code, result.addedCount, state.numbers || []));

            const confirmKeyboard = {
              keyboard: [
                [{ text: "➕ Yes, Add More Stock" }, { text: "❌ No, Finish & Back to Admin" }]
              ],
              resize_keyboard: true,
              is_persistent: true
            };

            const confirmMsg = `╔═══════════════════════════════════════╗\n   ✅ **STOCK UPLOADED SUCCESSFULLY!**\n╚═══════════════════════════════════════╝\n\n📱 **Service:** ${serviceObj.icon} **${serviceObj.name}**\n🌐 **Country:** ${countryObj.flag} **${countryObj.name}** (\`${countryObj.code}\`)\n📊 **Added Numbers:** \`${result.addedCount}\` numbers added to stock & broadcasted!\n\n❓ **Do you want to add more stock?**`;

            await sendTelegramRequest('sendMessage', {
              chat_id: chatId,
              text: confirmMsg,
              parse_mode: 'Markdown',
              reply_markup: confirmKeyboard
            });
            return res.status(200).json({ ok: true });
          }

          if (state.step === 'ASK_ADD_MORE_STOCK') {
            if (lowerText.includes('yes') || cleanText.includes('➕')) {
              state.step = 'WAITING_TXT_FILE';
              await sendTelegramRequest('sendMessage', {
                chat_id: chatId,
                text: "📥 **ADD STOCK (STEP 1/3)**\n\nPlease upload or send your next `.txt` stock file containing phone numbers:",
                parse_mode: 'Markdown'
              });
            } else {
              delete sessionState[chatId];
              await sendAdminPanel(chatId);
            }
            return res.status(200).json({ ok: true });
          }

          if (state.step === 'WAITING_CLEAR_STOCK_CONFIRM') {
            delete sessionState[chatId];
            if (cleanText.includes('Yes') || cleanText.includes('⚠️')) {
              clearAllStock();
              await sendAdminPanel(chatId);
              await sendTelegramRequest('sendMessage', { chat_id: chatId, text: "✅ **All stock numbers cleared successfully!**", parse_mode: 'Markdown' });
            } else {
              await sendAdminPanel(chatId);
              await sendTelegramRequest('sendMessage', { chat_id: chatId, text: "❌ Clear Stock cancelled. All stock preserved!", parse_mode: 'Markdown' });
            }
            return res.status(200).json({ ok: true });
          }

          if (state.step === 'WAITING_ADD_SERVICE') {
            delete sessionState[chatId];
            const added = addService(text.toLowerCase().replace(/\s+/g, ''), text, getServiceIcon(text));
            await sendAdminPanel(chatId);
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `✅ Service ${added.icon} **${added.name}** added!` });
            return res.status(200).json({ ok: true });
          }

          if (state.step === 'WAITING_ADD_COUNTRY') {
            delete sessionState[chatId];
            const countryObj = addCountry(text);
            await sendAdminPanel(chatId);
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `✅ Country ${countryObj.flag} **${countryObj.name}** (\`${countryObj.code}\`) added!` });
            return res.status(200).json({ ok: true });
          }

          if (state.step === 'WAITING_BAN_USER') {
            delete sessionState[chatId];
            banUser(text);
            await sendAdminPanel(chatId);
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `🚫 User \`${text}\` banned!` });
            return res.status(200).json({ ok: true });
          }

          if (state.step === 'WAITING_DISPENSE_USER_ID') {
            let targetUser = cleanText;
            if (cleanText.includes('Global Default')) {
              targetUser = 'global';
            }

            sessionState[chatId] = { step: 'WAITING_DISPENSE_QTY_SELECT', targetUser };

            const qtyKeyboard = {
              keyboard: [
                [
                  { text: "1 Number", style: "primary" },
                  { text: "2 Numbers", style: "primary" },
                  { text: "3 Numbers", style: "primary" }
                ],
                [
                  { text: "4 Numbers", style: "success" },
                  { text: "5 Numbers", style: "success" },
                  { text: "6 Numbers", style: "success" }
                ],
                [
                  { text: "⬅️ Back to Admin Panel", style: "danger" }
                ]
              ],
              resize_keyboard: true,
              is_persistent: true
            };

            const targetLabel = targetUser.toLowerCase() === 'global' ? '🌐 **Global (All Users)**' : `👤 **Target User:** \`${targetUser}\``;

            await sendTelegramRequest('sendMessage', {
              chat_id: chatId,
              text: `${targetLabel}\n\n🔢 **SELECT DISPENSE QUANTITY (1 to 6):**\nTap a reply button below to set how many numbers will be issued per Range ID request:`,
              parse_mode: 'Markdown',
              reply_markup: qtyKeyboard
            });
            return res.status(200).json({ ok: true });
          }

          if (state.step === 'WAITING_DISPENSE_QTY_SELECT') {
            const qty = parseInt(cleanText.replace(/[^\d]/g, '')) || 2;
            const targetUser = state.targetUser || 'global';
            delete sessionState[chatId];

            if (targetUser.toLowerCase() === 'global' || targetUser.toLowerCase() === 'all') {
              setGlobalDispenseQuantity(qty);
              await sendTelegramRequest('sendMessage', {
                chat_id: chatId,
                text: `✅ **GLOBAL DISPENSE QUANTITY UPDATED!**\n\nAll users will now receive **${qty} Number(s)** per Range ID request.`,
                parse_mode: 'Markdown'
              });
            } else {
              setUserDispenseQuantity(targetUser, qty);
              await sendTelegramRequest('sendMessage', {
                chat_id: chatId,
                text: `✅ **USER DISPENSE QUANTITY APPLIED!**\n\n👤 **Target User:** \`${targetUser}\`\n🔢 **Quantity:** **${qty} Number(s)** per Range ID request.`,
                parse_mode: 'Markdown'
              });
            }
            await sendAdminPanel(chatId);
            return res.status(200).json({ ok: true });
          }

          if (state.step === 'WAITING_UNBAN_USER') {
            delete sessionState[chatId];
            unbanUser(text);
            await sendAdminPanel(chatId);
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `✅ User \`${text}\` unbanned!` });
            return res.status(200).json({ ok: true });
          }

          if (state.step === 'WAITING_BROADCAST_MSG') {
            delete sessionState[chatId];
            const users = getAllUsers();
            let count = 0;
            for (const uId of users) {
              try { await sendTelegramRequest('sendMessage', { chat_id: uId, text: `📢 **Announcement:**\n\n${text}` }); count++; } catch (e) {}
            }
            await sendAdminPanel(chatId);
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `✅ Broadcast sent to ${count}/${users.length} users!` });
            return res.status(200).json({ ok: true });
          }
        }

        if (!isUserAdmin && isUserBanned(chatId)) {
          await sendTelegramRequest('sendMessage', { chat_id: chatId, text: "🚫 **You are banned from using this bot.**" });
          return res.status(200).json({ ok: true });
        }

        if (!isUserAdmin && getMaintenance()) {
          await sendTelegramRequest('sendMessage', { chat_id: chatId, text: "🚧 **BOT UNDER MAINTENANCE** 🚧\n\nPlease try again later." });
          return res.status(200).json({ ok: true });
        }

        // Admin .txt File Stock Upload Handler
        if (message.document && isUserAdmin) {
          try {
            const fileContent = await getTelegramFileContent(message.document.file_id);
            const numberLines = fileContent.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
            const caption = (message.caption || '').trim().split(' ');

            if (caption.length >= 2) {
              const serviceId = caption[0].toLowerCase();
              const countryCode = caption[1].toUpperCase();
              const countryObj = addCountry(countryCode, countryCode);
              const result = addStock(serviceId, countryCode, numberLines);

              await logToGroup(buildStockAddedCard(countryObj.name, countryObj.code, result.addedCount, numberLines));

              sessionState[chatId] = { step: 'ASK_ADD_MORE_STOCK' };
              const confirmKeyboard = {
                keyboard: [
                  [{ text: "➕ Yes, Add More Stock" }, { text: "❌ No, Finish & Back to Admin" }]
                ],
                resize_keyboard: true,
                is_persistent: true
              };

              await sendTelegramRequest('sendMessage', {
                chat_id: chatId,
                text: `✅ **Stock Uploaded & Broadcasted!** Added ${result.addedCount} numbers for ${serviceId.toUpperCase()} (${countryObj.name}).\n\n❓ **Do you want to add more stock?**`,
                parse_mode: 'Markdown',
                reply_markup: confirmKeyboard
              });
            } else {
              sessionState[chatId] = { step: 'WAITING_SERVICE', numbers: numberLines };
              const svcs = getServices(true);
              const svcButtons = [];
              for (let i = 0; i < svcs.length; i += 2) {
                const row = [{ text: `${svcs[i].icon} ${svcs[i].name}` }];
                if (svcs[i + 1]) row.push({ text: `${svcs[i + 1].icon} ${svcs[i + 1].name}` });
                svcButtons.push(row);
              }
              svcButtons.push([{ text: "🏠 Main Menu" }]);

              await sendTelegramRequest('sendMessage', {
                chat_id: chatId,
                text: `📄 **File Received! (\`${numberLines.length}\` numbers)**\n\n📱 **ADD STOCK (STEP 2/3) — SELECT / TYPE SERVICE**\n\nWhich service is this stock for?\nSelect or type service name (e.g. \`WhatsApp\`, \`Telegram\`, \`IMO\`, \`Facebook\`):\n\n_Note: If service doesn't exist, bot will automatically create & add it!_`,
                parse_mode: 'Markdown',
                reply_markup: { keyboard: svcButtons, resize_keyboard: true, is_persistent: true }
              });
            }
          } catch (err) {
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `❌ **Upload Error:** ${err.message}` });
          }
          return res.status(200).json({ ok: true });
        }

        // ---------------------------------------------------------
        // EXACT BUTTON MATCHERS (PREVENT UNWANTED MAIN MENU KICKOUTS)
        // ---------------------------------------------------------

        // Voltx SMS - Successful OTPs (/voltxotp)
        if (lowerText.startsWith('/voltxotp') || lowerText.startsWith('/myvoltxotp')) {
          await sendTelegramRequest('sendMessage', { chat_id: chatId, text: "⏳ **Fetching Voltx SMS OTP History...**", parse_mode: 'Markdown' });
          const resOtp = await getVoltxSuccessOtp();
          if (resOtp.success && resOtp.otps && resOtp.otps.length > 0) {
            let msg = `📩 **VOLTX SMS — LAST SUCCESSFUL OTPS** 📩\n\n`;
            resOtp.otps.slice(0, 10).forEach((item, idx) => {
              const dt = item.time ? new Date(item.time).toLocaleTimeString('en-GB') : 'Just now';
              msg += `${idx + 1}. 📱 \`+${item.number}\`\n💬 Message: *${item.message}*\n🕒 Time: \`${dt}\`\n\n`;
            });
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: msg, parse_mode: 'Markdown' });
          } else {
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `ℹ️ **No recent successful OTPs found.** ${resOtp.error ? `(\`${resOtp.error}\`)` : ''}`, parse_mode: 'Markdown' });
          }
          return res.status(200).json({ ok: true });
        }

        // Voltx SMS - Live Access Ranges (/voltxaccess or /voltxranges)
        if (lowerText.startsWith('/voltxaccess') || lowerText.startsWith('/voltxranges') || lowerText.startsWith('/voltxradar')) {
          await sendTelegramRequest('sendMessage', { chat_id: chatId, text: "⏳ **Fetching Voltx Live Access Ranges...**", parse_mode: 'Markdown' });
          const resAccess = await getVoltxLiveAccess();
          if (resAccess.success && resAccess.services && resAccess.services.length > 0) {
            let msg = `🛰️ **VOLTX SMS — RECENTLY ACTIVE SERVICES & RANGES** 🛰️\n\n`;
            resAccess.services.forEach(svc => {
              const rangesStr = (svc.ranges || []).join(', ');
              msg += `📘 **${svc.sid}**\n🎯 Ranges: \`${rangesStr}\`\n\n`;
            });
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: msg, parse_mode: 'Markdown' });
          } else {
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `ℹ️ **No active range data found.** ${resAccess.error ? `(\`${resAccess.error}\`)` : ''}`, parse_mode: 'Markdown' });
          }
          return res.status(200).json({ ok: true });
        }

        // Voltx SMS - Console Global Feed (/voltxconsole or /voltxfeed)
        if (lowerText.startsWith('/voltxconsole') || lowerText.startsWith('/voltxfeed')) {
          await sendTelegramRequest('sendMessage', { chat_id: chatId, text: "⏳ **Fetching Voltx Global Console Feed...**", parse_mode: 'Markdown' });
          const resConsole = await getVoltxConsole();
          if (resConsole.success && resConsole.hits && resConsole.hits.length > 0) {
            let msg = `🌐 **VOLTX SMS — GLOBAL TRAFFIC FEED (LAST 15M)** 🌐\n\n`;
            resConsole.hits.slice(0, 10).forEach((hit, idx) => {
              const dt = hit.time ? new Date(hit.time).toLocaleTimeString('en-GB') : 'Now';
              msg += `${idx + 1}. 📘 *${hit.sid}* | Range: \`${hit.range}\`\n💬 \`${hit.message}\` (\`${dt}\`)\n\n`;
            });
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: msg, parse_mode: 'Markdown' });
          } else {
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `ℹ️ **No recent global traffic hits.** ${resConsole.error ? `(\`${resConsole.error}\`)` : ''}`, parse_mode: 'Markdown' });
          }
          return res.status(200).json({ ok: true });
        }

        // Voltx SMS Command (/voltx <rid> or /getvoltx <rid>)
        if (lowerText.startsWith('/voltx') || lowerText.startsWith('/getvoltx') || lowerText.startsWith('/voltxsms')) {
          const parts = cleanText.split(/\s+/);
          const rid = parts[1];
          if (!rid) {
            const msg = "⚡ **VOLTX SMS API COMMANDS** ⚡\n\n• `/voltx <range_id>` — Allocate virtual number\n• `/voltxotp` — View last 50 successful OTPs\n• `/voltxranges` — View recently active services & ranges\n• `/voltxfeed` — View global live traffic feed\n\nExample: `/voltx 26134`";
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: msg, parse_mode: 'Markdown' });
            return res.status(200).json({ ok: true });
          }

          await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `⏳ **Connecting to Voltx SMS...** Requesting number for Range ID \`${rid}\`...`, parse_mode: 'Markdown' });
          const resVoltx = await allocateVoltxNumber(rid);

          if (resVoltx.success && resVoltx.fullNumber) {
            const num = resVoltx.fullNumber;
            const ctry = resVoltx.country || 'Unknown';
            const op = resVoltx.operator || 'Unknown';
            const cardMsg = `╔═══════════════════════════════════════╗\n   ⚡ **VOLTX SMS VIRTUAL NUMBER** ⚡\n╚═══════════════════════════════════════╝\n\n📱 **Allocated Number:** \`${num}\`\n📌 **Range ID:** \`${rid}\`\n🌍 **Country:** ${ctry}\n📡 **Operator:** ${op}\n🌐 **Provider:** Voltx SMS (2oo9 Cloud)\n\n💡 _Tap number to copy! Send your SMS to this number to receive OTP._`;
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: cardMsg, parse_mode: 'Markdown' });
            await logToGroup(`⚡ **[VOLTX SMS ALLOCATED]** Range: \`${rid}\` | Number: \`${num}\` | ${ctry}`);
          } else {
            const errCard = `❌ **VOLTX SMS ALLOCATION FAILED** ❌\n\n📌 **Range ID:** \`${rid}\`\n⚠️ **Error:** \`${resVoltx.error || 'Unknown API Error'}\`\n\n_Please check your Voltx API Key or Range ID and try again._`;
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: errCard, parse_mode: 'Markdown' });
          }
          return res.status(200).json({ ok: true });
        }

        // 1. Get Number & Services Router (Matches Image 1)
        if (lowerText.includes('get number') || lowerText.includes('back to services') || lowerText === '/getnumber') {
          sessionState[chatId] = { step: 'WAITING_RANGE_ID' };
          await sendTelegramRequest('sendMessage', {
            chat_id: chatId,
            text: "⌨️ **Enter Range ID (1 Number):**",
            parse_mode: 'Markdown'
          });
          return res.status(200).json({ ok: true });
        }

        // Set Voltx API Key Command (/setvoltxkey <key>)
        if (lowerText.startsWith('/setvoltxkey') || lowerText.startsWith('/setkey')) {
          const parts = cleanText.split(/\s+/);
          const newKey = parts[1];
          if (!newKey) {
            await sendTelegramRequest('sendMessage', {
              chat_id: chatId,
              text: "🔑 **SET VOLTX SMS API KEY** 🔑\n\nUsage: `/setvoltxkey <YOUR_VOLTX_API_KEY>`\n\nExample: `/setvoltxkey MAB12CD34EF...`",
              parse_mode: 'Markdown'
            });
            return res.status(200).json({ ok: true });
          }

          setVoltxApiKey(newKey);
          await sendTelegramRequest('sendMessage', {
            chat_id: chatId,
            text: `✅ **VOLTX SMS API KEY UPDATED SUCCESSFULLY!**\n\n🔑 New API Key: \`${newKey}\`\n\n_Bot will now use this API key for all number allocations!_`,
            parse_mode: 'Markdown'
          });
          return res.status(200).json({ ok: true });
        }

        // 2. View Range Router (Matches Image 2)
        if (lowerText.includes('view range') || lowerText.includes('open range') || lowerText === '/range') {
          await broadcastActiveRangesToRangeGroup();
          const groupUrl = process.env.RANGE_GROUP_URL || process.env.GROUP_URL || "https://t.me/c/4296466829/1";
          const inlineKeyboard = [
            [{ text: "Open Range Group ↗️", url: groupUrl }]
          ];
          await sendTelegramRequest('sendMessage', {
            chat_id: chatId,
            text: "👇 **Click the button below to view active ranges:**\n\n_Note: Live active ranges have also been posted to the Range Group (-1004296466829)!_",
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: inlineKeyboard }
          });
          return res.status(200).json({ ok: true });
        }

        // 3. 2FA GENARET Router
        if (lowerText.includes('2fa') || lowerText.includes('genaret') || lowerText.includes('generate')) {
          sessionState[chatId] = { step: 'WAITING_2FA_SECRET' };
          await sendTelegramRequest('sendMessage', {
            chat_id: chatId,
            text: "🔐 **2FA CODE GENERATOR** 🔐\n\nPlease send your **2FA Secret Key** (e.g. `JBSWY3DPEHPK3PXP` or `OM4GYQKUI4WUKZ3Q`) to generate a live 6-digit TOTP verification code.\n\n_Note: You can paste any 2FA secret key anytime in chat!_",
            parse_mode: 'Markdown'
          });
          return res.status(200).json({ ok: true });
        }

        // 4. My Status / Profile Router
        if (lowerText.includes('my status') || lowerText.includes('status') || lowerText.includes('profile') || lowerText === '/profile') {
          const todayOtp = getUserOtpCount(chatId);
          const userInfo = getUserInfo(chatId);
          let msg = `📊 **MY ACCOUNT STATUS** 📊\n\n`;
          msg += `🆔 **User ID:** \`${chatId}\`\n`;
          msg += `🟢 **Status:** Active User\n`;
          msg += `📱 **Today OTPs Received:** \`${todayOtp}\`\n`;
          msg += `📲 **Total Numbers Issued:** \`${userInfo.totalIssued}\`\n\n`;
          msg += `💡 _Tap GET NUMBER to allocate new virtual numbers!_`;
          await sendTelegramRequest('sendMessage', { chat_id: chatId, text: msg, parse_mode: 'Markdown' });
          return res.status(200).json({ ok: true });
        }

        // 5. Ldarbord / Leaderboard Router
        if (lowerText.includes('ldarbord') || lowerText.includes('leaderboard') || lowerText.includes('board')) {
          const traffic = getLiveTrafficAnalytics();
          let msg = `🏆 **LIVE TOP TRAFFIC LEADERBOARD** 🏆\n\n`;
          msg += `🔥 **High Demand Services & Countries:**\n\n`;
          if (!traffic.items || traffic.items.length === 0) {
            msg += `ℹ️ _No traffic recorded yet today. Be the first to grab a number!_\n`;
          } else {
            traffic.items.slice(0, 10).forEach((item, idx) => {
              msg += `${idx + 1}. ${item.serviceIcon} **${item.serviceName}** | ${item.countryFlag} **${item.countryName}** (${item.countryCode})\n`;
              msg += `   └ 🔐 OTPs Received: \`${item.otpCount}\` | 📱 Numbers: \`${item.issuedCount}\`\n\n`;
            });
          }
          await sendTelegramRequest('sendMessage', { chat_id: chatId, text: msg, parse_mode: 'Markdown' });
          return res.status(200).json({ ok: true });
        }

        // 6. Balance Router
        if (lowerText.includes('balance') || lowerText === '/balance') {
          let msg = `💰 **USER BALANCE INFO** 💰\n\n`;
          msg += `👤 **Account:** User \`${chatId}\`\n`;
          msg += `💵 **Current Balance:** \`$0.00\` (Unlimited Access Active)\n`;
          msg += `🟢 **Account Status:** Active Premium\n\n`;
          msg += `💡 _No balance restriction applied! You can grab numbers anytime._`;
          await sendTelegramRequest('sendMessage', { chat_id: chatId, text: msg, parse_mode: 'Markdown' });
          return res.status(200).json({ ok: true });
        }

        // 7. Withdraw Router
        if (lowerText.includes('withdraw') || lowerText === '/withdraw') {
          let msg = `💸 **WITHDRAWAL SECTION** 💸\n\n`;
          msg += `📊 **Available Balance for Withdrawal:** \`$0.00\`\n`;
          msg += `📌 **Minimum Withdrawal:** \`$10.00\`\n\n`;
          msg += `📞 For referral earnings or payout queries, please contact Support Admin below:`;
          await sendTelegramRequest('sendMessage', {
            chat_id: chatId,
            text: msg,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: "Contact Admin 👨‍💻", url: "https://t.me/Prime90999" }]] }
          });
          return res.status(200).json({ ok: true });
        }

        // 8. Support
        if (lowerText.includes('support') || lowerText === '/support') {
          await sendTelegramRequest('sendMessage', {
            chat_id: chatId,
            text: "💎 **JS Super Bot — Support Center** 💎\n\nNeed help with virtual numbers or OTPs? Contact Admin below:",
            reply_markup: { inline_keyboard: [[{ text: "Admin Contact", url: "https://t.me/Prime90999", style: "success" }]] }
          });
          return res.status(200).json({ ok: true });
        }

        // 9. Admin Panel Dashboard
        if (lowerText.includes('admin panel') || lowerText === '/admin') {
          if (isUserAdmin) {
            await sendAdminPanel(chatId);
          } else {
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: "⚠️ Access Denied!" });
          }
          return res.status(200).json({ ok: true });
        }

        // 6. Admin Panel Options & Commands
        if (isUserAdmin) {
          if (cleanText.includes('Back to Admin') || cleanText === '/admin') {
            await sendAdminPanel(chatId);
            return res.status(200).json({ ok: true });
          }

          // Service ON/OFF Toggle Handler
          const allServicesList = getServices(true);
          const matchedToggleSvc = (cleanText.includes('(🟢 ON)') || cleanText.includes('(🔴 OFF)') || cleanText.startsWith('TOGGLE_SVC:'))
            ? allServicesList.find(s => cleanText.toLowerCase().includes(s.name.toLowerCase()) || cleanText.toLowerCase().includes(s.id.toLowerCase()))
            : null;

          if (matchedToggleSvc) {
            const toggled = toggleService(matchedToggleSvc.id);
            if (toggled) {
              const statusStr = toggled.enabled !== false ? '🟢 ON' : '🔴 OFF';
              await sendToggleServicesMenu(chatId, `✅ Service ${toggled.icon || '📱'} **${toggled.name}** is now ${statusStr}!`);
            }
            return res.status(200).json({ ok: true });
          }

          // Country ON/OFF Toggle Handler
          const allCountriesList = getCountries(true);
          const matchedToggleCtry = (cleanText.includes('(🟢 ON)') || cleanText.includes('(🔴 OFF)') || cleanText.startsWith('TOGGLE_CTRY:'))
            ? allCountriesList.find(c => cleanText.toUpperCase().includes(c.code) || cleanText.toLowerCase().includes(c.name.toLowerCase()))
            : null;

          if (matchedToggleCtry) {
            const toggled = toggleCountry(matchedToggleCtry.code);
            if (toggled) {
              const statusStr = toggled.enabled !== false ? '🟢 ON' : '🔴 OFF';
              await sendToggleCountriesMenu(chatId, `✅ Country ${toggled.flag || '🌐'} **${toggled.name}** (\`${toggled.code}\`) is now ${statusStr}!`);
            }
            return res.status(200).json({ ok: true });
          }

          if (cleanText === 'Toggle Services' || lowerText === '/toggleservices') {
            await sendToggleServicesMenu(chatId);
            return res.status(200).json({ ok: true });
          }

          if (cleanText === 'Toggle Countries' || lowerText === '/togglecountries') {
            await sendToggleCountriesMenu(chatId);
            return res.status(200).json({ ok: true });
          }

          if (cleanText === 'Clear Services' || lowerText === '/clearservices') {
            clearAllServices();
            await sendAdminPanel(chatId);
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: "✅ **All services have been cleared!**\n\nUse *Add Service* to add your preferred services.", parse_mode: 'Markdown' });
            return res.status(200).json({ ok: true });
          }

          if (cleanText === 'Clear Countries' || lowerText === '/clearcountries') {
            clearAllCountries();
            await sendAdminPanel(chatId);
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: "✅ **All countries have been cleared!**\n\nUse *Add Country* to add your preferred countries.", parse_mode: 'Markdown' });
            return res.status(200).json({ ok: true });
          }

          // Interactive & Command Service Deletion
          if (cleanText === 'Delete Service' || lowerText === '/delservice' || lowerText === '/deleteservice') {
            await sendDeleteServicesMenu(chatId);
            return res.status(200).json({ ok: true });
          }

          if (cleanText.startsWith('🗑 Delete') && !cleanText.includes('Delete Country')) {
            const matchedDelSvc = allServicesList.find(s => cleanText.toLowerCase().includes(s.name.toLowerCase()) || cleanText.toLowerCase().includes(s.id.toLowerCase()));
            if (matchedDelSvc) {
              const deleted = deleteService(matchedDelSvc.id);
              await sendDeleteServicesMenu(chatId, `✅ Service ${deleted.icon || '📱'} **${deleted.name}** deleted successfully!`);
            } else {
              await sendDeleteServicesMenu(chatId, `⚠️ Service not found.`);
            }
            return res.status(200).json({ ok: true });
          }

          if (lowerText.startsWith('/delservice ') || lowerText.startsWith('/deleteservice ')) {
            const parts = cleanText.split(/\s+/);
            if (parts.length >= 2) {
              const deleted = deleteService(parts[1]);
              await sendAdminPanel(chatId);
              if (deleted) {
                await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `✅ Service ${deleted.icon || '📱'} **${deleted.name}** deleted successfully!`, parse_mode: 'Markdown' });
              } else {
                await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `⚠️ Service \`${parts[1]}\` not found.`, parse_mode: 'Markdown' });
              }
            }
            return res.status(200).json({ ok: true });
          }

          // Interactive & Command Country Deletion
          if (cleanText === 'Delete Country' || lowerText === '/delcountry' || lowerText === '/deletecountry') {
            await sendDeleteCountriesMenu(chatId);
            return res.status(200).json({ ok: true });
          }

          if (cleanText.startsWith('🗑 Delete') && cleanText.includes('(')) {
            const matchedDelCtry = allCountriesList.find(c => cleanText.toUpperCase().includes(c.code) || cleanText.toLowerCase().includes(c.name.toLowerCase()));
            if (matchedDelCtry) {
              const deleted = deleteCountry(matchedDelCtry.code);
              await sendDeleteCountriesMenu(chatId, `✅ Country ${deleted.flag || '🌐'} **${deleted.name}** (\`${deleted.code}\`) deleted successfully!`);
            } else {
              await sendDeleteCountriesMenu(chatId, `⚠️ Country not found.`);
            }
            return res.status(200).json({ ok: true });
          }

          if (lowerText.startsWith('/delcountry ') || lowerText.startsWith('/deletecountry ')) {
            const parts = cleanText.split(/\s+/);
            if (parts.length >= 2) {
              const deleted = deleteCountry(parts[1]);
              await sendAdminPanel(chatId);
              if (deleted) {
                await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `✅ Country ${deleted.flag || '🌐'} **${deleted.name}** (\`${deleted.code}\`) deleted successfully!`, parse_mode: 'Markdown' });
              } else {
                await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `⚠️ Country \`${parts[1]}\` not found.`, parse_mode: 'Markdown' });
              }
            }
            return res.status(200).json({ ok: true });
          }

          if (cleanText.includes('View Stocks') || cleanText.includes('Stock Breakdown') || cleanText.includes('Export Stock') || cleanText.includes('/viewstocks') || cleanText.includes('/exportstock')) {
            const report = getViewStocksReport();
            let msg = `📊 **BRO'S BOT STOCKS & USAGE OVERVIEW** 📊\n\n`;
            msg += `📦 **Global Overview:**\n`;
            msg += `• 🟢 Total Stock Available: \`${report.totalAvailableStock}\`\n`;
            msg += `• 📲 Total Issued / Used Numbers: \`${report.totalIssuedNumbers}\`\n`;
            msg += `• 🔐 Total Numbers OTP Received: \`${report.totalOtpsReceived}\`\n\n`;

            msg += `📋 **DETAILED STOCK & OTP BREAKDOWN:**\n\n`;
            if (report.breakdown.length === 0) {
              msg += `ℹ️ _No stock numbers or usage records found in database._\n`;
            } else {
              report.breakdown.forEach(item => {
                msg += `${item.serviceIcon} **${item.serviceName}** | ${item.countryFlag} **${item.countryName}** (\`${item.countryCode}\`)\n`;
                msg += `└ 📦 Stock: \`${item.stockCount}\` | 📲 Used: \`${item.issuedCount}\` | 🔐 OTPs Received: \`${item.otpCount}\`\n\n`;
              });
            }

            msg += `________________________________________\n`;
            msg += `💡 _Upload stock .txt files in Admin Panel to add more numbers!_`;

            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: msg, parse_mode: 'Markdown' });
            return res.status(200).json({ ok: true });
          }

          if (cleanText.includes('Add Stock')) {
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: "📥 **ADD STOCK (.txt)**\n\nPlease upload a `.txt` stock file, or attach caption: `<service> <country_code>`\n\nExample caption: `whatsapp US`" });
            return res.status(200).json({ ok: true });
          }

          if (cleanText.includes('Set Dispense Quantity') || cleanText.includes('Dispense Quantity') || lowerText === '/setquantity') {
            sessionState[chatId] = { step: 'WAITING_DISPENSE_USER_ID' };
            const promptKeyboard = {
              keyboard: [
                [{ text: "🌐 Global Default (All Users)", style: "primary" }],
                [{ text: "⬅️ Back to Admin Panel", style: "danger" }]
              ],
              resize_keyboard: true,
              is_persistent: true
            };
            await sendTelegramRequest('sendMessage', {
              chat_id: chatId,
              text: "🔢 **SET USER DISPENSE QUANTITY**\n\nPlease enter the **User ID** or **Username** (e.g. `@john` or `8929349073`):\n\n_Or tap `🌐 Global Default (All Users)` below to change quantity for everyone._",
              parse_mode: 'Markdown',
              reply_markup: promptKeyboard
            });
            return res.status(200).json({ ok: true });
          }

          if (cleanText.includes('Live Traffic Details')) {
            const t = getLiveTrafficAnalytics();
            let msg = `📊 **LIVE TRAFFIC ANALYTICS** 📊\n\n`;
            msg += `• Total OTPs Processed Today: \`${t.totalOtpsReceived}\`\n`;
            msg += `• Active Stock Available: \`${t.activeStockCount || 0}\`\n\n`;
            msg += `⚡ All SMS & OTP message forwarding is running 100% Live!`;
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: msg, parse_mode: 'Markdown' });
            return res.status(200).json({ ok: true });
          }

          if (cleanText.includes('ALL LIVE RANGES') || cleanText.includes('RADAR Services') || cleanText.includes('Radar') || cleanText.includes('Live Ranges')) {
            await sendTelegramRequest('sendMessage', {
              chat_id: chatId,
              text: "⚡ **Radar feature has been disabled for maximum speed & stability.**\n\nAll SMS & OTP message forwarding is active!",
              parse_mode: 'Markdown'
            });
            return res.status(200).json({ ok: true });
          }

          if (cleanText.includes('Broadcast')) {
            sessionState[chatId] = { step: 'WAITING_BROADCAST_MSG' };
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: "📢 **BROADCAST**\n\nPlease type your announcement message:" });
            return res.status(200).json({ ok: true });
          }

          if (cleanText.includes('Add Service')) {
            sessionState[chatId] = { step: 'WAITING_ADD_SERVICE' };
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: "➕ **ADD NEW SERVICE**\n\nPlease type Service Name:" });
            return res.status(200).json({ ok: true });
          }

          if (cleanText.includes('Add Country')) {
            sessionState[chatId] = { step: 'WAITING_ADD_COUNTRY' };
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: "➕ **ADD NEW COUNTRY**\n\nPlease type Country Name or Code:" });
            return res.status(200).json({ ok: true });
          }

          if (cleanText.includes('Ban User')) {
            sessionState[chatId] = { step: 'WAITING_BAN_USER' };
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: "🚫 **BAN USER**\n\nPlease reply with User ID:" });
            return res.status(200).json({ ok: true });
          }

          if (cleanText.includes('Unban User')) {
            sessionState[chatId] = { step: 'WAITING_UNBAN_USER' };
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: "✅ **UNBAN USER**\n\nPlease reply with User ID:" });
            return res.status(200).json({ ok: true });
          }

          if (cleanText.includes('User Info')) {
            const users = getAllUsers();
            let msg = `👤 **TOTAL REGISTERED USERS:** \`${users.length}\`\n\n`;
            users.slice(0, 10).forEach(u => { msg += `• User ID: \`${u}\` | Today OTP: ${getUserOtpCount(u)}\n`; });
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: msg, parse_mode: 'Markdown' });
            return res.status(200).json({ ok: true });
          }

          if (cleanText.includes('Maint:')) {
            const current = getMaintenance();
            const updated = setMaintenance(!current);
            await sendAdminPanel(chatId);
            await sendTelegramRequest('sendMessage', {
              chat_id: chatId,
              text: updated ? "🚧 **Bot is now in Maintenance Mode!**\nNon-admin users will see a maintenance message." : "🟢 **Maintenance Mode turned OFF.**\nBot is fully active for all users!",
              parse_mode: 'Markdown'
            });
            return res.status(200).json({ ok: true });
          }

          if (cleanText.includes('Test Group Post')) {
            const sampleCard = buildOTPFormattedCard('facebook', 'TZ', '+255710962660', '<#> 66473 ni msimbo wako wa Facebook H29Q+Fsn4Sr', '66473');
            await logToGroup(sampleCard);
            await sendAdminPanel(chatId);
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: "✅ Test OTP Card posted to Group!" });
            return res.status(200).json({ ok: true });
          }

          if (cleanText.includes('Clear Stock') || lowerText === '/clearstock') {
            sessionState[chatId] = { step: 'WAITING_CLEAR_STOCK_CONFIRM' };
            const confirmKeyboard = {
              keyboard: [
                [{ text: "⚠️ Yes, Clear All Stock" }, { text: "❌ Cancel & Keep Stock" }]
              ],
              resize_keyboard: true,
              is_persistent: true
            };
            await sendTelegramRequest('sendMessage', {
              chat_id: chatId,
              text: "⚠️ **CONFIRMATION REQUIRED** ⚠️\n\nAre you sure you want to clear **ALL phone numbers** from stock?\n\n_This action will wipe all available numbers from the database!_",
              parse_mode: 'Markdown',
              reply_markup: confirmKeyboard
            });
            return res.status(200).json({ ok: true });
          }
        }



        // 2FA Secret Key Interceptor (Matches screenshot 2FA Authenticator Output format)
        const lines2FA = cleanText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const valid2FA = [];
        for (const l of lines2FA) {
          const r = generate2FACode(l);
          if (r && r.code) valid2FA.push(r);
        }

        if (valid2FA.length > 0) {
          delete sessionState[chatId];
          let card2fa = `🔑 **2FA Authenticator Output**\n`;
          card2fa += `________________________________________\n\n`;
          valid2FA.forEach((item, idx) => {
            card2fa += `${idx + 1}. \`${item.secret}\` | \`${item.code}\`\n`;
          });

          const first2FA = valid2FA[0];
          const shortSecret = first2FA.secret.length > 12 ? first2FA.secret.substring(0, 12) : first2FA.secret;

          const inlineKeyboard = [
            [
              { text: `📋 ${first2FA.code}`, callback_data: `copy_${first2FA.code}`, copy_text: { text: first2FA.code }, style: "success" },
              { text: `🔑 ${shortSecret}`, callback_data: `copy_${first2FA.secret}`, copy_text: { text: first2FA.secret }, style: "primary" }
            ],
            [
              { text: "🔙 Back to Main Menu", callback_data: "back_to_main_menu", style: "primary" }
            ]
          ];

          await sendTelegramRequest('sendMessage', {
            chat_id: chatId,
            text: card2fa,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: inlineKeyboard }
          });
          return res.status(200).json({ ok: true });
        }

        // 8. Dynamic Service Matching (Only for non-admin command inputs)
        const isAdminKeyword = [
          'delete', 'clear', 'toggle', 'admin', 'maint:', 'broadcast',
          'ban', 'unban', 'user info', 'view stocks', 'stock breakdown',
          'export stock', 'add stock', 'test group post', 'back to admin'
        ].some(k => lowerText.includes(k));

        if (!isAdminKeyword) {
          const allSvcs = getServices(false);
          const cleanNoEmoji = cleanText.toLowerCase().replace(/^[^\w\s]/g, '').trim();
          let matchedSvc = allSvcs.find(s => 
            cleanText.toLowerCase() === s.name.toLowerCase() ||
            cleanText.toLowerCase() === s.id.toLowerCase() ||
            cleanText.toLowerCase().includes(s.name.toLowerCase()) ||
            s.name.toLowerCase().includes(cleanNoEmoji) ||
            cleanNoEmoji.includes(s.name.toLowerCase())
          );

          if (!matchedSvc) {
            if (cleanNoEmoji.includes('faceb') || cleanNoEmoji.includes('fb')) {
              matchedSvc = allSvcs.find(s => s.id === 'facebook' || s.name.toLowerCase().includes('faceb'));
            } else if (cleanNoEmoji.includes('what') || cleanNoEmoji.includes('wa')) {
              matchedSvc = allSvcs.find(s => s.id === 'whatsapp' || s.name.toLowerCase().includes('what'));
            } else if (cleanNoEmoji.includes('teleg') || cleanNoEmoji.includes('tg')) {
              matchedSvc = allSvcs.find(s => s.id === 'telegram' || s.name.toLowerCase().includes('teleg'));
            } else if (cleanNoEmoji.includes('insta') || cleanNoEmoji.includes('ig')) {
              matchedSvc = allSvcs.find(s => s.id === 'instagram' || s.name.toLowerCase().includes('insta'));
            }
          }

          if (matchedSvc) {
            sessionState[chatId] = { ...(sessionState[chatId] || {}), lastServiceId: matchedSvc.id };
            await sendCountrySelection(chatId, matchedSvc.id);
            return res.status(200).json({ ok: true });
          }

          // 9. Dynamic Country Matching (Dispenses 4 Numbers)
          const allCountries = getCountries(false);
          const words = cleanText.toUpperCase().split(/[^A-Z]/).filter(Boolean);
          const matchedCountry = !cleanText.startsWith('/') ? allCountries.find(c => 
            words.includes(c.code) || 
            cleanText.toUpperCase() === c.name.toUpperCase()
          ) : null;

          if (matchedCountry) {
            const svcId = sessionState[chatId]?.lastServiceId || 'whatsapp';
            await sendDispensed4Numbers(chatId, svcId, matchedCountry.code);
            return res.status(200).json({ ok: true });
          }
        }

        // 10. OTP Search by Number Input
        if (!cleanText.startsWith('/') && cleanText.replace(/\D/g, '').length >= 6) {
          const found = searchOTPByNumber(cleanText);
          if (found && found.data.fullMessage) {
            const card = buildOTPFormattedCard(found.data.serviceId, found.data.countryCode, found.number, found.data.fullMessage, found.data.otpCode);
            await sendTelegramRequest('sendMessage', { chat_id: chatId, ...card });
          } else {
            await sendMainMenu(chatId, `⚠️ **No OTP Received Yet!**\n\nNo active SMS found for \`${cleanText}\`. Please wait or search again.`);
          }
          return res.status(200).json({ ok: true });
        }

        // Default Main Menu Fallback
        await sendMainMenu(chatId);
        return res.status(200).json({ ok: true });
      }
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("Vercel Handler Error:", err);
    return res.status(200).json({ ok: false, error: err.message });
  }
};
