/**
 * Bro's Number Bot - Telegram Serverless Bot for Vercel
 * Features:
 * - IVAS SMS Webhook Integration & Live Group Broadcast (-5477236175)
 * - Image 2 Premium OTP Card Layout with Copy OTP & Get Number Inline Buttons
 * - Dynamic Countries & 4-Number Dispenser
 * - Full Admin Control Suite
 */

const {
  getServices, getServiceIcon, toggleService, addService, getCountries,
  addCountry, deleteCountry, addStock, getAllStockSummary, exportStock,
  get4Numbers, getStockCount, clearStock, clearAllStock, getLiveTrafficAnalytics,
  searchOTPByNumber, processIncomingSMS, buildOTPFormattedCard, getUserOtpCount,
  getUserInfo, banUser, unbanUser, isUserBanned, setMaintenance,
  getMaintenance, registerUser, getAllUsers, recordLiveRange, getLiveRanges
} = require('../lib/db.js');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8848165401:AAFiUELKvW-apfBB5xBdQc92yzKcqgViwa4";
const ADMIN_ID = process.env.ADMIN_ID ? String(process.env.ADMIN_ID).trim() : "8929349073";
const GROUP_ID = process.env.GROUP_ID ? String(process.env.GROUP_ID).trim() : '-1004296466829';

// Interactive Admin Stock Upload State Machine
const adminState = {};

// Helper to interact with Telegram API
async function sendTelegramRequest(method, payload) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return await response.json();
}

// Send formatted message or OTP Card to Group
async function logToGroup(payload) {
  if (!GROUP_ID) return;
  try {
    if (typeof payload === 'string') {
      await sendTelegramRequest('sendMessage', {
        chat_id: GROUP_ID,
        text: payload,
        parse_mode: 'Markdown'
      });
    } else {
      await sendTelegramRequest('sendMessage', {
        chat_id: GROUP_ID,
        ...payload
      });
    }
  } catch (err) {
    console.error("Group Log Error:", err);
  }
}

// Download file content from Telegram API
async function getTelegramFileContent(fileId) {
  const fileRes = await sendTelegramRequest('getFile', { file_id: fileId });
  if (!fileRes.ok || !fileRes.result.file_path) {
    throw new Error('Failed to get file path from Telegram');
  }
  const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileRes.result.file_path}`;
  const response = await fetch(fileUrl);
  return await response.text();
}

// Main Menu Keyboard with Colored Buttons
async function sendMainMenu(chatId, text = "👋 **Welcome to Bro's Number Bot!**\n\nPlease select an option below:") {
  const replyMarkup = {
    keyboard: [
      [
        {
          text: "📲 Get Number",
          style: "success"       // Green Button
        },
        {
          text: "🔎 Search OTP",
          style: "primary"       // Blue Button
        }
      ],
      [
        {
          text: "📞 Support",
          style: "danger"        // Red Button
        },
        {
          text: "👤 My Profile",
          style: "primary"       // Blue Button
        }
      ],
      [
        {
          text: "⚙️ Admin Panel",
          style: "primary"
        }
      ]
    ],
    resize_keyboard: true,
    is_persistent: true
  };

  return await sendTelegramRequest('sendMessage', {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    reply_markup: replyMarkup
  });
}

// Show Service Selection Reply Keyboard Buttons
async function sendServiceSelection(chatId) {
  const services = getServices(false);
  if (services.length === 0) {
    return await sendMainMenu(chatId, "⚠️ **No active services available at the moment!**");
  }

  const keyboard = [];
  for (let i = 0; i < services.length; i += 2) {
    const row = [];
    const s1 = services[i];
    const icon1 = s1.icon || getServiceIcon(s1.name);
    row.push({ text: `${icon1} ${s1.name}`, style: "primary" });

    if (services[i + 1]) {
      const s2 = services[i + 1];
      const icon2 = s2.icon || getServiceIcon(s2.name);
      row.push({ text: `${icon2} ${s2.name}`, style: "primary" });
    }
    keyboard.push(row);
  }
  keyboard.push([{ text: "🏠 Main Menu", style: "danger" }]);

  return await sendTelegramRequest('sendMessage', {
    chat_id: chatId,
    text: "📲 **Select a Social Media Service below:**",
    parse_mode: 'Markdown',
    reply_markup: { keyboard: keyboard, resize_keyboard: true, is_persistent: true }
  });
}

// Show Country Selection Reply Keyboard Buttons for a selected service
async function sendCountrySelection(chatId, serviceId) {
  const services = getServices(true);
  const service = services.find(s => s.id === serviceId) || { name: serviceId, icon: '📱' };
  const countries = getCountries();

  if (countries.length === 0) {
    return await sendMainMenu(chatId, `⚠️ **No Countries Available Yet!**`);
  }

  const keyboard = [];
  for (let i = 0; i < countries.length; i += 2) {
    const row = [];
    const c1 = countries[i];
    const stock1 = getStockCount(serviceId, c1.code);
    row.push({ text: `${c1.flag} ${c1.name.toUpperCase()} (${stock1})`, style: "primary" });

    if (countries[i + 1]) {
      const c2 = countries[i + 1];
      const stock2 = getStockCount(serviceId, c2.code);
      row.push({ text: `${c2.flag} ${c2.name.toUpperCase()} (${stock2})`, style: "primary" });
    }
    keyboard.push(row);
  }

  keyboard.push([
    { text: "⬅️ Back to Services", style: "primary" },
    { text: "🏠 Main Menu", style: "danger" }
  ]);

  return await sendTelegramRequest('sendMessage', {
    chat_id: chatId,
    text: `🌏 **Select Country for ${service.icon} ${service.name.toUpperCase()}:**\n\n_Note: Dispenses 4 numbers instantly!_`,
    parse_mode: 'Markdown',
    reply_markup: { keyboard: keyboard, resize_keyboard: true, is_persistent: true }
  });
}

// Render Live Range Detector with 100% Reply Keyboard buttons
async function sendLiveTrafficWithRangeKeyboard(chatId) {
  const liveRanges = getLiveRanges();
  const t = getLiveTrafficAnalytics();

  let msg = `📈 **LIVE REAL-TIME LINK 2 RANGE DETECTOR** 📈\n\n`;
  msg += `Total OTPs Processed Today: \`${t.totalOtpsReceived}\`\n\n`;
  msg += `🔥 **Active Range Names from IVAS Link 2 (Real-Time Stream):**\n\n`;

  liveRanges.slice(0, 8).forEach(r => {
    msg += `${r.flag} **${r.rangeName}**\n`;
    msg += `└ 📱 \`${r.phoneNumber}\` | 📘 **${r.sid}** | 🕒 \`${r.time}\`\n\n`;
  });

  msg += `\n👇 **Select any Live Range Name from the Reply Keyboard below to view details:**`;

  const keyboard = [];
  for (let i = 0; i < liveRanges.length && i < 8; i += 2) {
    const row = [];
    const r1 = liveRanges[i];
    row.push({ text: `${r1.flag} ${r1.rangeName}`, style: "primary" });

    if (liveRanges[i + 1]) {
      const r2 = liveRanges[i + 1];
      row.push({ text: `${r2.flag} ${r2.rangeName}`, style: "primary" });
    }
    keyboard.push(row);
  }

  keyboard.push([
    { text: "⚙️ Admin Panel", style: "primary" },
    { text: "🏠 Main Menu", style: "danger" }
  ]);

  return await sendTelegramRequest('sendMessage', {
    chat_id: chatId,
    text: msg,
    parse_mode: 'Markdown',
    reply_markup: { keyboard: keyboard, resize_keyboard: true, is_persistent: true }
  });
}

// Admin Panel Dashboard (Supports Send or Edit Message)
async function sendAdminPanel(chatId, messageId = null) {
  const summary = getAllStockSummary();
  const allSvcs = getServices(true);
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
      stockText += `${item.serviceIcon} ${item.serviceName} | ${item.countryFlag} **${item.countryName}** (${item.countryCode}): **${item.otpCount} OTPs received**\n`;
    });
  }

  stockText += `\n📦 **CURRENT STOCK BREAKDOWN:**\n`;
  const inStockItems = summary.filter(s => s.count > 0);
  if (inStockItems.length === 0) {
    stockText += `⚠️ _No stock numbers currently available in bot database._\n`;
  } else {
    inStockItems.forEach(item => {
      stockText += `${item.serviceIcon} ${item.service} | ${item.flag} ${item.country} (${item.code}): **${item.count} numbers in stock**\n`;
    });
  }

  stockText += `\n👇 **Use the Colored Admin Reply Keyboard below to manage your bot:**`;

  const replyKeyboard = {
    keyboard: [
      [
        { text: "📥 Add Stock (.txt)", style: "success" },
        { text: "📦 Stock Breakdown", style: "primary" }
      ],
      [
        { text: "📈 Live Traffic Details", style: "primary" },
        { text: "📢 Broadcast", style: "danger" }
      ],
      [
        { text: "➕ Add Service", style: "success" },
        { text: "🔄 Toggle Services", style: "primary" }
      ],
      [
        { text: "➕ Add Country", style: "success" },
        { text: "❌ Delete Country", style: "danger" }
      ],
      [
        { text: "🚫 Ban User", style: "danger" },
        { text: "✅ Unban User", style: "success" }
      ],
      [
        { text: "👤 User Info", style: "primary" },
        { text: "📥 Export Stock", style: "primary" }
      ],
      [
        { text: "🧪 Test Group Post", style: "primary" },
        { text: `🛠 Maint: ${isMaint ? 'ON 🚧' : 'OFF 🟢'}`, style: "danger" }
      ],
      [
        { text: "🗑 Clear Stock", style: "danger" },
        { text: "🏠 Main Menu", style: "primary" }
      ]
    ],
    resize_keyboard: true,
    is_persistent: true
  };

  return await sendTelegramRequest('sendMessage', {
    chat_id: chatId,
    text: stockText,
    parse_mode: 'Markdown',
    reply_markup: replyKeyboard
  });
}

// Show Interactive Service Toggle Sub-Menu
async function sendServiceToggleMenu(chatId, messageId = null) {
  const allSvcs = getServices(true);

  let text = `🔄 **TOGGLE SERVICES ON / OFF**\n\nClick any service button below to switch its visibility:\n`;

  const inlineKeyboard = allSvcs.map(s => [
    { text: `${s.icon} ${s.name}: ${s.enabled ? '🟢 ON' : '🔴 OFF'}`, callback_data: `admin_togglesvc_${s.id}` }
  ]);

  inlineKeyboard.push([
    { text: "🔙 Back to Admin", callback_data: "admin_stock" },
    { text: "🏠 Main Menu", callback_data: "back_to_main_menu" }
  ]);

  if (messageId) {
    return await sendTelegramRequest('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: inlineKeyboard }
    });
  }

  return await sendTelegramRequest('sendMessage', {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: inlineKeyboard }
  });
}

// Show Interactive Country Delete Sub-Menu
async function sendDeleteCountryMenu(chatId, messageId = null) {
  const countries = getCountries();

  if (countries.length === 0) {
    const text = "❌ **DELETE COUNTRY**\n\nNo countries currently exist in the database.";
    const inlineKeyboard = [
      [{ text: "🔙 Back to Admin", callback_data: "admin_stock" }, { text: "🏠 Main Menu", callback_data: "back_to_main_menu" }]
    ];
    if (messageId) {
      return await sendTelegramRequest('editMessageText', { chat_id: chatId, message_id: messageId, text, parse_mode: 'Markdown', reply_markup: { inline_keyboard: inlineKeyboard } });
    }
    return await sendTelegramRequest('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown', reply_markup: { inline_keyboard: inlineKeyboard } });
  }

  const text = "❌ **DELETE COUNTRY**\n\nClick any country button below to remove it from the system:\n";
  const inlineKeyboard = countries.map(c => [
    { text: `❌ ${c.flag} ${c.name} (${c.code})`, callback_data: `admin_confirm_delcountry_${c.code}` }
  ]);

  inlineKeyboard.push([
    { text: "🔙 Back to Admin", callback_data: "admin_stock" },
    { text: "🏠 Main Menu", callback_data: "back_to_main_menu" }
  ]);

  if (messageId) {
    return await sendTelegramRequest('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: inlineKeyboard }
    });
  }

  return await sendTelegramRequest('sendMessage', {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: inlineKeyboard }
  });
}

// Vercel Serverless Function Handler
module.exports = async function handler(req, res) {
  // Support Link 2 Real-Time Range Endpoint: GET /api/bot?range=true&rangeName=CAMBODIA%207290&phone=855319678578&sid=Facebook
  if (req.query && (req.query.range || req.query.radar)) {
    const rangeName = req.query.rangeName || req.query.country || 'CAMBODIA 7290';
    const phone = req.query.phone || req.query.number || '855319678578';
    const sid = req.query.sid || req.query.service || 'FACEBOOK';
    const message = req.query.message || req.query.text || '';
    recordLiveRange(rangeName, phone, sid, message);
    return res.status(200).json({ ok: true, status: "Live Range recorded" });
  }

  // Support Webhook endpoint from IVAS Portal: GET or POST /api/bot?sms=true&number=22879092941&message=...
  if (req.query && (req.query.sms || req.query.number)) {
    const number = req.query.number;
    const message = req.query.message || req.query.text || '';
    if (number) {
      const processed = processIncomingSMS(number, message);
      const card = buildOTPFormattedCard(
        processed.record.serviceId,
        processed.record.countryCode,
        processed.number,
        processed.record.fullMessage,
        processed.record.otpCode
      );

      // Post to Group (-5477236175)
      await logToGroup(card);

      // Post directly to User if registered
      if (processed.record.userId) {
        await sendTelegramRequest('sendMessage', {
          chat_id: processed.record.userId,
          ...card
        });
      }

      return res.status(200).json({ ok: true, status: "SMS Processed and Group Broadcasted" });
    }
  }

  if (req.method === 'GET') {
    const { setWebhook } = req.query;
    if (setWebhook) {
      if (!BOT_TOKEN) {
        return res.status(400).json({ ok: false, error: "TELEGRAM_BOT_TOKEN environment variable is not set." });
      }
      const result = await sendTelegramRequest('setWebhook', { url: setWebhook });

      // Automatically register bot command menu (/start only)
      await sendTelegramRequest('setMyCommands', {
        commands: [
          { command: "start", description: "🚀 Start Bot & Main Menu" }
        ]
      });

      return res.status(200).json(result);
    }
    return res.status(200).send("Bro's Number Bot API is active!");
  }

  if (req.method === 'POST') {
    try {
      let update = req.body;
      if (!update) return res.status(200).json({ ok: true });
      if (typeof update === 'string') {
        try { update = JSON.parse(update); } catch (e) {}
      }

      // Handle Callback Queries
      if (update.callback_query) {
        const query = update.callback_query;
        const chatId = query.message?.chat?.id || query.from?.id;
        const messageId = query.message?.message_id;
        const data = query.data || '';
        if (!chatId) return res.status(200).json({ ok: true });

        if (data.startsWith('copy_')) {
          await sendTelegramRequest('answerCallbackQuery', {
            callback_query_id: query.id,
            text: "Text copied to clipboard.",
            show_alert: false
          });
          return res.status(200).json({ ok: true });
        }

        await sendTelegramRequest('answerCallbackQuery', { callback_query_id: query.id });

        if (isUserBanned(chatId)) {
          await sendTelegramRequest('sendMessage', { chat_id: chatId, text: "🚫 **You are banned from using this bot.**" });
          return res.status(200).json({ ok: true });
        }

        if (data === 'back_to_main_menu') {
          await sendMainMenu(chatId, "👋 **Welcome back to Main Menu!**");
          return res.status(200).json({ ok: true });
        }

        if (data === 'back_to_services') {
          await sendServiceSelection(chatId);
        } else if (data.startsWith('svc_')) {
          const serviceId = data.replace('svc_', '');
          await sendCountrySelection(chatId, serviceId);
        } else if (data.startsWith('num_')) {
          const parts = data.split('_');
          const serviceId = parts[1];
          const countryCode = parts[2];

          const result = get4Numbers(serviceId, countryCode, chatId);

          if (!result.success) {
            await sendTelegramRequest('sendMessage', {
              chat_id: chatId,
              text: `⚠️ **Out of Stock!**\n\nNo numbers available for ${serviceId.toUpperCase()} (${countryCode}).`,
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: "⬅️ Back to Services", callback_data: "back_to_services" }],
                  [{ text: "🏠 Main Menu", callback_data: "back_to_main_menu" }]
                ]
              }
            });
          } else {
            const country = getCountries().find(c => c.code === countryCode) || { flag: '🌐', name: countryCode };
            const service = getServices(true).find(s => s.id === serviceId) || { icon: '📱', name: serviceId };

            const inlineKeyboard = [
              [
                { text: service.name, callback_data: "dummy_svc", style: "success" }
              ],
              ...result.numbers.map(num => [
                { text: num, callback_data: `copy_${num}`, copy_text: { text: num } }
              ]),
              [
                { text: "Change Number", callback_data: "back_to_services", style: "danger" },
                { text: "OTP Group", url: "https://t.me/c/4296466829/1", style: "primary" }
              ],
              [
                { text: "Close", callback_data: "close_msg", style: "danger" },
                { text: "🏠 Main Menu", callback_data: "back_to_main_menu" }
              ]
            ];

            await sendTelegramRequest('sendMessage', {
              chat_id: chatId,
              text: "NEW NUMBER",
              reply_markup: { inline_keyboard: inlineKeyboard }
            });

            await logToGroup(`📢 **New Order Dispensed!**\n\n👤 User ID: \`${chatId}\`\n📌 Service: ${service.icon} ${service.name}\n🌐 Country: ${country.flag} ${country.name}\n📱 Numbers:\n${result.numbers.map(n => '• `' + n + '`').join('\n')}`);
          }
        } else if (data === 'close_msg') {
          await sendTelegramRequest('deleteMessage', {
            chat_id: chatId,
            message_id: messageId
          });
          return res.status(200).json({ ok: true });
        } else if (data === 'admin_stock') {
          await sendAdminPanel(chatId, messageId);
        } else if (data === 'admin_addstock_guide') {
          const text = `📥 **HOW TO UPLOAD / ADD NUMBER STOCK**\n\n` +
            `To add phone numbers to bot stock:\n\n` +
            `1️⃣ Create or open a \`.txt\` file containing phone numbers (1 number per line).\n` +
            `2️⃣ Send / Upload the \`.txt\` file directly in this Telegram chat.\n` +
            `3️⃣ In the **File Caption**, write: \`<service> <country_code>\`\n\n` +
            `*Caption Examples:*\n` +
            `• \`facebook US\` (Adds stock for Facebook USA 🇺🇸)\n` +
            `• \`whatsapp BD\` (Adds stock for WhatsApp Bangladesh 🇧🇩)\n` +
            `• \`instagram IN\` (Adds stock for Instagram India 🇮🇳)\n\n` +
            `*Or Single Number Command:*\n` +
            `\`/addstock <service> <country_code> <phone_number>\`\n` +
            `Example: \`/addstock facebook US +12025550143\`\n\n` +
            `_Note: If the country doesn't exist yet, the bot auto-creates it!_`;
          await sendTelegramRequest('editMessageText', {
            chat_id: chatId,
            message_id: messageId,
            text: text,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: "🔙 Back to Admin", callback_data: "admin_stock" }, { text: "🏠 Main Menu", callback_data: "back_to_main_menu" }]
              ]
            }
          });
        } else if (data === 'admin_traffic_details') {
          const trafficData = getLiveTrafficAnalytics();
          let text = `📈 **LIVE COUNTRY OTP TRAFFIC ANALYTICS** 📈\n\n`;
          text += `Total OTPs Processed Today: \`${trafficData.totalOtpsReceived}\`\n\n`;
          if (trafficData.items.length === 0) {
            text += `ℹ️ _No OTP traffic recorded yet._\n`;
          } else {
            text += `🔥 **High Demand Countries (Add Stock Here!):**\n\n`;
            trafficData.items.forEach(item => {
              text += `${item.serviceIcon} **${item.serviceName}** | ${item.countryFlag} **${item.countryName}** (\`${item.countryCode}\`)\n`;
              text += `└ 📩 **OTPs Received:** \`${item.otpCount}\` | 📱 **Issued Numbers:** \`${item.issuedCount}\`\n\n`;
            });
          }
          await sendTelegramRequest('editMessageText', {
            chat_id: chatId,
            message_id: messageId,
            text: text,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: "🔙 Back to Admin", callback_data: "admin_stock" }, { text: "🏠 Main Menu", callback_data: "back_to_main_menu" }]
              ]
            }
          });
        } else if (data === 'admin_stock_details') {
          const summary = getAllStockSummary();
          let text = `📦 **FULL NUMBER STOCK BREAKDOWN** 📦\n\n`;
          if (summary.length === 0) {
            text += `⚠️ _No stock numbers or countries added yet._\n`;
          } else {
            summary.forEach(item => {
              const statusBadge = item.count > 0 ? `🟢 \`${item.count}\` in stock` : `🔴 **OUT OF STOCK**`;
              text += `${item.serviceIcon} **${item.service}** | ${item.flag} **${item.country}** (\`${item.code}\`)\n└ Status: ${statusBadge}\n\n`;
            });
          }
          await sendTelegramRequest('editMessageText', {
            chat_id: chatId,
            message_id: messageId,
            text: text,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: "🔙 Back to Admin", callback_data: "admin_stock" }, { text: "🏠 Main Menu", callback_data: "back_to_main_menu" }]
              ]
            }
          });
        } else if (data === 'admin_broadcast') {
          const text = "📢 **BROADCAST ANNOUNCEMENT**\n\nTo send a broadcast message to all bot users, send text in format:\n`/broadcast Your announcement message here`\n\n*Example:*\n`/broadcast 🔥 New Facebook US numbers added to stock!`";
          await sendTelegramRequest('editMessageText', {
            chat_id: chatId,
            message_id: messageId,
            text: text,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: "🔙 Back to Admin", callback_data: "admin_stock" }, { text: "🏠 Main Menu", callback_data: "back_to_main_menu" }]
              ]
            }
          });
        } else if (data === 'admin_addsvc') {
          const text = "➕ **ADD NEW SERVICE**\n\nTo add a new service, send text command:\n`/addservice <id> <name> <icon>`\n\n*Example:*\n`/addservice telegram Telegram ✈️`";
          await sendTelegramRequest('editMessageText', {
            chat_id: chatId,
            message_id: messageId,
            text: text,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: "🔙 Back to Admin", callback_data: "admin_stock" }, { text: "🏠 Main Menu", callback_data: "back_to_main_menu" }]
              ]
            }
          });
        } else if (data === 'admin_togglesvc_menu') {
          await sendServiceToggleMenu(chatId, messageId);
        } else if (data.startsWith('admin_togglesvc_')) {
          const svcId = data.replace('admin_togglesvc_', '');
          toggleService(svcId);
          await sendServiceToggleMenu(chatId, messageId);
        } else if (data === 'admin_toggle_maint') {
          const currentMaint = getMaintenance();
          setMaintenance(!currentMaint);
          await sendAdminPanel(chatId, messageId);
        } else if (data === 'admin_addcountry') {
          const text = "➕ **ADD NEW COUNTRY**\n\nTo add a country, send text command:\n`/addcountry <Country Name>`\n\n*Example:*\n`/addcountry United States` or `/addcountry BD`\n\n_Note: Countries are also created automatically when uploading stock files!_";
          await sendTelegramRequest('editMessageText', {
            chat_id: chatId,
            message_id: messageId,
            text: text,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: "🔙 Back to Admin", callback_data: "admin_stock" }, { text: "🏠 Main Menu", callback_data: "back_to_main_menu" }]
              ]
            }
          });
        } else if (data === 'admin_delcountry_menu') {
          await sendDeleteCountryMenu(chatId, messageId);
        } else if (data.startsWith('admin_confirm_delcountry_')) {
          const code = data.replace('admin_confirm_delcountry_', '');
          deleteCountry(code);
          await sendDeleteCountryMenu(chatId, messageId);
        } else if (data === 'admin_banuser') {
          const text = "🚫 **BAN USER**\n\nTo ban a user from using the bot, send text command:\n`/banuser <user_id>`\n\n*Example:*\n`/banuser 123456789`";
          await sendTelegramRequest('editMessageText', {
            chat_id: chatId,
            message_id: messageId,
            text: text,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: "🔙 Back to Admin", callback_data: "admin_stock" }, { text: "🏠 Main Menu", callback_data: "back_to_main_menu" }]
              ]
            }
          });
        } else if (data === 'admin_unbanuser') {
          const text = "✅ **UNBAN USER**\n\nTo unban a user, send text command:\n`/unbanuser <user_id>`\n\n*Example:*\n`/unbanuser 123456789`";
          await sendTelegramRequest('editMessageText', {
            chat_id: chatId,
            message_id: messageId,
            text: text,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: "🔙 Back to Admin", callback_data: "admin_stock" }, { text: "🏠 Main Menu", callback_data: "back_to_main_menu" }]
              ]
            }
          });
        } else if (data === 'admin_userinfo') {
          const text = "👤 **USER SEARCH & DETAILS**\n\nTo view details and order history for a user, send text command:\n`/userinfo <user_id>`\n\n*Example:*\n`/userinfo 8929349073`";
          await sendTelegramRequest('editMessageText', {
            chat_id: chatId,
            message_id: messageId,
            text: text,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: "🔙 Back to Admin", callback_data: "admin_stock" }, { text: "🏠 Main Menu", callback_data: "back_to_main_menu" }]
              ]
            }
          });
        } else if (data === 'admin_exportstock') {
          const text = "📥 **EXPORT STOCK**\n\nTo view stock numbers for a service and country, send text command:\n`/exportstock <service> <country_code>`\n\n*Example:*\n`/exportstock facebook US`";
          await sendTelegramRequest('editMessageText', {
            chat_id: chatId,
            message_id: messageId,
            text: text,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: "🔙 Back to Admin", callback_data: "admin_stock" }, { text: "🏠 Main Menu", callback_data: "back_to_main_menu" }]
              ]
            }
          });
        } else if (data === 'admin_clearstock') {
          const text = "⚠️ **CLEAR ALL STOCK CONFIRMATION**\n\nAre you sure you want to delete all current number stock from the bot database?";
          await sendTelegramRequest('editMessageText', {
            chat_id: chatId,
            message_id: messageId,
            text: text,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: "⚠️ Yes, Clear All Stock", callback_data: "admin_confirm_clearstock" }],
                [{ text: "🔙 Back to Admin", callback_data: "admin_stock" }, { text: "🏠 Main Menu", callback_data: "back_to_main_menu" }]
              ]
            }
          });
        } else if (data === 'admin_confirm_clearstock') {
          clearAllStock();
          const text = "✅ **All Stock Cleared Successfully!**";
          await sendTelegramRequest('editMessageText', {
            chat_id: chatId,
            message_id: messageId,
            text: text,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: "🔙 Back to Admin", callback_data: "admin_stock" }, { text: "🏠 Main Menu", callback_data: "back_to_main_menu" }]
              ]
            }
          });
        } else if (data === 'admin_receivesms') {
          const text = "📲 **LIVE SMS TESTER / OVERRIDE**\n\nTo post a live SMS OTP card directly to group & user, send text:\n`/receivesms <number> <full message body>`\n\n*Example:*\n`/receivesms +255710962660 <#> 19926 es tu codigo de Facebook H29Q+Fsn4Sr`";
          await sendTelegramRequest('editMessageText', {
            chat_id: chatId,
            message_id: messageId,
            text: text,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: "🔙 Back to Admin", callback_data: "admin_stock" }, { text: "🏠 Main Menu", callback_data: "back_to_main_menu" }]
              ]
            }
          });
        }
               return res.status(200).json({ ok: true });
     }

   // Handle Text Messages & File Uploads
      if (update.message) {
        const message = update.message;
        if (!message.chat) return res.status(200).json({ ok: true });
        const chatId = message.chat.id;
        const chatType = message.chat.type || 'private';
        const isGroup = chatType === 'group' || chatType === 'supergroup' || chatId < 0;
        const text = message.text || '';
        const isUserAdmin = !ADMIN_ID || String(chatId) === ADMIN_ID;

        // In Group: Ignore plain chatter & main menu replies (Only allow SMS cards or explicit admin /receivesms)
        if (isGroup) {
          if (text.startsWith('/receivesms') && isUserAdmin) {
            const raw = text.replace('/receivesms', '').trim();
            const firstSpace = raw.indexOf(' ');
            if (firstSpace !== -1) {
              const number = raw.substring(0, firstSpace).trim();
              const fullMessage = raw.substring(firstSpace).trim();
              const processed = processIncomingSMS(number, fullMessage);
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
            }
          }
          return res.status(200).json({ ok: true });
        }

        registerUser(chatId);

        // Handle global Main Menu & /start command
        if (text === '🏠 Main Menu' || text === '/start') {
          delete adminState[chatId];
          await sendMainMenu(chatId);
          return res.status(200).json({ ok: true });
        }

        // Handle Admin Interactive State Machine
        if (isUserAdmin && adminState[chatId]) {
          const state = adminState[chatId];

          if (text === '🏠 Main Menu' || text === '/start') {
            delete adminState[chatId];
            await sendMainMenu(chatId);
            return res.status(200).json({ ok: true });
          }

          if (state.step === 'WAITING_SERVICE') {
            const services = getServices(true);
            const matched = services.find(s => text.toLowerCase().includes(s.name.toLowerCase()) || text.toLowerCase().includes(s.id.toLowerCase())) || { id: text.toLowerCase().replace(/[^a-z]/g, ''), name: text, icon: '📱' };

            state.serviceId = matched.id;
            state.serviceName = matched.name;
            state.serviceIcon = matched.icon || getServiceIcon(matched.name);
            state.step = 'WAITING_COUNTRY';

            const countries = getCountries();
            const countryKeyboard = [];
            for (let i = 0; i < countries.length; i += 2) {
              const row = [];
              row.push({ text: `${countries[i].flag} ${countries[i].name.toUpperCase()}`, style: "primary" });
              if (countries[i + 1]) {
                row.push({ text: `${countries[i + 1].flag} ${countries[i + 1].name.toUpperCase()}`, style: "primary" });
              }
              countryKeyboard.push(row);
            }
            countryKeyboard.push([{ text: "🏠 Main Menu", style: "danger" }]);

            await sendTelegramRequest('sendMessage', {
              chat_id: chatId,
              text: `📌 **Service Selected:** ${state.serviceIcon} **${state.serviceName.toUpperCase()}**\n\nPlease select a **Country** from the Reply Keyboard below or type a Country Name:`,
              parse_mode: 'Markdown',
              reply_markup: { keyboard: countryKeyboard, resize_keyboard: true, is_persistent: true }
            });
            return res.status(200).json({ ok: true });
          }

          if (state.step === 'WAITING_COUNTRY') {
            const rawCountry = text.replace(/^[^\w\s]/g, '').trim();
            const cleanCountryName = (rawCountry || 'GLOBAL').replace(/\s*\d+$/g, '').trim().toUpperCase();
            const countryCode = cleanCountryName.substring(0, 3);
            const flag = getFlagEmoji(cleanCountryName);
            const countryObj = addCountry(cleanCountryName, countryCode);

            const { numbers, serviceId, serviceName, serviceIcon } = state;
            delete adminState[chatId];

            const result = addStock(serviceId, countryObj.code, numbers);

            // Send Admin Confirmation
            await sendAdminPanel(chatId);
            await sendTelegramRequest('sendMessage', {
              chat_id: chatId,
              text: `✅ **Stock Uploaded Successfully!**\n\n📌 **Service:** ${serviceIcon} ${serviceName.toUpperCase()}\n🌐 **Country:** ${flag} ${countryObj.name}\n📥 **Added:** ${numbers.length} numbers\n📊 **Total Stock:** ${result.totalStock} numbers`,
              parse_mode: 'Markdown'
            });

            // Post Group Broadcast in requested format
            const groupBroadcastCard = `➖➖➖➖➖➖➖➖\n` +
              `《 NEW NUMBERS 》\n` +
              `➖➖➖➖➖➖➖➖\n` +
              `${flag} ${flag} ${countryObj.name.toUpperCase()} (${numbers.length}) ${serviceIcon} ${serviceName.toUpperCase()}\n` +
              `➖➖➖➖➖➖➖➖\n` +
              `📤 Total Added: ${numbers.length}\n\n` +
              `➖➖➖➖➖➖➖➖\n` +
              `Use /start to get your numbers!`;

            await logToGroup(groupBroadcastCard);
            return res.status(200).json({ ok: true });
          }
        }

        if (!isUserAdmin && isUserBanned(chatId)) {
          await sendTelegramRequest('sendMessage', { chat_id: chatId, text: "🚫 **You are banned from using this bot.**" });
          return res.status(200).json({ ok: true });
        }

        if (!isUserAdmin && getMaintenance()) {
          const mainMsg = `╔═════════════════════════╗\n   🚧 **BOT UNDER MAINTENANCE** 🚧\n╚═════════════════════════╝\n\nOur system is currently undergoing scheduled maintenance to add new stocks and upgrade server performance.\n━━━━━━━━━━━━━━━━━━━━━━━━━`;
          await sendTelegramRequest('sendMessage', {
            chat_id: chatId,
            text: mainMsg,
            parse_mode: 'Markdown'
          });
          return res.status(200).json({ ok: true });
        }

        // Handle Admin .txt Stock Upload File
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

              await sendTelegramRequest('sendMessage', {
                chat_id: chatId,
                text: `✅ **Stock Uploaded Successfully!**\n\n📌 **Service:** ${serviceId.toUpperCase()}\n🌐 **Country:** ${flag} ${countryCode}\n📥 **Added:** ${result.addedCount} numbers\n📊 **Total Stock:** ${result.totalStock} numbers`,
                parse_mode: 'Markdown'
              });

              const groupCard = `➖➖➖➖➖➖➖➖\n` +
                `《 NEW NUMBERS 》\n` +
                `➖➖➖➖➖➖➖➖\n` +
                `${flag} ${flag} ${countryCode} (${result.addedCount}) 📱 ${serviceId.toUpperCase()}\n` +
                `➖➖➖➖➖➖➖➖\n` +
                `📤 Total Added: ${result.addedCount}\n\n` +
                `➖➖➖➖➖➖➖➖\n` +
                `Use /start to get your numbers!`;
              await logToGroup(groupCard);
            } else {
              adminState[chatId] = { step: 'WAITING_SERVICE', numbers: numberLines };

              const services = getServices(true);
              const svcKeyboard = [];
              for (let i = 0; i < services.length; i += 2) {
                const row = [];
                row.push({ text: `${services[i].icon} ${services[i].name.toUpperCase()}`, style: "primary" });
                if (services[i + 1]) {
                  row.push({ text: `${services[i + 1].icon} ${services[i + 1].name.toUpperCase()}`, style: "primary" });
                }
                svcKeyboard.push(row);
              }
              svcKeyboard.push([{ text: "🏠 Main Menu", style: "danger" }]);

              await sendTelegramRequest('sendMessage', {
                chat_id: chatId,
                text: `✅ **File Received!** (\`${numberLines.length} numbers\`)\n\nPlease select the **Service** for these numbers from the Reply Keyboard below:`,
                parse_mode: 'Markdown',
                reply_markup: { keyboard: svcKeyboard, resize_keyboard: true, is_persistent: true }
              });
            }
          } catch (err) {
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `❌ **Upload Error:** ${err.message}` });
          }
          return res.status(200).json({ ok: true });
        }

        // Receive Live SMS from IVAS Portal via Command: /receivesms <number> <message_text>
        if (text.startsWith('/receivesms') && isUserAdmin) {
          const raw = text.replace('/receivesms', '').trim();
          const firstSpace = raw.indexOf(' ');
          if (firstSpace === -1) {
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: "⚠️ Usage: `/receivesms <number> <full message body>`\nExample: `/receivesms +255710962660 <#> 19926 es tu codigo de Facebook H29Q+Fsn4Sr`" });
            return res.status(200).json({ ok: true });
          }

          const number = raw.substring(0, firstSpace).trim();
          const fullMessage = raw.substring(firstSpace).trim();

          const processed = processIncomingSMS(number, fullMessage);
          const card = buildOTPFormattedCard(
            processed.record.serviceId,
            processed.record.countryCode,
            processed.number,
            processed.record.fullMessage,
            processed.record.otpCode
          );

          // Post to Group (-5477236175)
          await logToGroup(card);

          // Send to User
          if (processed.record.userId) {
            await sendTelegramRequest('sendMessage', {
              chat_id: processed.record.userId,
              ...card
            });
          }

          await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `✅ Live SMS Card generated & posted to Group for \`${number}\`!` });
          return res.status(200).json({ ok: true });
        }

        // Standard Admin Commands
        if (text.startsWith('/broadcast') && isUserAdmin) {
          const msgText = text.replace('/broadcast', '').trim();
          if (msgText) {
            const users = getAllUsers();
            let sentCount = 0;
            for (const uId of users) {
              try {
                await sendTelegramRequest('sendMessage', { chat_id: uId, text: `📢 **Announcement from Admin:**\n\n${msgText}`, parse_mode: 'Markdown' });
                sentCount++;
              } catch (e) {}
            }
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `✅ Broadcast sent to ${sentCount}/${users.length} users!` });
          }
          return res.status(200).json({ ok: true });
        }

        if (text.startsWith('/addservice') && isUserAdmin) {
          const parts = text.split(' ');
          if (parts.length >= 4) {
            const addedSvc = addService(parts[1], parts[2], parts[3]);
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `✅ Service ${addedSvc.icon} **${addedSvc.name}** (\`${addedSvc.id}\`) added!` });
          }
          return res.status(200).json({ ok: true });
        }

        if (text.startsWith('/addstock') && isUserAdmin) {
          const parts = text.split(' ');
          if (parts.length >= 4) {
            const serviceId = parts[1].toLowerCase();
            const countryCode = parts[2].toUpperCase();
            const num = parts[3].trim();
            const result = addStock(serviceId, countryCode, [num]);
            await sendTelegramRequest('sendMessage', {
              chat_id: chatId,
              text: `✅ **Number Added to Stock!**\n\n📌 Service: ${serviceId.toUpperCase()}\n🌐 Country: ${result.country.flag} ${result.country.name}\n📱 Number: \`${num}\`\n📊 Total Stock: ${result.totalStock}`,
              parse_mode: 'Markdown'
            });
          }
          return res.status(200).json({ ok: true });
        }

        if (text.startsWith('/toggleservice') && isUserAdmin) {
          const svcId = text.replace('/toggleservice', '').trim();
          const toggled = toggleService(svcId);
          if (toggled) {
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `✅ Service **${toggled.name}** is now ${toggled.enabled ? '🟢 ON (Visible)' : '🔴 OFF (Hidden)'}!` });
          }
          return res.status(200).json({ ok: true });
        }

        if (text.startsWith('/maintenance') && isUserAdmin) {
          const mode = text.replace('/maintenance', '').trim().toLowerCase();
          const status = setMaintenance(mode === 'on' || mode === 'true');
          await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `🛠️ Bot Maintenance mode: **${status ? 'ON 🚧' : 'OFF 🟢'}**` });
          return res.status(200).json({ ok: true });
        }

        if (text.startsWith('/addcountry') && isUserAdmin) {
          const countryName = text.replace('/addcountry', '').trim();
          if (countryName) {
            const added = addCountry(countryName);
            await sendTelegramRequest('sendMessage', {
              chat_id: chatId,
              text: `✅ **Country Added!**\n\nCountry: ${added.flag} **${added.name}**\nCode: \`${added.code}\``,
              parse_mode: 'Markdown'
            });
          }
          return res.status(200).json({ ok: true });
        }

        if (text.startsWith('/banuser') && isUserAdmin) {
          const uid = text.replace('/banuser', '').trim();
          if (uid) {
            banUser(uid);
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `🚫 User \`${uid}\` has been **banned**!`, parse_mode: 'Markdown' });
          }
          return res.status(200).json({ ok: true });
        }

        if (text.startsWith('/unbanuser') && isUserAdmin) {
          const uid = text.replace('/unbanuser', '').trim();
          if (uid) {
            unbanUser(uid);
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `✅ User \`${uid}\` has been **unbanned**!`, parse_mode: 'Markdown' });
          }
          return res.status(200).json({ ok: true });
        }

        if ((text.startsWith('/delcountry') || text.startsWith('/deletecountry')) && isUserAdmin) {
          const code = text.replace('/delcountry', '').replace('/deletecountry', '').trim();
          if (code) {
            const deleted = deleteCountry(code);
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: deleted ? `✅ Country **${deleted.name}** (\`${deleted.code}\`) removed!` : `⚠️ Country \`${code}\` not found!`, parse_mode: 'Markdown' });
          }
          return res.status(200).json({ ok: true });
        }

        if (text.startsWith('/userinfo') && isUserAdmin) {
          const uid = text.replace('/userinfo', '').trim();
          if (uid) {
            const info = getUserInfo(uid);
            let msg = `👤 **USER INFO & HISTORY**\n\n`;
            msg += `🆔 User ID: \`${info.userId}\`\n`;
            msg += `🚫 Status: ${info.isBanned ? 'BANNED 🔴' : 'ACTIVE 🟢'}\n`;
            msg += `📱 Today OTP Count: ${info.otpCount}\n`;
            msg += `📦 Total Orders Issued: ${info.totalIssued}\n`;
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: msg, parse_mode: 'Markdown' });
          }
          return res.status(200).json({ ok: true });
        }

        if (text.startsWith('/exportstock') && isUserAdmin) {
          const parts = text.split(' ');
          if (parts.length >= 3) {
            const stockList = exportStock(parts[1], parts[2]);
            let msg = `📥 **EXPORT STOCK: ${parts[1].toUpperCase()} (${parts[2].toUpperCase()})**\n\nTotal: ${stockList.length} numbers\n\n`;
            msg += stockList.slice(0, 50).map(n => `\`${n}\``).join('\n');
            if (stockList.length > 50) msg += `\n...and ${stockList.length - 50} more.`;
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: msg, parse_mode: 'Markdown' });
          }
          return res.status(200).json({ ok: true });
        }

        if (text === '/admin' || text === '⚙️ Admin Panel') {
          if (isUserAdmin) await sendAdminPanel(chatId);
          return res.status(200).json({ ok: true });
        }

          // 1. Stock Breakdown
          if (text === '📦 Stock Breakdown') {
            const summary = getAllStockSummary();
            let msg = `📦 **CURRENT BOT STOCK BREAKDOWN**\n\n`;
            const inStock = summary.filter(s => s.count > 0);
            if (inStock.length === 0) {
              msg += `⚠️ _No stock numbers currently available in bot database._\n`;
            } else {
              inStock.forEach(s => { msg += `${s.serviceIcon} ${s.service} | ${s.flag} ${s.country} (${s.code}): **${s.count} numbers**\n`; });
            }
            await sendTelegramRequest('sendMessage', {
              chat_id: chatId, text: msg, parse_mode: 'Markdown'
            });
            return res.status(200).json({ ok: true });
          }

          // 2. Live Traffic Details & Range Detector
          if (text === '📈 Live Traffic Details') {
            await sendLiveTrafficWithRangeKeyboard(chatId);
            return res.status(200).json({ ok: true });
          }

          // Handle Range Name button clicks from Reply Keyboard
          const allRanges = getLiveRanges();
          const matchedRange = allRanges.find(r => text.includes(r.rangeName) || r.rangeName.includes(text.replace(/^[^\w\s]/g, '').trim()));
          if (matchedRange && isUserAdmin) {
            let msg = `📌 **LIVE RANGE DETAILS: ${matchedRange.flag} ${matchedRange.rangeName}**\n\n`;
            msg += `🌍 Country: ${matchedRange.flag} **${matchedRange.country}**\n`;
            msg += `📱 Live Test Number: \`${matchedRange.phoneNumber}\`\n`;
            msg += `📘 Service: **${matchedRange.sid}**\n`;
            msg += `🕒 Last Activity: \`${matchedRange.time}\`\n`;
            msg += `📩 Sample Content:\n\`${matchedRange.message || '<#> XXXXXX is your Facebook code'}\`\n\n`;
            msg += `💡 **Admin Action:** To add stock for this range, upload your \`.txt\` file or click 📥 **Add Stock (.txt)**!`;

            await sendTelegramRequest('sendMessage', {
              chat_id: chatId, text: msg, parse_mode: 'Markdown'
            });
            return res.status(200).json({ ok: true });
          }

          // 3. Broadcast Handler via Reply Keyboard
          if (text === '📢 Broadcast') {
            adminState[chatId] = { step: 'WAITING_BROADCAST_TARGET' };
            const bKeyboard = [
              [{ text: "📱 Bot Users Only", style: "primary" }, { text: "📢 Bot Users & Group", style: "success" }],
              [{ text: "🏠 Main Menu", style: "danger" }]
            ];
            await sendTelegramRequest('sendMessage', {
              chat_id: chatId,
              text: `📢 **BROADCAST ANNOUNCEMENT**\n\nWhere do you want to send this broadcast message? Select below:`,
              parse_mode: 'Markdown',
              reply_markup: { keyboard: bKeyboard, resize_keyboard: true, is_persistent: true }
            });
            return res.status(200).json({ ok: true });
          }

          if (adminState[chatId]?.step === 'WAITING_BROADCAST_TARGET') {
            adminState[chatId] = { step: 'WAITING_BROADCAST_MSG', targetGroup: text.includes('Group') };
            await sendTelegramRequest('sendMessage', {
              chat_id: chatId,
              text: `📝 **Type your Broadcast Message below:**\n\n_Target: ${text}_`,
              parse_mode: 'Markdown',
              reply_markup: { keyboard: [[{ text: "🏠 Main Menu", style: "danger" }]], resize_keyboard: true, is_persistent: true }
            });
            return res.status(200).json({ ok: true });
          }

          if (adminState[chatId]?.step === 'WAITING_BROADCAST_MSG') {
            const targetGroup = adminState[chatId].targetGroup;
            delete adminState[chatId];
            const users = getAllUsers();
            let sentCount = 0;
            for (const uId of users) {
              try {
                await sendTelegramRequest('sendMessage', { chat_id: uId, text: `📢 **Announcement from Admin:**\n\n${text}`, parse_mode: 'Markdown' });
                sentCount++;
              } catch (e) {}
            }
            if (targetGroup) {
              await logToGroup(`📢 **Announcement from Admin:**\n\n${text}`);
            }
            await sendAdminPanel(chatId);
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `✅ Broadcast sent to ${sentCount}/${users.length} users${targetGroup ? ' and Telegram Group!' : '!'}` });
            return res.status(200).json({ ok: true });
          }

          // 4. Add Service Handler
          if (text === '➕ Add Service') {
            adminState[chatId] = { step: 'WAITING_ADD_SERVICE' };
            await sendTelegramRequest('sendMessage', {
              chat_id: chatId,
              text: `➕ **ADD NEW SERVICE**\n\nPlease type the Service Name and Icon (e.g. \`Telegram ✈️\` or \`TikTok 🎵\` or \`Binance 🪙\`):`,
              parse_mode: 'Markdown',
              reply_markup: { keyboard: [[{ text: "🏠 Main Menu", style: "danger" }]], resize_keyboard: true, is_persistent: true }
            });
            return res.status(200).json({ ok: true });
          }

          if (adminState[chatId]?.step === 'WAITING_ADD_SERVICE') {
            delete adminState[chatId];
            const parts = text.trim().split(' ');
            const name = parts[0];
            const icon = parts[1] || getServiceIcon(name);
            const addedSvc = addService(name.toLowerCase(), name, icon);
            await sendAdminPanel(chatId);
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `✅ Service ${addedSvc.icon} **${addedSvc.name}** added successfully!` });
            return res.status(200).json({ ok: true });
          }

          // 5. Add Country Handler with Auto Flag & Code
          if (text === '➕ Add Country') {
            adminState[chatId] = { step: 'WAITING_ADD_COUNTRY' };
            await sendTelegramRequest('sendMessage', {
              chat_id: chatId,
              text: `➕ **ADD NEW COUNTRY**\n\nPlease type the Country Name (e.g. \`UNITED STATES\`, \`TANZANIA\`, \`BANGLADESH\`, \`BD\`, \`UK\`):`,
              parse_mode: 'Markdown',
              reply_markup: { keyboard: [[{ text: "🏠 Main Menu", style: "danger" }]], resize_keyboard: true, is_persistent: true }
            });
            return res.status(200).json({ ok: true });
          }

          if (adminState[chatId]?.step === 'WAITING_ADD_COUNTRY') {
            delete adminState[chatId];
            const cleanName = text.trim().toUpperCase();
            const countryObj = addCountry(cleanName);
            await sendAdminPanel(chatId);
            await sendTelegramRequest('sendMessage', {
              chat_id: chatId,
              text: `✅ **Country Added Successfully!**\n\nCountry: ${countryObj.flag} **${countryObj.name}**\nCode: \`${countryObj.code}\``,
              parse_mode: 'Markdown'
            });
            return res.status(200).json({ ok: true });
          }

          // 6. Toggle Services Reply Handler
          if (text === '🔄 Toggle Services') {
            await sendServiceToggleMenu(chatId);
            return res.status(200).json({ ok: true });
          }

          if (text.startsWith('🔄 ')) {
            const cleanSvcName = text.replace('🔄 ', '').split(':')[0].trim();
            const svcs = getServices(true);
            const foundSvc = svcs.find(s => cleanSvcName.toLowerCase().includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(cleanSvcName.toLowerCase()));
            if (foundSvc) {
              toggleService(foundSvc.id);
              await sendServiceToggleMenu(chatId);
            }
            return res.status(200).json({ ok: true });
          }

          // 7. Delete Country Reply Handler
          if (text === '❌ Delete Country') {
            await sendDeleteCountryMenu(chatId);
            return res.status(200).json({ ok: true });
          }

          if (text.startsWith('❌ Delete ')) {
            const rawCountry = text.replace('❌ Delete ', '').trim();
            const cleanCode = rawCountry.split('(')[1]?.replace(')', '').trim() || rawCountry.substring(0, 3);
            adminState[chatId] = { step: 'WAITING_DELETE_COUNTRY_CONFIRM', code: cleanCode, rawCountry };
            const delConfirmKeyboard = [
              [{ text: "⚠️ Yes, Delete Country", style: "danger" }],
              [{ text: "🏠 Main Menu", style: "primary" }]
            ];
            await sendTelegramRequest('sendMessage', {
              chat_id: chatId,
              text: `⚠️ **CONFIRM COUNTRY DELETION**\n\nAre you sure you want to delete country **${rawCountry}** from bot database?`,
              parse_mode: 'Markdown',
              reply_markup: { keyboard: delConfirmKeyboard, resize_keyboard: true, is_persistent: true }
            });
            return res.status(200).json({ ok: true });
          }

          if (adminState[chatId]?.step === 'WAITING_DELETE_COUNTRY_CONFIRM' && text === '⚠️ Yes, Delete Country') {
            const code = adminState[chatId].code;
            delete adminState[chatId];
            const deleted = deleteCountry(code);
            await sendAdminPanel(chatId);
            await sendTelegramRequest('sendMessage', {
              chat_id: chatId,
              text: deleted ? `✅ Country **${deleted.name}** (\`${deleted.code}\`) deleted successfully!` : `⚠️ Country deleted!`,
              parse_mode: 'Markdown'
            });
            return res.status(200).json({ ok: true });
          }

          // 8. Export Stock Handler
          if (text === '📥 Export Stock') {
            adminState[chatId] = { step: 'WAITING_EXPORT_STOCK_FORMAT' };
            const expKeyboard = [
              [{ text: "💬 View as Text", style: "primary" }, { text: "📄 Export as .txt File", style: "success" }],
              [{ text: "🏠 Main Menu", style: "danger" }]
            ];
            await sendTelegramRequest('sendMessage', {
              chat_id: chatId,
              text: `📥 **EXPORT STOCK**\n\nHow would you like to export available stock numbers?`,
              parse_mode: 'Markdown',
              reply_markup: { keyboard: expKeyboard, resize_keyboard: true, is_persistent: true }
            });
            return res.status(200).json({ ok: true });
          }

          if (adminState[chatId]?.step === 'WAITING_EXPORT_STOCK_FORMAT') {
            delete adminState[chatId];
            const summary = getAllStockSummary();
            const inStock = summary.filter(s => s.count > 0);
            let stockReport = `📥 **BRO'S BOT EXPORTED STOCK NUMBERS**\n\n`;
            inStock.forEach(s => {
              const list = exportStock(s.serviceId, s.code);
              stockReport += `📌 Service: ${s.service} | Country: ${s.flag} ${s.country} (${s.code})\n`;
              stockReport += list.map(n => n).join('\n') + `\n\n`;
            });

            await sendAdminPanel(chatId);
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: stockReport.substring(0, 4000), parse_mode: 'Markdown' });
            return res.status(200).json({ ok: true });
          }

          // 9. Test Group Post (Replaces Live SMS Tester)
          if (text === '🧪 Test Group Post' || text === '📲 Live SMS Tester') {
            const sampleCard = buildOTPFormattedCard(
              'facebook',
              'TZ',
              '+255710962660',
              '<#> 66473 ni msimbo wako wa Facebook H29Q+Fsn4Sr',
              '66473'
            );
            await logToGroup(sampleCard);
            await sendAdminPanel(chatId);
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `✅ **Test OTP Card posted successfully to Group (${GROUP_ID})!**` });
            return res.status(200).json({ ok: true });
          }

          // 10. Clear Stock Reply Handler
          if (text === '🗑 Clear Stock') {
            adminState[chatId] = { step: 'WAITING_CLEAR_STOCK_CONFIRM' };
            const clearKeyboard = [
              [{ text: "⚠️ Yes, Clear ALL Stock", style: "danger" }],
              [{ text: "🏠 Main Menu", style: "primary" }]
            ];
            await sendTelegramRequest('sendMessage', {
              chat_id: chatId,
              text: `⚠️ **CONFIRM CLEARING ALL STOCK**\n\nAre you sure you want to delete ALL phone numbers from the bot database? This action cannot be undone!`,
              parse_mode: 'Markdown',
              reply_markup: { keyboard: clearKeyboard, resize_keyboard: true, is_persistent: true }
            });
            return res.status(200).json({ ok: true });
          }

          if (adminState[chatId]?.step === 'WAITING_CLEAR_STOCK_CONFIRM' && text === '⚠️ Yes, Clear ALL Stock') {
            delete adminState[chatId];
            clearAllStock();
            await sendAdminPanel(chatId);
            await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `✅ **All stock numbers deleted successfully!**`, parse_mode: 'Markdown' });
            return res.status(200).json({ ok: true });
          }

          if (text === '🏠 Main Menu' || text === '/start') {
            delete adminState[chatId];
            await sendMainMenu(chatId);
            return res.status(200).json({ ok: true });
          }
        }

        // Support Handler
        if (text === '📞 Support') {
          const supportMsg = "💎 **Bro's Number Bot — Support Center** 💎\n\nNeed assistance with virtual numbers or OTP verification? Contact our admin team below:";
          await sendTelegramRequest('sendMessage', {
            chat_id: chatId,
            text: supportMsg,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "👨‍💻 Admin Contact", url: "https://t.me/Prime90999" }
                ],
                [
                  { text: "🏠 Main Menu", callback_data: "back_to_main_menu" }
                ]
              ]
            }
          });
          return res.status(200).json({ ok: true });
        }

        // User Profile Handler
        if (text === '👤 My Profile' || text.includes('Profile')) {
          const todayOtp = getUserOtpCount(chatId);
          let profileMsg = `╔═══════════════════╗\n`;
          profileMsg += `   👤 **USER ACCOUNT PROFILE**\n`;
          profileMsg += `╚═══════════════════╝\n`;
          profileMsg += `🆔 **User ID:** \`${chatId}\`\n`;
          profileMsg += `📱 **Today OTP:** ${todayOtp}\n\n`;
          profileMsg += `Balance and refer feature coming soon!\n`;
          profileMsg += `━━━━━━━━━━━━━━━━━━━━━`;

          await sendMainMenu(chatId, profileMsg);
          return res.status(200).json({ ok: true });
        }

        // Search OTP Handler - Generates Image 2 formatted Card
        if (text.startsWith('/otp') || text === '🔎 Search OTP' || (!text.startsWith('/') && text.replace(/\D/g, '').length >= 6)) {
          const query = text.replace('/otp', '').trim();
          if (!query || query === '🔎 Search OTP') {
            await sendMainMenu(chatId, "🔎 **Search OTP**\n\nPlease reply with your **Phone Number**:\n\nExample: `+255710962660`");
            return res.status(200).json({ ok: true });
          }

          const found = searchOTPByNumber(query);
          if (!found || !found.data.fullMessage) {
            await sendMainMenu(chatId, `⚠️ **No OTP Received Yet!**\n\nNo active SMS found for \`${query}\`. Please wait or search again.`);
            return res.status(200).json({ ok: true });
          }

          const card = buildOTPFormattedCard(
            found.data.serviceId,
            found.data.countryCode,
            found.number,
            found.data.fullMessage,
            found.data.otpCode
          );

          await sendTelegramRequest('sendMessage', {
            chat_id: chatId,
            ...card
          });

          // Sync Card to Group (-5477236175)
          await logToGroup(card);
          return res.status(200).json({ ok: true });
        }

        // User Navigation
        if (text.startsWith('/start') || text.includes('Start')) {
          if (text.includes('getnum')) {
            await sendServiceSelection(chatId);
          } else {
            await sendMainMenu(chatId, "👋 **Welcome to Bro's Number Bot!**\n\nChoose an option from the menu below:");
          }
        } else if (text === '📲 Get Number' || text.includes('Get Number')) {
          await sendServiceSelection(chatId);
        } else {
          await sendMainMenu(chatId, `You typed: *${text}*\n\nPlease select an option from the reply buttons below.`);
        }

        return res.status(200).json({ ok: true });
      }

      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Bot Handler Error:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

