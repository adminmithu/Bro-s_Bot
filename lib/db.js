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
  'BJ': '🇧🇯', 'BENIN': '🇧🇯',
  'KH': '🇰🇭', 'CAMBODIA': '🇰🇭',
  'SD': '🇸🇩', 'SUDAN': '🇸🇩',
  'AF': '🇦🇫', 'AFGHANISTAN': '🇦🇫',
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
  'TR': '🇹🇷', 'TURKEY': '🇹🇷',
  'ET': '🇪🇹', 'ETHIOPIA': '🇪🇹',
  'JP': '🇯🇵', 'JAPAN': '🇯🇵',
  'KR': '🇰🇷', 'KOREA': '🇰🇷', 'SOUTH KOREA': '🇰🇷',
  'CN': '🇨🇳', 'CHINA': '🇨🇳',
  'HK': '🇭🇰', 'HONG KONG': '🇭🇰',
  'TW': '🇹🇼', 'TAIWAN': '🇹🇼',
  'NL': '🇳🇱', 'NETHERLANDS': '🇳🇱',
  'SE': '🇸🇪', 'SWEDEN': '🇸🇪',
  'NO': '🇳🇴', 'NORWAY': '🇳🇴',
  'FI': '🇫🇮', 'FINLAND': '🇫🇮',
  'DK': '🇩🇰', 'DENMARK': '🇩🇰',
  'CH': '🇨🇭', 'SWITZERLAND': '🇨🇭',
  'AT': '🇦🇹', 'AUSTRIA': '🇦🇹',
  'BE': '🇧🇪', 'BELGIUM': '🇧🇪',
  'PT': '🇵🇹', 'PORTUGAL': '🇵🇹',
  'GR': '🇬🇷', 'GREECE': '🇬🇷',
  'RO': '🇷🇴', 'ROMANIA': '🇷🇴',
  'HU': '🇭🇺', 'HUNGARY': '🇭🇺',
  'CZ': '🇨🇿', 'CZECHIA': '🇨🇿', 'CZECH REPUBLIC': '🇨🇿',
  'IE': '🇮🇪', 'IRELAND': '🇮🇪',
  'CL': '🇨🇱', 'CHILE': '🇨🇱',
  'PE': '🇵🇪', 'PERU': '🇵🇪',
  'VE': '🇻🇪', 'VENEZUELA': '🇻🇪',
  'EC': '🇪🇨', 'ECUADOR': '🇪🇨',
  'PY': '🇵🇾', 'PARAGUAY': '🇵🇾',
  'UY': '🇺🇾', 'URUGUAY': '🇺🇾',
  'BO': '🇧🇴', 'BOLIVIA': '🇧🇴',
  'IQ': '🇮🇶', 'IRAQ': '🇮🇶',
  'IR': '🇮🇷', 'IRAN': '🇮🇷',
  'JO': '🇯🇴', 'JORDAN': '🇯🇴',
  'LB': '🇱🇧', 'LEBANON': '🇱🇧',
  'SY': '🇸🇾', 'SYRIA': '🇸🇾',
  'YE': '🇾🇪', 'YEMEN': '🇾🇪',
  'OM': '🇴🇲', 'OMAN': '🇴🇲',
  'QA': '🇶🇦', 'QATAR': '🇶🇦',
  'BH': '🇧🇭', 'BAHRAIN': '🇧🇭',
  'UZ': '🇺🇿', 'UZBEKISTAN': '🇺🇿',
  'KG': '🇰🇬', 'KYRGYZSTAN': '🇰🇬',
  'TJ': '🇹🇯', 'TAJIKISTAN': '🇹🇯',
  'TM': '🇹🇲', 'TURKMENISTAN': '🇹🇲',
  'AM': '🇦🇲', 'ARMENIA': '🇦🇲',
  'AZ': '🇦🇿', 'AZERBAIJAN': '🇦🇿',
  'GE': '🇬🇪', 'GEORGIA': '🇬🇪',
  'BY': '🇧🇾', 'BELARUS': '🇧🇾',
  'MD': '🇲🇩', 'MOLDOVA': '🇲🇩',
  'CM': '🇨🇲', 'CAMEROON': '🇨🇲',
  'CI': '🇨🇮', 'IVORY COAST': '🇨🇮',
  'SN': '🇸🇳', 'SENEGAL': '🇸🇳',
  'AO': '🇦🇴', 'ANGOLA': '🇦🇴',
  'ZM': '🇿🇲', 'ZAMBIA': '🇿🇲',
  'ZW': '🇿🇼', 'ZIMBABWE': '🇿🇼',
  'MZ': '🇲🇿', 'MOZAMBIQUE': '🇲🇿',
  'CD': '🇨🇩', 'CONGO': '🇨🇩',
  'MG': '🇲🇬', 'MADAGASCAR': '🇲🇬',
  'ML': '🇲🇱', 'MALI': '🇲🇱',
  'GN': '🇬🇳', 'GUINEA': '🇬🇳',
  'AL': '🇦🇱', 'ALBANIA': '🇦🇱',
  'AD': '🇦🇩', 'ANDORRA': '🇦🇩',
  'AG': '🇦🇬', 'ANTIGUA': '🇦🇬',
  'AU': '🇦🇺', 'AUSTRALIA': '🇦🇺',
  'BS': '🇧🇸', 'BAHAMAS': '🇧🇸',
  'BB': '🇧🇧', 'BARBADOS': '🇧🇧',
  'BZ': '🇧🇿', 'BELIZE': '🇧🇿',
  'BT': '🇧🇹', 'BHUTAN': '🇧🇹',
  'BW': '🇧🇼', 'BOTSWANA': '🇧🇼',
  'BN': '🇧🇳', 'BRUNEI': '🇧🇳',
  'BG': '🇧🇬', 'BULGARIA': '🇧🇬',
  'BF': '🇧🇫', 'BURKINA FASO': '🇧🇫',
  'CV': '🇨🇻', 'CAPE VERDE': '🇨🇻',
  'CF': '🇨🇫', 'CENTRAL AFRICA': '🇨🇫',
  'TD': '🇹🇩', 'CHAD': '🇹🇩',
  'CR': '🇨🇷', 'COSTA RICA': '🇨🇷',
  'HR': '🇭🇷', 'CROATIA': '🇭🇷',
  'CU': '🇨🇺', 'CUBA': '🇨🇺',
  'CY': '🇨🇾', 'CYPRUS': '🇨🇾',
  'DJ': '🇩🇯', 'DJIBOUTI': '🇩🇯',
  'DM': '🇩🇲', 'DOMINICA': '🇩🇲',
  'DO': '🇩🇴', 'DOMINICAN REPUBLIC': '🇩🇴',
  'SV': '🇸🇻', 'EL SALVADOR': '🇸🇻',
  'GQ': '🇬🇶', 'EQUATORIAL GUINEA': '🇬🇶',
  'ER': '🇪🇷', 'ERITREA': '🇪🇷',
  'EE': '🇪🇪', 'ESTONIA': '🇪🇪',
  'FJ': '🇫🇯', 'FIJI': '🇫🇯',
  'GA': '🇬🇦', 'GABON': '🇬🇦',
  'GM': '🇬🇲', 'GAMBIA': '🇬🇲',
  'GD': '🇬🇩', 'GRENADA': '🇬🇩',
  'GT': '🇬🇹', 'GUATEMALA': '🇬🇹',
  'GW': '🇬🇼', 'GUINEA BISSAU': '🇬🇼',
  'GY': '🇬🇾', 'GUYANA': '🇬🇾',
  'HT': '🇭🇹', 'HAITI': '🇭🇹',
  'HN': '🇭🇳', 'HONDURAS': '🇭🇳',
  'IS': '🇮🇸', 'ICELAND': '🇮🇸',
  'JM': '🇯🇲', 'JAMAICA': '🇯🇲',
  'LA': '🇱🇦', 'LAOS': '🇱🇦',
  'LV': '🇱🇻', 'LATVIA': '🇱🇻',
  'LS': '🇱🇸', 'LESOTHO': '🇱🇸',
  'LR': '🇱🇷', 'LIBERIA': '🇱🇷',
  'LY': '🇱🇾', 'LIBYA': '🇱🇾',
  'LI': '🇱🇮', 'LIECHTENSTEIN': '🇱🇮',
  'LT': '🇱🇹', 'LITHUANIA': '🇱🇹',
  'LU': '🇱🇺', 'LUXEMBOURG': '🇱🇺',
  'MK': '🇲🇰', 'MACEDONIA': '🇲🇰',
  'MW': '🇲🇼', 'MALAWI': '🇲🇼',
  'MV': '🇲🇻', 'MALDIVES': '🇲🇻',
  'MT': '🇲🇹', 'MALTA': '🇲🇹',
  'MR': '🇲🇷', 'MAURITANIA': '🇲🇷',
  'MU': '🇲🇺', 'MAURITIUS': '🇲🇺',
  'FM': '🇫🇲', 'MICRONESIA': '🇫🇲',
  'MC': '🇲🇨', 'MONACO': '🇲🇨',
  'MN': '🇲🇳', 'MONGOLIA': '🇲🇳',
  'ME': '🇲🇪', 'MONTENEGRO': '🇲🇪',
  'MM': '🇲🇲', 'MYANMAR': '🇲🇲',
  'NA': '🇳🇦', 'NAMIBIA': '🇳🇦',
  'NZ': '🇳🇿', 'NEW ZEALAND': '🇳🇿',
  'NI': '🇳🇮', 'NICARAGUA': '🇳🇮',
  'NE': '🇳🇪', 'NIGER': '🇳🇪',
  'PA': '🇵🇦', 'PANAMA': '🇵🇦',
  'PG': '🇵🇬', 'PAPUA NEW GUINEA': '🇵🇬',
  'PR': '🇵🇷', 'PUERTO RICO': '🇵🇷',
  'RW': '🇷🇼', 'RWANDA': '🇷🇼',
  'WS': '🇼🇸', 'SAMOA': '🇼🇸',
  'SM': '🇸🇲', 'SAN MARINO': '🇸🇲',
  'RS': '🇷🇸', 'SERBIA': '🇷🇸',
  'SC': '🇸🇨', 'SEYCHELLES': '🇸🇨',
  'SL': '🇸🇱', 'SIERRA LEONE': '🇸🇱',
  'SK': '🇸🇰', 'SLOVAKIA': '🇸🇰',
  'SI': '🇸🇮', 'SLOVENIA': '🇸🇮',
  'SB': '🇸🇧', 'SOLOMON ISLANDS': '🇸🇧',
  'SO': '🇸🇴', 'SOMALIA': '🇸🇴',
  'SS': '🇸🇸', 'SOUTH SUDAN': '🇸🇸',
  'SR': '🇸🇷', 'SURINAME': '🇸🇷',
  'SZ': '🇸🇿', 'ESWATINI': '🇸🇿',
  'TJ': '🇹🇯', 'TAJIKISTAN': '🇹🇯',
  'TL': '🇹🇱', 'TIMOR': '🇹🇱',
  'TO': '🇹🇴', 'TONGA': '🇹🇴',
  'TT': '🇹🇹', 'TRINIDAD': '🇹🇹',
  'TM': '🇹🇲', 'TURKMENISTAN': '🇹🇲',
  'UZ': '🇺🇿', 'UZBEKISTAN': '🇺🇿',
  'VU': '🇻🇺', 'VANUATU': '🇻🇺',
  'VA': '🇻🇦', 'VATICAN': '🇻🇦'
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
    { code: 'US', name: 'USA', flag: '🇺🇸', enabled: true },
    { code: 'UK', name: 'UNITED KINGDOM', flag: '🇬🇧', enabled: true },
    { code: 'BD', name: 'BANGLADESH', flag: '🇧🇩', enabled: true },
    { code: 'IN', name: 'INDIA', flag: '🇮🇳', enabled: true },
    { code: 'PK', name: 'PAKISTAN', flag: '🇵🇰', enabled: true },
    { code: 'TZ', name: 'TANZANIA', flag: '🇹🇿', enabled: true },
    { code: 'TG', name: 'TOGO', flag: '🇹🇬', enabled: true },
    { code: 'EG', name: 'EGYPT', flag: '🇪🇬', enabled: true }
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
  if (!serviceId) return null;
  const cleanId = String(serviceId).toLowerCase().trim();
  const service = dbStore.services.find(s => s.id === cleanId || s.name.toLowerCase() === cleanId);
  if (service) {
    service.enabled = !service.enabled;
    return service;
  }
  return null;
}

function addService(id, name, icon) {
  if (!id) return null;
  const cleanId = String(id).toLowerCase().trim();
  const assignedIcon = icon || getServiceIcon(name || cleanId);
  const existing = dbStore.services.find(s => s.id === cleanId);
  if (existing) {
    existing.name = name || existing.name;
    existing.icon = assignedIcon;
    existing.enabled = true;
    return existing;
  }
  const newSvc = { id: cleanId, name: name || cleanId, icon: assignedIcon, enabled: true };
  dbStore.services.push(newSvc);
  return newSvc;
}

function deleteService(serviceId) {
  if (!serviceId) return null;
  const cleanId = String(serviceId).toLowerCase().trim();
  const index = dbStore.services.findIndex(s => s.id === cleanId || s.name.toLowerCase() === cleanId);
  if (index !== -1) {
    return dbStore.services.splice(index, 1)[0];
  }
  return null;
}

function clearAllServices() {
  dbStore.services = [];
  return true;
}

function clearAllCountries() {
  dbStore.countries = [];
  return true;
}

function toggleCountry(countryCode) {
  const cleanCode = (countryCode || '').toUpperCase().trim();
  const country = dbStore.countries.find(c => c.code === cleanCode || c.name.toUpperCase() === cleanCode);
  if (country) {
    country.enabled = country.enabled === false ? true : false;
    return country;
  }
  return null;
}

function getCountries(includeDisabled = false) {
  if (includeDisabled) return dbStore.countries;
  return dbStore.countries.filter(c => c.enabled !== false);
}

const COUNTRY_CODE_LOOKUP = {
  'BANGLADESH': 'BD', 'BD': 'BD',
  'UNITED STATES': 'US', 'USA': 'US', 'US': 'US',
  'UNITED KINGDOM': 'UK', 'UK': 'UK', 'GREAT BRITAIN': 'UK', 'GB': 'UK',
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
  'BRAZIL': 'BR', 'BR': 'BR',
  'ETHIOPIA': 'ET', 'ET': 'ET',
  'KENYA': 'KE', 'KE': 'KE',
  'UGANDA': 'UG', 'UG': 'UG',
  'GHANA': 'GH', 'GH': 'GH',
  'SOUTH AFRICA': 'ZA', 'ZA': 'ZA',
  'TURKEY': 'TR', 'TR': 'TR',
  'THAILAND': 'TH', 'TH': 'TH',
  'SPAIN': 'ES', 'ES': 'ES',
  'ITALY': 'IT', 'IT': 'IT',
  'MEXICO': 'MX', 'MX': 'MX',
  'COLOMBIA': 'CO', 'CO': 'CO',
  'ARGENTINA': 'AR', 'AR': 'AR',
  'JAPAN': 'JP', 'JP': 'JP',
  'KOREA': 'KR', 'SOUTH KOREA': 'KR', 'KR': 'KR',
  'CHINA': 'CN', 'CN': 'CN',
  'AUSTRALIA': 'AU', 'AU': 'AU',
  'NETHERLANDS': 'NL', 'NL': 'NL',
  'SWEDEN': 'SE', 'SE': 'SE',
  'NORWAY': 'NO', 'NO': 'NO',
  'FINLAND': 'FI', 'FI': 'FI',
  'DENMARK': 'DK', 'DK': 'DK',
  'SWITZERLAND': 'CH', 'CH': 'CH',
  'AUSTRIA': 'AT', 'AT': 'AT',
  'BELGIUM': 'BE', 'BE': 'BE',
  'PORTUGAL': 'PT', 'PT': 'PT',
  'GREECE': 'GR', 'GR': 'GR',
  'POLAND': 'PL', 'PL': 'PL',
  'UKRAINE': 'UA', 'UA': 'UA',
  'MOROCCO': 'MA', 'MA': 'MA',
  'ALGERIA': 'DZ', 'DZ': 'DZ',
  'TUNISIA': 'TN', 'TN': 'TN',
  'KUWAIT': 'KW', 'KW': 'KW',
  'QATAR': 'QA', 'QA': 'QA',
  'OMAN': 'OM', 'OM': 'OM',
  'IRAQ': 'IQ', 'IQ': 'IQ',
  'IRAN': 'IR', 'IR': 'IR',
  'AFGHANISTAN': 'AF', 'AF': 'AF',
  'SRI LANKA': 'LK', 'LK': 'LK',
  'NEPAL': 'NP', 'NP': 'NP'
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

  const newCountry = { code: countryCode, name: cleanName, flag: flag, enabled: true };
  dbStore.countries.push(newCountry);
  return newCountry;
}

function deleteCountry(countryCode) {
  if (!countryCode) return null;
  const cleanCode = String(countryCode).toUpperCase().trim();
  const index = dbStore.countries.findIndex(c => c.code === cleanCode || c.name.toUpperCase() === cleanCode);
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
  if (!serviceId || !countryCode) {
    return getViewStocksReport();
  }
  const key = `${serviceId.toLowerCase()}:${countryCode.toUpperCase()}`;
  return dbStore.stock[key] || [];
}

function getViewStocksReport() {
  const services = getServices(true);
  const countries = getCountries(true);

  let totalAvailableStock = 0;
  let totalIssuedNumbers = Object.keys(dbStore.issuedNumbers).length;
  let totalOtpsReceived = 0;

  for (const num in dbStore.issuedNumbers) {
    if (dbStore.issuedNumbers[num].otpCode || dbStore.issuedNumbers[num].fullMessage) {
      totalOtpsReceived++;
    }
  }

  const breakdown = [];

  for (const s of services) {
    for (const c of countries) {
      const key = `${s.id.toLowerCase()}:${c.code.toUpperCase()}`;
      const stockArr = dbStore.stock[key] || [];
      const stockCount = stockArr.length;
      totalAvailableStock += stockCount;

      let issuedCount = 0;
      let otpCount = 0;

      for (const num in dbStore.issuedNumbers) {
        const item = dbStore.issuedNumbers[num];
        if (item.serviceId?.toLowerCase() === s.id.toLowerCase() && item.countryCode?.toUpperCase() === c.code.toUpperCase()) {
          issuedCount++;
          if (item.otpCode || item.fullMessage) {
            otpCount++;
          }
        }
      }

      if (stockCount > 0 || issuedCount > 0 || otpCount > 0) {
        breakdown.push({
          serviceId: s.id,
          serviceName: s.name,
          serviceIcon: s.icon || getServiceIcon(s.name),
          countryName: c.name,
          countryFlag: c.flag || getFlagEmoji(c.code),
          countryCode: c.code,
          stockCount,
          issuedCount,
          otpCount
        });
      }
    }
  }

  return {
    totalAvailableStock,
    totalIssuedNumbers,
    totalOtpsReceived,
    breakdown
  };
}

function get4Numbers(serviceId, countryCode, userId) {
  const key = `${serviceId.toLowerCase()}:${countryCode.toUpperCase()}`;
  let available = dbStore.stock[key];

  if (!available || available.length === 0) {
    return {
      success: false,
      numbers: [],
      remainingStock: 0,
      message: "Out of stock!"
    };
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
    remainingStock: dbStore.stock[key].length
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
      { text: `${code} 📋`, callback_data: `copy_${code}`, copy_text: { text: `${code}` }, style: "success" },
      { text: "Get number ↗️", url: `https://t.me/${botUsername}?start=getnum`, style: "primary" }
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

function getLiveRanges(serviceId) {
  const list = dbStore.liveRanges || [];
  if (!serviceId || serviceId === 'all') return list;
  const cleanSvc = serviceId.toLowerCase().trim();
  return list.filter(r => (r.sid || '').toLowerCase().includes(cleanSvc) || cleanSvc.includes((r.sid || '').toLowerCase()));
}



function buildStockAddedCard(countryName, countryCode, count) {
  const flag = getFlagEmoji(countryCode) !== '🌐' ? getFlagEmoji(countryCode) : getFlagEmoji(countryName);
  const cleanCountry = (countryName || countryCode || 'GLOBAL').toUpperCase();

  let cardText = `╔═══════════════════════════════════════╗\n`;
  cardText += `   🚀 **NEW NUMBERS ADDED TO STOCK!** 🚀\n`;
  cardText += `╚═══════════════════════════════════════╝\n\n`;
  cardText += `🌐 **Country:** ${flag} **${cleanCountry}** (${countryCode}) ${flag}\n`;
  cardText += `📊 **Total Added Numbers:** \`${count}\`\n\n`;
  cardText += `🔥 **সবাই কোপানো শুরু করেন কোড আসবে ১০০ ১০০!** 🔥\n\n`;
  cardText += `⚡ _Bro's Number Bot — Grab numbers now!_\n`;
  cardText += `________________________________________`;

  return {
    text: cardText,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📲 Get Number ↗️", url: "https://t.me/brosnumberbot?start=getnum" },
          { text: "💬 Support 👨‍💻", url: "https://t.me/Prime90999" }
        ]
      ]
    }
  };
}

module.exports = {
  extractOtpCode, detectCountryFromPhone, getFlagEmoji, getServiceIcon,
  registerUser, getAllUsers, banUser, unbanUser, isUserBanned, setMaintenance,
  getMaintenance, getServices, toggleService, addService, deleteService, clearAllServices,
  getCountries, addCountry, deleteCountry, toggleCountry, clearAllCountries,
  addStock, buildStockAddedCard, getAllStockSummary, exportStock, getViewStocksReport,
  get4Numbers, getStockCount, clearStock, clearAllStock, getLiveTrafficAnalytics,
  searchOTPByNumber, parseIVASSMS, processIncomingSMS: parseIVASSMS,
  buildOTPFormattedCard, getUserOtpCount, getUserInfo, recordLiveRange, getLiveRanges
};
