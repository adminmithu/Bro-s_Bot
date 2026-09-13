/**
 * Bro's Number Bot - Telegram Serverless Bot for Vercel
 * Ultra-Robust Architecture with Zero Fallback Kickouts & Live IVAS Radar
 */

const {
  getServices, getServiceIcon, toggleService, addService, deleteService, getCountries,
  addCountry, deleteCountry, addStock, buildStockAddedCard, getAllStockSummary, exportStock,
  get4Numbers, getStockCount, clearAllStock, getLiveTrafficAnalytics,
  searchOTPByNumber, processIncomingSMS, buildOTPFormattedCard, getUserOtpCount,
  getUserInfo, banUser, unbanUser, isUserBanned, setMaintenance,
  getMaintenance, registerUser, getAllUsers, recordLiveRange, getLiveRanges, getFlagEmoji
} = require('../lib/db.js');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8848165401:AAFiUELKvW-apfBB5xBdQc92yzKcqgViwa4";
const ADMIN_ID = process.env.ADMIN_ID ? String(process.env.ADMIN_ID).trim() : "8929349073";
const GROUP_ID = process.env.GROUP_ID ? String(process.env.GROUP_ID).trim() : '-1004296466829';

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

// Log message or card to Telegram Group (-1004296466829)
async function logToGroup(payload) {
  if (!GROUP_ID) return;
  try {
    if (typeof payload === 'string') {
      await sendTelegramRequest('sendMessage', { chat_id: GROUP_ID, text: payload, parse_mode: 'Markdown' });
    } else {
      await sendTelegramRequest('sendMessage', { chat_id: GROUP_ID, ...payload });
    }
  } catch (err) {
    console.error("Group Broadcast Error:", err);
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
async function sendMainMenu(chatId, text = "👋 **Welcome to Bro's Number Bot!**\n\nPlease select an option below:") {
  const keyboard = [
    [{ text: "GET NUMBER", style: "primary" }, { text: "My Profile", style: "primary" }],
    [{ text: "Search OTP", style: "success" }, { text: "Support", style: "primary" }],
    [{ text: "Admin Panel", style: "danger" }]
  ];
  return await sendTelegramRequest('sendMessage', {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    reply_markup: { keyboard, resize_keyboard: true, is_persistent: true }
  });
}

// Services Selection Keyboard
async function sendServiceSelection(chatId) {
  const services = getServices(false);
  if (services.length === 0) {
    return await sendMainMenu(chatId, "⚠️ **No active services available at the moment!**");
  }

  const keyboard = [];
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
    text: "📲 **Select a Social Media Service below:**",
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
      text: `⚠️ **OUT OF STOCK!**\n\nNo numbers currently available for ${service.icon || '📱'} **${service.name}** (${country.flag || '🌐'} ${country.name}).\n\nPlease wait for admin to add stock or select another country.`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
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
  const summary = getAllStockSummary();
  const isMaint = getMaintenance();
  const totalUsers = getAllUsers().length;
  const trafficData = getLiveTrafficAnalytics();

  let stockText = `⚙️ **BRO'S BOT ADMIN CONTROL PANEL** ⚙️\n\n`;
  stockText += `📊 **Bot Stats:** Users: \`${totalUsers}\` | Status: ${isMaint ? '🚧 **Maintenance Mode ON**' : '🟢 **Active**'} | Total OTPs: \`${trafficData.totalOtpsReceived}\`\n\n`;

  stockText += `🔥 **LIVE COUNTRY OTP TRAFFIC:**\n`;
  if (trafficData.items.length === 0) {
    stockText += `ℹ️ _No OTP traffic recorded yet._\n`;
  } else {
    trafficData.items.slice(0, 5).forEach(item => {
      stockText += `${item.serviceName} | **${item.countryName}** (${item.countryCode}): **${item.otpCount} OTPs**\n`;
    });
  }

  stockText += `\n📦 **CURRENT STOCK BREAKDOWN:**\n`;
  const inStockItems = summary.filter(s => s.count > 0);
  if (inStockItems.length === 0) {
    stockText += `⚠️ _No stock numbers currently available._\n`;
  } else {
    inStockItems.forEach(item => {
      stockText += `${item.service} | ${item.country} (${item.code}): **${item.count} in stock**\n`;
    });
  }

  stockText += `\n👇 **Use the Admin Reply Keyboard below to manage your bot:**`;

  const keyboard = [
    [{ text: "Add Stock (.txt)", style: "success" }, { text: "Stock Breakdown", style: "primary" }],
    [{ text: "Live Traffic Details", style: "primary" }, { text: "Broadcast", style: "success" }],
    [{ text: "Add Service", style: "success" }, { text: "Delete Service", style: "danger" }],
    [{ text: "Toggle Services", style: "primary" }, { text: "Add Country", style: "success" }],
    [{ text: "Delete Country", style: "danger" }, { text: "Ban User", style: "danger" }],
    [{ text: "Unban User", style: "success" }, { text: "User Info", style: "primary" }],
    [{ text: "Export Stock", style: "primary" }, { text: "Test Group Post", style: "success" }],
    [{ text: `Maint: ${isMaint ? 'ON' : 'OFF'}`, style: "danger" }, { text: "Clear Stock", style: "danger" }],
    [{ text: "Main Menu", style: "primary" }]
  ];

  return await sendTelegramRequest('sendMessage', {
    chat_id: chatId,
    text: stockText,
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

    // 1. IVAS Link 2 Live Range Stream Webhook Endpoint (Disabled for maximum speed & stability)
    if (query.range || query.radar) {
      return res.status(200).json({ ok: true, status: "Radar endpoint disabled for performance" });
    }

    // 2. IVAS Link 1 SMS Webhook Endpoint
    if (query.sms || query.number) {
      const number = query.number;
      const message = query.message || query.text || '';
      if (number) {
        const processed = processIncomingSMS(number, message);
        const card = buildOTPFormattedCard(
          processed.record.serviceId,
          processed.record.countryCode,
          processed.number,
          processed.record.fullMessage,
          processed.record.otpCode
        );

        await logToGroup(card);
        if (processed.record.userId) {
          await sendTelegramRequest('sendMessage', { chat_id: processed.record.userId, ...card });
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
          await sendTelegramRequest('answerCallbackQuery', { callback_query_id: cbQuery.id, text: "Text copied to clipboard." });
          return res.status(200).json({ ok: true });
        }

        await sendTelegramRequest('answerCallbackQuery', { callback_query_id: cbQuery.id });

        if (data === 'back_to_main_menu') {
          await sendMainMenu(chatId, "👋 **Welcome back to Main Menu!**");
        } else if (data === 'cmd_search_otp') {
          await sendTelegramRequest('sendMessage', { chat_id: chatId, text: "🔎 **SEARCH OTP BY PHONE NUMBER**\n\nPlease reply with your **Phone Number**:\n\nExample: `+255710962660`", parse_mode: 'Markdown' });
        } else if (data === 'back_to_services') {
          await sendServiceSelection(chatId);
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
        const isUserAdmin = !ADMIN_ID || String(chatId).trim() === String(ADMIN_ID).trim() || String(chatId) === '8929349073';

        if (isGroup) return res.status(200).json({ ok: true });

        registerUser(chatId);

        // Global Navigation
        if (text === '/start' || text === '🏠 Main Menu' || text === 'Main Menu') {
          delete sessionState[chatId];
          await sendMainMenu(chatId);
          return res.status(200).json({ ok: true });
        }

        // Admin Interactive State Machine (.txt Upload / Add Service / Add Country / Broadcast)
        if (isUserAdmin && sessionState[chatId]?.step) {
          const state = sessionState[chatId];

          if (text === '🏠 Main Menu' || text === 'Main Menu' || text === '/start') {
            delete sessionState[chatId];
            await sendMainMenu(chatId);
            return res.status(200).json({ ok: true });
          }

          if (state.step === 'WAITING_SERVICE') {
            const matched = getServices(true).find(s => text.toLowerCase().includes(s.name.toLowerCase())) || { id: text.toLowerCase().replace(/[^a-z]/g, ''), name: text, icon: '📱' };
            state.serviceId = matched.id;
            state.step = 'WAITING_COUNTRY';
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `📌 **Service Set:** ${matched.name}\n\nNow select or type Country Code (e.g. \`US\`, \`BD\`, \`UK\`):` });
            return res.status(200).json({ ok: true });
          }

          if (state.step === 'WAITING_COUNTRY') {
            const countryObj = addCountry(text);
            const result = addStock(state.serviceId, countryObj.code, state.numbers);
            delete sessionState[chatId];

            await logToGroup(buildStockAddedCard(countryObj.name, countryObj.code, result.addedCount, state.numbers));

            await sendAdminPanel(chatId);
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `✅ **Stock Uploaded & Broadcasted!** Added ${result.addedCount} numbers for ${state.serviceId.toUpperCase()} (${countryObj.name}).`, parse_mode: 'Markdown' });
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
              const result = addStock(serviceId, countryCode, numberLines);

              await logToGroup(buildStockAddedCard(countryCode, countryCode, result.addedCount, numberLines));

              await sendAdminPanel(chatId);
              await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `✅ **Stock Uploaded & Broadcasted!** Added ${result.addedCount} numbers for ${serviceId.toUpperCase()} (${countryCode}).`, parse_mode: 'Markdown' });
            } else {
              sessionState[chatId] = { step: 'WAITING_SERVICE', numbers: numberLines };
              await sendServiceSelection(chatId);
            }
          } catch (err) {
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `❌ **Upload Error:** ${err.message}` });
          }
          return res.status(200).json({ ok: true });
        }

        // ---------------------------------------------------------
        // EXACT BUTTON MATCHERS (PREVENT UNWANTED MAIN MENU KICKOUTS)
        // ---------------------------------------------------------

        // 1. Get Number & Services Router
        if (cleanText === 'Get Number' || cleanText === '📲 Get Number' || cleanText.includes('Get Number') || cleanText === '⬅️ Back to Services' || cleanText === '/getnumber') {
          await sendServiceSelection(chatId);
          return res.status(200).json({ ok: true });
        }

        // 2. Support
        if (cleanText === 'Support' || cleanText === '📞 Support' || cleanText.includes('Support') || cleanText === '/support') {
          await sendTelegramRequest('sendMessage', {
            chat_id: chatId,
            text: "💎 **Bro's Number Bot — Support Center** 💎\n\nNeed help with virtual numbers or OTPs? Contact Admin below:",
            reply_markup: { inline_keyboard: [[{ text: "Admin Contact", url: "https://t.me/Prime90999", style: "success" }]] }
          });
          return res.status(200).json({ ok: true });
        }

        // 3. User Profile
        if (cleanText === 'My Profile' || cleanText === '👤 My Profile' || cleanText.includes('Profile') || cleanText === '/profile') {
          const todayOtp = getUserOtpCount(chatId);
          await sendTelegramRequest('sendMessage', {
            chat_id: chatId,
            text: `👤 **USER PROFILE**\n\n🆔 User ID: \`${chatId}\`\n📱 Today OTP Received: \`${todayOtp}\`\n\n💡 _Tap GET NUMBER to request virtual numbers!_`,
            parse_mode: 'Markdown'
          });
          return res.status(200).json({ ok: true });
        }

        // 4. Search OTP Prompt
        if (cleanText === 'Search OTP' || cleanText === '🔎 Search OTP' || cleanText.includes('Search OTP') || cleanText === '/searchotp') {
          await sendTelegramRequest('sendMessage', {
            chat_id: chatId,
            text: "🔎 **SEARCH OTP BY PHONE NUMBER**\n\nPlease reply with your **Phone Number** below:\n\nExample: `+255710962660`",
            parse_mode: 'Markdown'
          });
          return res.status(200).json({ ok: true });
        }

        // 5. Admin Panel Dashboard
        if (cleanText === 'Admin Panel' || cleanText === '⚙️ Admin Panel' || cleanText === '/admin') {
          if (isUserAdmin) {
            await sendAdminPanel(chatId);
          } else {
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: "⚠️ Access Denied!" });
          }
          return res.status(200).json({ ok: true });
        }

        // 6. Admin Panel Options
        if (isUserAdmin) {
          if (cleanText.includes('Stock Breakdown')) {
            const summary = getAllStockSummary();
            let msg = `📦 **CURRENT BOT STOCK BREAKDOWN**\n\n`;
            summary.filter(s => s.count > 0).forEach(s => { msg += `${s.serviceIcon} ${s.service} | ${s.flag} ${s.country}: **${s.count} in stock**\n`; });
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: msg || "⚠️ No stock available." });
            return res.status(200).json({ ok: true });
          }

          if (cleanText.includes('Add Stock')) {
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: "📥 **ADD STOCK (.txt)**\n\nPlease upload a `.txt` stock file, or attach caption: `<service> <country_code>`\n\nExample caption: `whatsapp US`" });
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

          if (cleanText.includes('Delete Service')) {
            const svcs = getServices(true);
            let msg = "❌ **DELETE SERVICE**\n\nSend command: `/delservice <service_id>`\nAvailable: " + svcs.map(s => s.id).join(', ');
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: msg });
            return res.status(200).json({ ok: true });
          }

          if (cleanText.includes('Toggle Services')) {
            const svcs = getServices(true);
            let msg = "🔄 **TOGGLE SERVICES**\n\n" + svcs.map(s => `${s.icon} ${s.name}: ${s.enabled ? '🟢 ON' : '🔴 OFF'}`).join('\n');
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: msg });
            return res.status(200).json({ ok: true });
          }

          if (cleanText.includes('Add Country')) {
            sessionState[chatId] = { step: 'WAITING_ADD_COUNTRY' };
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: "➕ **ADD NEW COUNTRY**\n\nPlease type Country Name or Code:" });
            return res.status(200).json({ ok: true });
          }

          if (cleanText.includes('Delete Country')) {
            const cList = getCountries();
            let msg = "❌ **DELETE COUNTRY**\n\nSend command: `/delcountry <code/name>`\nAvailable: " + cList.map(c => c.code).join(', ');
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: msg });
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

          if (cleanText.includes('Export Stock')) {
            const exp = exportStock();
            let msg = `📥 **EXPORTED STOCK SUMMARY**\n\nTotal Lines: \`${exp.totalLines}\`\n\n`;
            exp.items.forEach(i => { msg += `${i.service} | ${i.country}: ${i.count} numbers\n`; });
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: msg, parse_mode: 'Markdown' });
            return res.status(200).json({ ok: true });
          }

          if (cleanText.includes('Maint:')) {
            const current = getMaintenance();
            setMaintenance(!current);
            await sendAdminPanel(chatId);
            return res.status(200).json({ ok: true });
          }

          if (cleanText.includes('Test Group Post')) {
            const sampleCard = buildOTPFormattedCard('facebook', 'TZ', '+255710962660', '<#> 66473 ni msimbo wako wa Facebook H29Q+Fsn4Sr', '66473');
            await logToGroup(sampleCard);
            await sendAdminPanel(chatId);
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: "✅ Test OTP Card posted to Group!" });
            return res.status(200).json({ ok: true });
          }

          if (cleanText.includes('Clear Stock')) {
            clearAllStock();
            await sendAdminPanel(chatId);
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: "✅ All stock cleared successfully!" });
            return res.status(200).json({ ok: true });
          }
        }

        // 7. Check IVAS Live Range Button Clicks (Radar Detector)
        const allRanges = getLiveRanges();
        const matchedRange = allRanges.find(r => cleanText.includes(r.rangeName) || r.rangeName.includes(cleanText.replace(/^[^\w\s]/g, '').trim()));
        if (matchedRange) {
          let msg = `📌 **LIVE IVAS RADAR DETAILS: ${matchedRange.flag} ${matchedRange.rangeName}**\n\n`;
          msg += `🌍 Country: ${matchedRange.flag} **${matchedRange.country}**\n`;
          msg += `📱 Live Test Number: \`${matchedRange.phoneNumber}\`\n`;
          msg += `📘 Service: **${matchedRange.sid}**\n`;
          msg += `🕒 Last Activity: \`${matchedRange.time}\`\n\n`;
          msg += `💡 **Action:** To dispense 4 numbers for this range, click **Get Number** or select country!`;
          await sendTelegramRequest('sendMessage', { chat_id: chatId, text: msg, parse_mode: 'Markdown' });
          return res.status(200).json({ ok: true });
        }

        // 8. Dynamic Service Matching
        const allSvcs = getServices(true);
        const matchedSvc = allSvcs.find(s => 
          cleanText.toLowerCase() === s.name.toLowerCase() ||
          cleanText.toLowerCase() === s.id.toLowerCase() ||
          cleanText.toLowerCase().includes(s.name.toLowerCase()) ||
          s.name.toLowerCase().includes(cleanText.toLowerCase().replace(/^[^\w\s]/g, '').trim())
        );

        if (matchedSvc) {
          sessionState[chatId] = { ...(sessionState[chatId] || {}), lastServiceId: matchedSvc.id };
          await sendCountrySelection(chatId, matchedSvc.id);
          return res.status(200).json({ ok: true });
        }

        // 9. Dynamic Country Matching (Dispenses 4 Numbers)
        const allCountries = getCountries();
        const matchedCountry = allCountries.find(c => 
          cleanText.toUpperCase().includes(c.code) || 
          cleanText.toUpperCase().includes(c.name)
        );

        if (matchedCountry) {
          const svcId = sessionState[chatId]?.lastServiceId || 'whatsapp';
          await sendDispensed4Numbers(chatId, svcId, matchedCountry.code);
          return res.status(200).json({ ok: true });
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
