/**
 * Bro's Number Bot - Telegram Serverless Bot for Vercel
 * Ultra-Clean, High Performance Architecture
 */

const {
  getServices, getServiceIcon, toggleService, addService, deleteService, getCountries,
  addCountry, deleteCountry, addStock, getAllStockSummary, exportStock,
  get4Numbers, getStockCount, clearAllStock, getLiveTrafficAnalytics,
  searchOTPByNumber, processIncomingSMS, buildOTPFormattedCard, getUserOtpCount,
  getUserInfo, banUser, unbanUser, isUserBanned, setMaintenance,
  getMaintenance, registerUser, getAllUsers, recordLiveRange, getLiveRanges, getFlagEmoji
} = require('../lib/db.js');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8848165401:AAFiUELKvW-apfBB5xBdQc92yzKcqgViwa4";
const ADMIN_ID = process.env.ADMIN_ID ? String(process.env.ADMIN_ID).trim() : "8929349073";
const GROUP_ID = process.env.GROUP_ID ? String(process.env.GROUP_ID).trim() : '-1004296466829';

// Admin Interactive State Machine
const adminState = {};

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

// Main Menu Keyboard with Clean Text Labels
async function sendMainMenu(chatId, text = "👋 **Welcome to Bro's Number Bot!**\n\nPlease select an option below:") {
  const keyboard = [
    [{ text: "Get Number" }, { text: "Search OTP" }],
    [{ text: "Support" }, { text: "My Profile" }],
    [{ text: "Admin Panel" }]
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
    const row = [{ text: `${services[i].icon} ${services[i].name}` }];
    if (services[i + 1]) {
      row.push({ text: `${services[i + 1].icon} ${services[i + 1].name}` });
    }
    keyboard.push(row);
  }
  keyboard.push([{ text: "🏠 Main Menu" }]);

  return await sendTelegramRequest('sendMessage', {
    chat_id: chatId,
    text: "📲 **Select a Social Media Service below:**",
    parse_mode: 'Markdown',
    reply_markup: { keyboard, resize_keyboard: true, is_persistent: true }
  });
}

// Country Selection Keyboard
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
    const row = [{ text: `${c1.flag} ${c1.name.toUpperCase()} (${stock1})` }];

    if (countries[i + 1]) {
      const c2 = countries[i + 1];
      const stock2 = getStockCount(serviceId, c2.code);
      row.push({ text: `${c2.flag} ${c2.name.toUpperCase()} (${stock2})` });
    }
    keyboard.push(row);
  }

  keyboard.push([{ text: "⬅️ Back to Services" }, { text: "🏠 Main Menu" }]);

  return await sendTelegramRequest('sendMessage', {
    chat_id: chatId,
    text: `🌏 **Select Country for ${service.icon} ${service.name.toUpperCase()}:**\n\n_Note: Dispenses 4 numbers instantly!_`,
    parse_mode: 'Markdown',
    reply_markup: { keyboard, resize_keyboard: true, is_persistent: true }
  });
}

// Dispense 4 Numbers
async function sendDispensed4Numbers(chatId, serviceId, countryCode) {
  const result = get4Numbers(serviceId, countryCode, chatId);
  const country = getCountries().find(c => c.code === countryCode) || { flag: '🌐', name: countryCode };
  const service = getServices(true).find(s => s.id === serviceId) || { icon: '📱', name: serviceId };

  let text = `==============================\n`;
  text += `✨ **4 NUMBERS DISPENSED** ✨\n`;
  text += `==============================\n\n`;
  text += `📌 **Service:** ${service.icon} ${service.name}\n`;
  text += `🌐 **Country:** ${country.flag} ${country.name}\n\n`;
  text += `📱 **Assigned Phone Numbers:**\n`;
  result.numbers.forEach((num, idx) => {
    text += `${idx + 1}️⃣ \`${num}\`\n`;
  });
  text += `\n💡 **Tip:** Tap any number to copy. Search OTP after sending SMS!`;

  const inlineKeyboard = [
    ...result.numbers.map(num => [{ text: `📋 Copy ${num}`, callback_data: `copy_${num}`, copy_text: { text: num } }]),
    [{ text: "🔎 Search OTP", callback_data: "cmd_search_otp" }, { text: "🏠 Main Menu", callback_data: "back_to_main_menu" }]
  ];

  return await sendTelegramRequest('sendMessage', {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: inlineKeyboard }
  });
}

// Admin Panel Keyboard Dashboard
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
      stockText += `${item.serviceIcon} ${item.serviceName} | ${item.countryFlag} **${item.countryName}** (${item.countryCode}): **${item.otpCount} OTPs**\n`;
    });
  }

  stockText += `\n📦 **CURRENT STOCK BREAKDOWN:**\n`;
  const inStockItems = summary.filter(s => s.count > 0);
  if (inStockItems.length === 0) {
    stockText += `⚠️ _No stock numbers currently available._\n`;
  } else {
    inStockItems.forEach(item => {
      stockText += `${item.serviceIcon} ${item.service} | ${item.flag} ${item.country} (${item.code}): **${item.count} in stock**\n`;
    });
  }

  stockText += `\n👇 **Use the Admin Reply Keyboard below to manage your bot:**`;

  const keyboard = [
    [{ text: "📥 Add Stock (.txt)" }, { text: "📦 Stock Breakdown" }],
    [{ text: "📈 Live Traffic Details" }, { text: "📢 Broadcast" }],
    [{ text: "➕ Add Service" }, { text: "❌ Delete Service" }],
    [{ text: "🔄 Toggle Services" }, { text: "➕ Add Country" }],
    [{ text: "🚫 Ban User" }, { text: "✅ Unban User" }],
    [{ text: "👤 User Info" }, { text: "📥 Export Stock" }],
    [{ text: "🧪 Test Group Post" }, { text: `🛠 Maint: ${isMaint ? 'ON 🚧' : 'OFF 🟢'}` }],
    [{ text: "🗑 Clear Stock" }, { text: "🏠 Main Menu" }]
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

    // 1. IVAS Link 2 Live Range Endpoint
    if (query.range || query.radar) {
      const rangeName = query.rangeName || query.country || 'CAMBODIA 7290';
      const phone = query.phone || query.number || '855319678578';
      const sid = query.sid || query.service || 'FACEBOOK';
      const message = query.message || query.text || '';
      recordLiveRange(rangeName, phone, sid, message);
      return res.status(200).json({ ok: true, status: "Live Range recorded" });
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
      if (typeof update === 'string') {
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
          await sendMainMenu(chatId, "🔎 **Search OTP**\n\nPlease reply with your **Phone Number**:\n\nExample: `+255710962660`");
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
        const isUserAdmin = !ADMIN_ID || String(chatId) === ADMIN_ID;

        if (isGroup) return res.status(200).json({ ok: true });

        registerUser(chatId);

        // Global Navigation
        if (text === '/start' || text === '🏠 Main Menu' || text === 'Main Menu') {
          delete adminState[chatId];
          await sendMainMenu(chatId);
          return res.status(200).json({ ok: true });
        }

        // Admin Interactive State Machine (.txt Upload / Add Service / Add Country / Broadcast)
        if (isUserAdmin && adminState[chatId]?.step) {
          const state = adminState[chatId];

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
            delete adminState[chatId];

            await sendAdminPanel(chatId);
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `✅ **Stock Uploaded!** Added ${result.addedCount} numbers for ${state.serviceId.toUpperCase()} (${countryObj.name}).`, parse_mode: 'Markdown' });
            return res.status(200).json({ ok: true });
          }

          if (state.step === 'WAITING_ADD_SERVICE') {
            delete adminState[chatId];
            const added = addService(text.toLowerCase().replace(/\s+/g, ''), text, getServiceIcon(text));
            await sendAdminPanel(chatId);
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `✅ Service ${added.icon} **${added.name}** added!` });
            return res.status(200).json({ ok: true });
          }

          if (state.step === 'WAITING_ADD_COUNTRY') {
            delete adminState[chatId];
            const countryObj = addCountry(text);
            await sendAdminPanel(chatId);
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `✅ Country ${countryObj.flag} **${countryObj.name}** (\`${countryObj.code}\`) added!` });
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
              const flag = getFlagEmoji(countryCode);

              await sendAdminPanel(chatId);
              await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `✅ **Stock Uploaded!** Added ${result.addedCount} numbers for ${serviceId.toUpperCase()} (${countryCode}).`, parse_mode: 'Markdown' });
            } else {
              adminState[chatId] = { step: 'WAITING_SERVICE', numbers: numberLines };
              await sendServiceSelection(chatId);
            }
          } catch (err) {
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `❌ **Upload Error:** ${err.message}` });
          }
          return res.status(200).json({ ok: true });
        }

        // User Buttons Routing
        if (text === 'Get Number' || text === '📲 Get Number' || text.includes('Get Number') || text === '⬅️ Back to Services') {
          await sendServiceSelection(chatId);
        } else if (text === 'Support' || text === '📞 Support' || text.includes('Support')) {
          await sendTelegramRequest('sendMessage', {
            chat_id: chatId,
            text: "💎 **Bro's Number Bot — Support Center** 💎\n\nContact Admin:",
            reply_markup: { inline_keyboard: [[{ text: "👨‍💻 Admin Contact", url: "https://t.me/Prime90999" }]] }
          });
        } else if (text === 'My Profile' || text === '👤 My Profile' || text.includes('Profile')) {
          const todayOtp = getUserOtpCount(chatId);
          await sendMainMenu(chatId, `👤 **USER PROFILE**\n\n🆔 User ID: \`${chatId}\`\n📱 Today OTP: ${todayOtp}`);
        } else if (text === 'Search OTP' || text === '🔎 Search OTP' || text.includes('Search OTP')) {
          await sendMainMenu(chatId, "🔎 **Search OTP**\n\nPlease reply with your **Phone Number** (e.g. `+255710962660`):");
        } else if (text === 'Admin Panel' || text === '⚙️ Admin Panel' || text.includes('Admin')) {
          if (isUserAdmin) {
            await sendAdminPanel(chatId);
          } else {
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: "⚠️ Access Denied!" });
          }
        } else if (text === '📦 Stock Breakdown' && isUserAdmin) {
          const summary = getAllStockSummary();
          let msg = `📦 **CURRENT BOT STOCK BREAKDOWN**\n\n`;
          summary.filter(s => s.count > 0).forEach(s => { msg += `${s.serviceIcon} ${s.service} | ${s.flag} ${s.country}: **${s.count} in stock**\n`; });
          await sendTelegramRequest('sendMessage', { chat_id: chatId, text: msg || "⚠️ No stock available." });
        } else if (text === '➕ Add Service' && isUserAdmin) {
          adminState[chatId] = { step: 'WAITING_ADD_SERVICE' };
          await sendTelegramRequest('sendMessage', { chat_id: chatId, text: "➕ **ADD NEW SERVICE**\n\nPlease type the Service Name:" });
        } else if (text === '➕ Add Country' && isUserAdmin) {
          adminState[chatId] = { step: 'WAITING_ADD_COUNTRY' };
          await sendTelegramRequest('sendMessage', { chat_id: chatId, text: "➕ **ADD NEW COUNTRY**\n\nPlease type Country Name or Code:" });
        } else if (text === '🧪 Test Group Post' && isUserAdmin) {
          const sampleCard = buildOTPFormattedCard('facebook', 'TZ', '+255710962660', '<#> 66473 ni msimbo wako wa Facebook H29Q+Fsn4Sr', '66473');
          await logToGroup(sampleCard);
          await sendAdminPanel(chatId);
          await sendTelegramRequest('sendMessage', { chat_id: chatId, text: "✅ Test Group Post Sent!" });
        } else {
          // Check matching Services / Countries
          const matchedSvc = getServices(true).find(s => text.toLowerCase().includes(s.name.toLowerCase()));
          const matchedCountry = getCountries().find(c => text.toUpperCase().includes(c.code) || text.toUpperCase().includes(c.name));

          if (matchedCountry) {
            const svcId = adminState[chatId]?.lastServiceId || 'whatsapp';
            await sendDispensed4Numbers(chatId, svcId, matchedCountry.code);
          } else if (matchedSvc) {
            adminState[chatId] = { ...(adminState[chatId] || {}), lastServiceId: matchedSvc.id };
            await sendCountrySelection(chatId, matchedSvc.id);
          } else {
            // Search OTP by input number
            const found = searchOTPByNumber(text);
            if (found && found.data.fullMessage) {
              const card = buildOTPFormattedCard(found.data.serviceId, found.data.countryCode, found.number, found.data.fullMessage, found.data.otpCode);
              await sendTelegramRequest('sendMessage', { chat_id: chatId, ...card });
            } else {
              await sendMainMenu(chatId);
            }
          }
        }

        return res.status(200).json({ ok: true });
      }
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("Vercel Handler Error:", err);
    return res.status(200).json({ ok: false, error: err.message });
  }
};
