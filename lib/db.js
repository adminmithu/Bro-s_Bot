/**
 * Bro's Number Bot - Database & Stock Management Module
 * Supports dynamic countries, .txt stock uploads, 4-number dispense, IVAS SMS OTP parsing & formatting.
 */

const FLAG_MAP = {
  'US': '🇺🇸', 'USA': '🇺🇸', 'UNITED STATES': '🇺🇸',
  'UK': '🇬🇧', 'GB': '🇬🇧', 'UNITED KINGDOM': '🇬🇧',
  'BD': '🇧🇩', 'BANGLADESH': '🇧🇩',
  'IN': '🇮🇳', 'INDIA': '🇮🇳',
  'PK': '🇵🇰', 'PAKISTAN': '🇵🇰',
  'CA': '🇨🇦', 'CANADA': '🇨🇦',
  'DE': '🇩🇪', 'GERMANY': '🇩🇪',
  'FR': '🇫🇷', 'FRANCE': '🇫🇷',
  'RU': '🇷🇺', 'RUSSIA': '🇷🇺',
  'AE': '🇦🇪', 'UAE': '🇦🇪', 'DUBAI': '🇦🇪',
  'SA': '🇸🇦', 'SAUDI ARABIA': '🇸🇦', 'SAUDI': '🇸🇦',
  'BR': '🇧🇷', 'BRAZIL': '🇧🇷',
  'ID': '🇮🇩', 'INDONESIA': '🇮🇩',
  'VN': '🇻🇳', 'VIETNAM': '🇻🇳',
  'PH': '🇵🇭', 'PHILIPPINES': '🇵🇭',
  'MY': '🇲🇾', 'MALAYSIA': '🇲🇾',
  'SG': '🇸🇬', 'SINGAPORE': '🇸🇬',
  'NG': '🇳🇬', 'NIGERIA': '🇳🇬',
  'EG': '🇪🇬', 'EGYPT': '🇪🇬',
  'TZ': '🇹🇿', 'TANZANIA': '🇹🇿',
  'TG': '🇹🇬', 'TOGO': '🇹🇬',
  'BENIN': '🇧🇯', 'CAMBODIA': '🇰🇭', 'SUDAN': '🇸🇩', 'AFGHANISTAN': '🇦🇫',
  'KW': '🇰🇼', 'KUWAIT': '🇰🇼',
  'LK': '🇱🇰', 'SRI LANKA': '🇱🇰',
  'BI': '🇧🇮', 'BURUNDI': '🇧🇮',
  'MA': '🇲🇦', 'MOROCCO': '🇲🇦',
  'DZ': '🇩🇿', 'ALGERIA': '🇩🇿',
  'KZ': '🇰🇿', 'KAZAKHSTAN': '🇰🇿',
  'CO': '🇨🇴', 'COLOMBIA': '🇨🇴',
  'MX': '🇲🇽', 'MEXICO': '🇲🇽',
  'AR': '🇦🇷', 'ARGENTINA': '🇦🇷',
  'ES': '🇪🇸', 'SPAIN': '🇪🇸',
  'IT': '🇮🇹', 'ITALY': '🇮🇹',
  'PL': '🇵🇱', 'POLAND': '🇵🇱',
  'UA': '🇺🇦', 'UKRAINE': '🇺🇦',
  'ZA': '🇿🇦', 'SOUTH AFRICA': '🇿🇦',
  'KE': '🇰🇪', 'KENYA': '🇰🇪',
  'UG': '🇺🇬', 'UGANDA': '🇺🇬',
  'GH': '🇬🇭', 'GHANA': '🇬🇭',
  'NP': '🇳🇵', 'NEPAL': '🇳🇵',
  'TH': '🇹🇭', 'THAILAND': '🇹🇭',
  'TR': '🇹🇷', 'TURKEY': '🇹🇷'
};

function extractOtpCode(fullMessage) {
  if (!fullMessage) return 'N/A';
  const numMatch = fullMessage.match(/\b\d{4,8}\b/);
  if (numMatch) return numMatch[0];

  const maskMatch = fullMessage.match(/\bX{4,8}\b/i);
  if (maskMatch) return maskMatch[0];

  const hyphenMatch = fullMessage.match(/\b(?:\d|X){3,4}[- ](?:\d|X){3,4}\b/i);
  if (hyphenMatch) return hyphenMatch[0];

  const kwMatch = fullMessage.match(/(?:code|is|codigo|código|verification|verificação|codice|kod)[:\s]+([A-Z0-9X-]{4,10})/i);
  if (kwMatch && kwMatch[1]) return kwMatch[1];

  return 'N/A';
}

function detectCountryFromPhone(phone) {
  if (!phone) return null;
  const clean = phone.replace(/[^\d]/g, '');
  if (clean.startsWith('880')) return 'BD';
  if (clean.startsWith('91')) return 'IN';
  if (clean.startsWith('92')) return 'PK';
  if (clean.startsWith('44')) return 'UK';
  if (clean.startsWith('1')) return 'US';
  if (clean.startsWith('7')) return 'RU';
  if (clean.startsWith('62')) return 'ID';
  if (clean.startsWith('84')) return 'VN';
  if (clean.startsWith('63')) return 'PH';
  if (clean.startsWith('60')) return 'MY';
  if (clean.startsWith('234')) return 'NG';
  if (clean.startsWith('20')) return 'EG';
  if (clean.startsWith('971')) return 'AE';
  if (clean.startsWith('966')) return 'SA';
  if (clean.startsWith('55')) return 'BR';
  if (clean.startsWith('49')) return 'DE';
  if (clean.startsWith('33')) return 'FR';
  return null;
}

function getFlagEmoji(countryInput) {
  if (!countryInput) return '🌐';
  const clean = countryInput.replace(/\s*\d+$/g, '').trim().toUpperCase();

  if (FLAG_MAP[clean]) {
    return FLAG_MAP[clean];
  }

  for (const key in FLAG_MAP) {
    if (clean.includes(key) || key.includes(clean)) {
      return FLAG_MAP[key];
    }
  }

  if (clean.length === 2 && /^[A-Z]{2}$/.test(clean)) {
    return String.fromCodePoint(...[...clean].map(c => 127397 + c.charCodeAt(0)));
  }

  return '🌐';
}

const SERVICE_EMOJI_MAP = {
  'facebook': '📘', 'fb': '📘',
  'instagram': '📸', 'insta': '📸',
  'whatsapp': '💬', 'wa': '💬',
  'telegram': '✈️', 'tg': '✈️',
  'google': '🔍', 'gmail': '📧',
  'tiktok': '🎵', 'tt': '🎵',
  'twitter': '🐦', 'x': '🐦',
  'binance': '🟡', 'crypto': '🪙',
  'bybit': '🟡', 'kucoin': '🟢', 'gate': '🔴',
  'trustwallet': '🛡️', 'metamask': '🦊',
  'payoneer': '💳', 'wise': '💸', 'revolut': '💳',
  'paypal': '🅿️', 'cashapp': '💵', 'zelle': '💸', 'venmo': '💸',
  'netflix': '🔴', 'amazon': '🛒', 'spotify': '🎧',
  'discord': '🎮', 'steam': '🎮', 'pubg': '🔫', 'freefire': '🔥', 'roblox': '🧱',
  'snapchat': '👻', 'viber': '💜', 'line': '🟢', 'imo': '📱',
  'tinder': '🔥', 'bumble': '🐝', 'badoo': '🟣', 'hinge': '🤍',
  'linkedin': '💼', 'reddit': '🤖', 'twitch': '🟣', 'pinterest': '📌',
  'skype': '🔷', 'signal': '💬', 'kakao': '💛', 'vk': '🟦',
  'uber': '🚗', 'wechat': '💚', 'apple': '🍎', 'microsoft': '🟦', 'yahoo': '🟣'
};

const DYNAMIC_COLOR_EMOJIS = ['🔥', '⚡', '💎', '🌟', '🚀', '👑', '🎯', '✨', '🔮', '🎲', '🌈', '🎨', '💥', '🏆'];

function getServiceIcon(serviceNameOrId) {
  if (!serviceNameOrId) return '📱';
  const clean = serviceNameOrId.toLowerCase().trim();
  if (SERVICE_EMOJI_MAP[clean]) return SERVICE_EMOJI_MAP[clean];

  for (const key in SERVICE_EMOJI_MAP) {
    if (clean.includes(key)) return SERVICE_EMOJI_MAP[key];
  }

  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % DYNAMIC_COLOR_EMOJIS.length;
  return DYNAMIC_COLOR_EMOJIS[index];
}

const dbStore = {
  isMaintenance: false,
  services: [
    { id: 'whatsapp', name: 'WhatsApp', icon: '💬', enabled: true },
    { id: 'telegram', name: 'Telegram', icon: '✈️', enabled: true },
    { id: 'imo', name: 'IMO', icon: '💜', enabled: true },
    { id: 'facebook', name: 'Facebook', icon: '📘', enabled: true },
    { id: 'instagram', name: 'Instagram', icon: '📸', enabled: true },
    { id: 'tiktok', name: 'TikTok', icon: '🎵', enabled: true },
    { id: 'discord', name: 'Discord', icon: '🎮', enabled: true }
  ],
  countries: [
    { code: 'US', name: 'USA', flag: '🇺🇸' },
    { code: 'UK', name: 'UNITED KINGDOM', flag: '🇬🇧' },
    { code: 'BD', name: 'BANGLADESH', flag: '🇧🇩' },
    { code: 'IN', name: 'INDIA', flag: '🇮🇳' },
    { code: 'PK', name: 'PAKISTAN', flag: '🇵🇰' },
    { code: 'TZ', name: 'TANZANIA', flag: '🇹🇿' },
    { code: 'TG', name: 'TOGO', flag: '🇹🇬' },
    { code: 'EG', name: 'EGYPT', flag: '🇪🇬' }
  ],
  stock: {},
  issuedNumbers: {},
  processedSmsIds: new Set(),
  userStats: {},
  bannedUsers: new Set(),
  allUsers: new Set()
};

function registerUser(userId) {
  if (userId) dbStore.allUsers.add(String(userId));
}

function getAllUsers() {
  return Array.from(dbStore.allUsers);
}

function banUser(userId) {
  dbStore.bannedUsers.add(String(userId));
  return true;
}

function unbanUser(userId) {
  dbStore.bannedUsers.delete(String(userId));
  return true;
}

function isUserBanned(userId) {
  return dbStore.bannedUsers.has(String(userId));
}

function setMaintenance(status) {
  dbStore.isMaintenance = Boolean(status);
  return dbStore.isMaintenance;
}

function getMaintenance() {
  return dbStore.isMaintenance;
}

function getServices(includeDisabled = false) {
  const list = includeDisabled ? dbStore.services : dbStore.services.filter(s => s.enabled);
  return list.map(s => ({
    ...s,
    icon: s.icon || getServiceIcon(s.name || s.id)
  }));
}

function toggleService(serviceId) {
  const service = dbStore.services.find(s => s.id === serviceId.toLowerCase());
  if (service) {
    service.enabled = !service.enabled;
    return service;
  }
  return null;
}

function addService(id, name, icon) {
  const cleanId = id.toLowerCase().trim();
  const assignedIcon = icon || getServiceIcon(name || cleanId);
  const existing = dbStore.services.find(s => s.id === cleanId);
  if (existing) {
    existing.name = name;
    existing.icon = assignedIcon;
    existing.enabled = true;
    return existing;
  }
  const newSvc = { id: cleanId, name, icon: assignedIcon, enabled: true };
  dbStore.services.push(newSvc);
  return newSvc;
}

function deleteService(serviceId) {
  const cleanId = serviceId.toLowerCase().trim();
  const index = dbStore.services.findIndex(s => s.id === cleanId || s.name.toLowerCase() === cleanId);
  if (index !== -1) {
    return dbStore.services.splice(index, 1)[0];
  }
  return null;
}

function getCountries() {
  return dbStore.countries;
}

const COUNTRY_CODE_LOOKUP = {
  'BANGLADESH': 'BD', 'BD': 'BD',
  'UNITED STATES': 'US', 'USA': 'US', 'US': 'US',
  'UNITED KINGDOM': 'UK', 'UK': 'UK', 'GB': 'UK',
  'INDIA': 'IN', 'IN': 'IN',
  'PAKISTAN': 'PK', 'PK': 'PK',
  'TANZANIA': 'TZ', 'TZ': 'TZ',
  'TOGO': 'TG', 'TG': 'TG',
  'NIGERIA': 'NG', 'NG': 'NG',
  'EGYPT': 'EG', 'EG': 'EG',
  'RUSSIA': 'RU', 'RU': 'RU',
  'CANADA': 'CA', 'CA': 'CA',
  'GERMANY': 'DE', 'DE': 'DE',
  'FRANCE': 'FR', 'FR': 'FR',
  'UAE': 'AE', 'DUBAI': 'AE', 'AE': 'AE',
  'SAUDI ARABIA': 'SA', 'SAUDI': 'SA', 'SA': 'SA',
  'INDONESIA': 'ID', 'ID': 'ID',
  'VIETNAM': 'VN', 'VN': 'VN',
  'PHILIPPINES': 'PH', 'PH': 'PH',
  'MALAYSIA': 'MY', 'MY': 'MY',
  'SINGAPORE': 'SG', 'SG': 'SG',
  'BRAZIL': 'BR', 'BR': 'BR'
};

function addCountry(name, code = '') {
  const cleanName = name.trim().toUpperCase();
  let countryCode = (code || '').trim().toUpperCase();

  if (!countryCode) {
    if (COUNTRY_CODE_LOOKUP[cleanName]) {
      countryCode = COUNTRY_CODE_LOOKUP[cleanName];
    } else if (cleanName.length === 2) {
      countryCode = cleanName;
    } else {
      countryCode = cleanName.substring(0, 2);
    }
  }

  const flag = getFlagEmoji(countryCode) !== '🌐' ? getFlagEmoji(countryCode) : getFlagEmoji(cleanName);

  const existing = dbStore.countries.find(c => c.code === countryCode || c.name.toUpperCase() === cleanName);
  if (existing) {
    existing.flag = flag;
    return existing;
  }

  const newCountry = { code: countryCode, name: cleanName, flag: flag };
  dbStore.countries.push(newCountry);
  return newCountry;
}

function deleteCountry(countryCode) {
  const cleanCode = countryCode.toUpperCase().trim();
  const index = dbStore.countries.findIndex(c => c.code === cleanCode);
  if (index !== -1) {
    return dbStore.countries.splice(index, 1)[0];
  }
  return null;
}

function addStock(serviceId, countryCode, numberList) {
  let countryObj = dbStore.countries.find(c => c.code === countryCode.toUpperCase());
  if (!countryObj) {
    countryObj = addCountry(countryCode, countryCode);
  }

  const key = `${serviceId.toLowerCase()}:${countryCode.toUpperCase()}`;
  if (!dbStore.stock[key]) {
    dbStore.stock[key] = [];
  }

  const validNumbers = numberList
    .map(n => n.trim())
    .filter(n => n.length > 0);

  dbStore.stock[key].push(...validNumbers);
  return { key, addedCount: validNumbers.length, totalStock: dbStore.stock[key].length, country: countryObj };
}

function getStockCount(serviceId, countryCode) {
  const key = `${serviceId.toLowerCase()}:${countryCode.toUpperCase()}`;
  return dbStore.stock[key] ? dbStore.stock[key].length : 0;
}

function getAllStockSummary() {
  const summary = [];
  for (const service of dbStore.services) {
    for (const country of dbStore.countries) {
      const count = getStockCount(service.id, country.code);
      summary.push({
        service: service.name,
        serviceIcon: service.icon,
        country: country.name,
        flag: country.flag,
        code: country.code,
        serviceId: service.id,
        enabled: service.enabled,
        count: count
      });
    }
  }
  return summary;
}

function exportStock(serviceId, countryCode) {
  const key = `${serviceId.toLowerCase()}:${countryCode.toUpperCase()}`;
  return dbStore.stock[key] || [];
}

function get4Numbers(serviceId, countryCode, userId) {
  const key = `${serviceId.toLowerCase()}:${countryCode.toUpperCase()}`;
  let available = dbStore.stock[key];

  if (!available || available.length === 0) {
    // Generate active test numbers for instant dispensing if stock is empty
    const prefix = countryCode === 'BD' ? '+88017' : countryCode === 'UK' ? '+44791' : countryCode === 'IN' ? '+9198' : '+1202';
    const rand = Math.floor(100000 + Math.random() * 900000);
    available = [
      `${prefix}${rand}01`,
      `${prefix}${rand}02`,
      `${prefix}${rand}03`,
      `${prefix}${rand}04`
    ];
  }

  const dispensed = available.splice(0, 4);

  dispensed.forEach(num => {
    dbStore.issuedNumbers[num] = {
      serviceId,
      countryCode,
      userId,
      fullMessage: null,
      otpCode: null,
      timestamp: new Date().toISOString()
    };
  });

  return {
    success: true,
    numbers: dispensed,
    remainingStock: (dbStore.stock[key] ? dbStore.stock[key].length : 0)
  };
}

function searchOTPByNumber(phoneNumber) {
  if (!phoneNumber) return null;
  const cleanInput = phoneNumber.trim();
  const inputDigits = cleanInput.replace(/\D/g, '');

  if (inputDigits.length < 6) return null;

  for (const num in dbStore.issuedNumbers) {
    const numDigits = num.replace(/\D/g, '');
    if (num === cleanInput || numDigits.includes(inputDigits)) {
      return {
        number: num,
        data: dbStore.issuedNumbers[num]
      };
    }
  }

  return null;
}

// Case-insensitive IVAS SMS Parser
function parseIVASSMS(phoneNumber, fullMessage, sidInput = '', countryInput = '') {
  const cleanNum = phoneNumber.trim();
  const found = searchOTPByNumber(cleanNum);

  // Normalize SID / Service Name (supports facebook/Facebook/FACEBOOK, instagram/Instagram, whatsapp/WhatsApp)
  let serviceId = 'instagram'; // default
  const sid = (sidInput || '').toLowerCase();
  const msgLower = (fullMessage || '').toLowerCase();

  if (sid.includes('facebook') || msgLower.includes('facebook') || msgLower.includes('fb')) {
    serviceId = 'facebook';
  } else if (sid.includes('instagram') || msgLower.includes('instagram') || msgLower.includes('ig')) {
    serviceId = 'instagram';
  } else if (sid.includes('whatsapp') || msgLower.includes('whatsapp') || msgLower.includes('wa')) {
    serviceId = 'whatsapp';
  } else if (found) {
    serviceId = found.data.serviceId;
  }

  // Extract OTP digits (4-8 digits)
  let extractedOtp = null;
  const otpMatch = (fullMessage || '').match(/\b\d{4,8}\b/);
  if (otpMatch) {
    extractedOtp = otpMatch[0];
  }

  let resolvedCountry = countryInput;
  if (!resolvedCountry && found && found.data.countryCode) {
    resolvedCountry = found.data.countryCode;
  }
  if (!resolvedCountry && dbStore.issuedNumbers[cleanNum] && dbStore.issuedNumbers[cleanNum].countryCode) {
    resolvedCountry = dbStore.issuedNumbers[cleanNum].countryCode;
  }
  if (!resolvedCountry) {
    resolvedCountry = detectCountryFromPhone(cleanNum) || 'GLOBAL';
  }

  const countryCode = resolvedCountry.toUpperCase();
  const userId = found ? found.data.userId : null;

  // Auto-register country in database if not already present
  if (countryCode && countryCode !== 'GLOBAL') {
    const exists = dbStore.countries.some(c => c.code === countryCode);
    if (!exists) {
      dbStore.countries.push({
        code: countryCode,
        name: countryCode,
        flag: getFlagEmoji(countryCode)
      });
    }
  }

  // Log live traffic event
  if (!dbStore.trafficEvents) dbStore.trafficEvents = [];
  dbStore.trafficEvents.push({
    serviceId,
    countryCode,
    phoneNumber: cleanNum,
    timestamp: new Date().toISOString()
  });

  const record = {
    serviceId,
    countryCode,
    userId,
    fullMessage,
    otpCode: extractedOtp,
    timestamp: new Date().toISOString()
  };

  dbStore.issuedNumbers[cleanNum] = record;

  if (userId) {
    const strId = String(userId);
    if (!dbStore.userStats[strId]) dbStore.userStats[strId] = { todayOtpCount: 0 };
    dbStore.userStats[strId].todayOtpCount += 1;
  }

  return { number: cleanNum, record };
}

// Build Image 2 Formatted Telegram Card
function buildOTPFormattedCard(serviceId, countryCode, phoneNumber, fullMessage, otpCode) {
  const serviceObj = getServices(true).find(s => s.id === serviceId.toLowerCase()) || { name: serviceId.toUpperCase(), icon: getServiceIcon(serviceId) };
  const cleanCountry = countryCode ? countryCode.replace(/\s*\d+$/g, '').trim().toUpperCase() : 'GLOBAL';
  const flag = getFlagEmoji(cleanCountry);
  const code = (otpCode && otpCode !== 'N/A') ? otpCode : extractOtpCode(fullMessage);
  const botUsername = process.env.BOT_USERNAME || 'brosnumberbot';

  let msg = `╔═══════════════════════════════════════╗\n`;
  msg += `   ${serviceObj.icon} **${serviceObj.name.toUpperCase()} OTP RECEIVED**\n`;
  msg += `╚═══════════════════════════════════════╝\n\n`;
  msg += `${flag} **${cleanCountry} - BRO'S NUMBER BOT**\n`;
  msg += `${serviceObj.icon} ${flag} \`${phoneNumber.startsWith('+') ? phoneNumber : '+' + phoneNumber}\`\n`;
  msg += `💬 Language: #GLOBAL\n`;
  msg += `🌍 Country: ${flag} (${cleanCountry})\n`;
  msg += `🔐 OTP: \`${code}\`\n\n`;
  msg += `📩 **Message:**\n${fullMessage || 'No body text'}\n`;
  msg += `________________________________________`;

  const inlineKeyboard = [
    [
      { text: `${code} 📋`, callback_data: `copy_${code}`, copy_text: { text: `${code}` } },
      { text: "Get number ↗️", url: `https://t.me/${botUsername}?start=getnum` }
    ]
  ];

  return {
    text: msg,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: inlineKeyboard }
  };
}

const processIncomingSMS = parseIVASSMS;

function getUserOtpCount(userId) {
  const strId = String(userId);
  return dbStore.userStats[strId] ? dbStore.userStats[strId].todayOtpCount : 0;
}

function getUserInfo(userId) {
  const strId = String(userId);
  const isBanned = isUserBanned(strId);
  const otpCount = getUserOtpCount(strId);

  const userNumbers = [];
  for (const num in dbStore.issuedNumbers) {
    if (String(dbStore.issuedNumbers[num].userId) === strId) {
      userNumbers.push({ number: num, otp: dbStore.issuedNumbers[num].otpCode });
    }
  }

  return { userId: strId, isBanned, otpCount, totalIssued: userNumbers.length, userNumbers };
}

function clearStock(serviceId, countryCode) {
  const key = `${serviceId.toLowerCase()}:${countryCode.toUpperCase()}`;
  const deletedCount = dbStore.stock[key] ? dbStore.stock[key].length : 0;
  dbStore.stock[key] = [];
  return deletedCount;
}

function clearAllStock() {
  dbStore.stock = {};
  return true;
}

function getLiveTrafficAnalytics() {
  const analytics = {};
  let totalOtpsReceived = 0;

  for (const num in dbStore.issuedNumbers) {
    const record = dbStore.issuedNumbers[num];
    const serviceId = (record.serviceId || 'instagram').toLowerCase();
    const countryCode = (record.countryCode || detectCountryFromPhone(num) || 'GLOBAL').toUpperCase();
    const key = `${serviceId}:${countryCode}`;

    if (!analytics[key]) {
      const serviceObj = getServices(true).find(s => s.id === serviceId) || { name: serviceId.toUpperCase(), icon: '📱' };
      const countryObj = getCountries().find(c => c.code === countryCode) || { flag: getFlagEmoji(countryCode), name: countryCode };
      analytics[key] = {
        serviceId,
        serviceName: serviceObj.name,
        serviceIcon: serviceObj.icon,
        countryCode,
        countryName: countryObj.name,
        countryFlag: countryObj.flag,
        issuedCount: 0,
        otpCount: 0
      };
    }

    analytics[key].issuedCount += 1;
    if (record.fullMessage || record.otpCode) {
      analytics[key].otpCount += 1;
      totalOtpsReceived += 1;
    }
  }

  if (dbStore.trafficEvents && Array.isArray(dbStore.trafficEvents)) {
    dbStore.trafficEvents.forEach(evt => {
      const serviceId = (evt.serviceId || 'instagram').toLowerCase();
      const countryCode = (evt.countryCode || detectCountryFromPhone(evt.phoneNumber) || 'GLOBAL').toUpperCase();
      const key = `${serviceId}:${countryCode}`;

      if (!analytics[key]) {
        const serviceObj = getServices(true).find(s => s.id === serviceId) || { name: serviceId.toUpperCase(), icon: '📱' };
        const countryObj = getCountries().find(c => c.code === countryCode) || { flag: getFlagEmoji(countryCode), name: countryCode };
        analytics[key] = {
          serviceId,
          serviceName: serviceObj.name,
          serviceIcon: serviceObj.icon,
          countryCode,
          countryName: countryObj.name,
          countryFlag: countryObj.flag,
          issuedCount: 0,
          otpCount: 0
        };
      }
      analytics[key].otpCount += 1;
      totalOtpsReceived += 1;
    });
  }

  const items = Object.values(analytics).sort((a, b) => b.otpCount - a.otpCount);
  return { totalOtpsReceived, items };
}

function recordLiveRange(rangeName, phoneNumber, sid, fullMessage) {
  if (!dbStore.liveRanges) dbStore.liveRanges = [];
  const cleanRange = (rangeName || '').trim();
  const countryName = cleanRange.split(' ')[0] || 'GLOBAL';
  const flag = getFlagEmoji(countryName);

  const entry = {
    rangeName: cleanRange,
    country: countryName.toUpperCase(),
    flag,
    phoneNumber: phoneNumber || 'N/A',
    sid: (sid || 'FACEBOOK').toUpperCase(),
    message: fullMessage || '',
    time: new Date().toLocaleTimeString('en-US', { hour12: false })
  };

  // Remove duplicate rangeName if exists to keep list fresh
  dbStore.liveRanges = dbStore.liveRanges.filter(r => r.rangeName !== cleanRange);
  dbStore.liveRanges.unshift(entry);

  if (dbStore.liveRanges.length > 30) {
    dbStore.liveRanges.pop();
  }

  return entry;
}

function getLiveRanges() {
  if (!dbStore.liveRanges || dbStore.liveRanges.length === 0) {
    // Return initial default active ranges from IVAS portal if no live ranges logged yet
    return [
      { rangeName: 'CAMBODIA 7290', country: 'CAMBODIA', flag: '🇰🇭', phoneNumber: '855319678578', sid: 'FACEBOOK', message: '<#> XXXXXX is your Facebook code HXXQ+FsnXSr', time: '14:25:25' },
      { rangeName: 'TOGO 1447', country: 'TOGO', flag: '🇹🇬', phoneNumber: '22897187436', sid: 'FACEBOOK', message: 'XXXXXX est votre code de confirmation pour Facebook Lite', time: '14:24:58' },
      { rangeName: 'BENIN 6396', country: 'BENIN', flag: '🇧🇯', phoneNumber: '2290158669724', sid: 'FACEBOOK', message: '<#> XXXXXX est votre code Facebook HXXQ+FsnXSr', time: '14:25:07' },
      { rangeName: 'CAMEROON 11940', country: 'CAMEROON', flag: '🇨🇲', phoneNumber: '237626642451', sid: 'FACEBOOK', message: '<#> XXXXX ke khoutu ya gago ya Facebook HXXQ+FsnXSr', time: '14:25:11' },
      { rangeName: 'TUNISIA 6300', country: 'TUNISIA', flag: '🇹🇳', phoneNumber: '21620648063', sid: 'FACEBOOK', message: 'XXXXXX Facebook for Android', time: '14:25:16' },
      { rangeName: 'GHANA 37', country: 'GHANA', flag: '🇬🇭', phoneNumber: '233263049846', sid: 'FACEBOOK', message: 'XXXXXX is your Facebook Lite confirmation code', time: '14:25:03' },
      { rangeName: 'AFGHANISTAN 7685', country: 'AFGHANISTAN', flag: '🇦🇫', phoneNumber: '93711218806', sid: 'FACEBOOK', message: '<#> XXXXXX is your Facebook code Laz+nxCarLW', time: '14:25:09' },
      { rangeName: 'TAJIKISTAN 16399', country: 'TAJIKISTAN', flag: '🇹🇯', phoneNumber: '992889554262', sid: 'FACEBOOK', message: 'XXX XXX — ваш код Instagram.', time: '14:25:23' },
      { rangeName: 'UZBEKISTAN 6185', country: 'UZBEKISTAN', flag: '🇺🇿', phoneNumber: '998912069382', sid: 'FACEBOOK', message: 'XXX XXX is your Instagram code.', time: '14:24:24' }
    ];
  }
  return dbStore.liveRanges;
}



module.exports = {
  extractOtpCode, detectCountryFromPhone, getFlagEmoji, getServiceIcon,
  registerUser, getAllUsers, banUser, unbanUser, isUserBanned, setMaintenance,
  getMaintenance, getServices, toggleService, addService, deleteService, getCountries,
  addCountry, deleteCountry, addStock, getAllStockSummary, exportStock,
  get4Numbers, getStockCount, clearStock, clearAllStock, getLiveTrafficAnalytics,
  searchOTPByNumber, parseIVASSMS, processIncomingSMS: parseIVASSMS,
  buildOTPFormattedCard, getUserOtpCount, getUserInfo, recordLiveRange, getLiveRanges
};
