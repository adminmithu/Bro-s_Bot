"""
Bro's Number Bot - Standalone Python Runner (Long Polling)
Includes Live SMS parser & Image 2 OTP Card formatting.
"""

import os
import re
import requests
import time

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    if os.path.exists(".env"):
        try:
            with open(".env", "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        os.environ.setdefault(k.strip(), v.strip())
        except Exception:
            pass

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "8848165401:AAFiUELKvW-apfBB5xBdQc92yzKcqgViwa4")
ADMIN_ID = os.getenv("ADMIN_ID", "8929349073")
GROUP_ID = os.getenv("GROUP_ID", "-1004462028404")
VOLTX_EMAIL = os.getenv("VOLTX_EMAIL", "mithucb999@gmail.com")
VOLTX_PASSWORD = os.getenv("VOLTX_PASSWORD", "Mithu@808")

FLAG_MAP = {
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
    'SA': '🇸🇦', 'SAUDI ARABIA': '🇸🇦',
    'TZ': '🇹🇿', 'TANZANIA': '🇹🇿',
    'TG': '🇹🇬', 'TOGO': '🇹🇬',
    'ET': '🇪🇹', 'ETHIOPIA': '🇪🇹',
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
    'JP': '🇯🇵', 'JAPAN': '🇯🇵',
    'KR': '🇰🇷', 'KOREA': '🇰🇷',
    'CN': '🇨🇳', 'CHINA': '🇨🇳',
    'BR': '🇧🇷', 'BRAZIL': '🇧🇷',
    'ID': '🇮🇩', 'INDONESIA': '🇮🇩',
    'VN': '🇻🇳', 'VIETNAM': '🇻🇳',
    'PH': '🇵🇭', 'PHILIPPINES': '🇵🇭',
    'MY': '🇲🇾', 'MALAYSIA': '🇲🇾',
    'NG': '🇳🇬', 'NIGERIA': '🇳🇬',
    'EG': '🇪🇬', 'EGYPT': '🇪🇬'
}

def detect_country_from_phone(phone):
    if not phone: return None
    clean = re.sub(r'[^\d]', '', str(phone))
    if clean.startswith('880'): return 'BD'
    if clean.startswith('91'): return 'IN'
    if clean.startswith('92'): return 'PK'
    if clean.startswith('44'): return 'UK'
    if clean.startswith('1'): return 'US'
    if clean.startswith('7'): return 'RU'
    if clean.startswith('62'): return 'ID'
    if clean.startswith('84'): return 'VN'
    if clean.startswith('63'): return 'PH'
    if clean.startswith('60'): return 'MY'
    if clean.startswith('234'): return 'NG'
    if clean.startswith('20'): return 'EG'
    if clean.startswith('971'): return 'AE'
    if clean.startswith('966'): return 'SA'
    return None

FLAG_MAP.update({
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
})

def extract_otp_code(full_message):
    if not full_message: return 'N/A'
    num_match = re.search(r'\b\d{4,8}\b', full_message)
    if num_match: return num_match.group(0)

    mask_match = re.search(r'\bX{4,8}\b', full_message, re.I)
    if mask_match: return mask_match.group(0)

    hyphen_match = re.search(r'\b(?:\d|X){3,4}[- ](?:\d|X){3,4}\b', full_message, re.I)
    if hyphen_match: return hyphen_match.group(0)

    kw_match = re.search(r'(?:code|is|codigo|código|verification|verificação|codice|kod)[:\s]+([A-Z0-9X-]{4,10})', full_message, re.I)
    if kw_match and kw_match.group(1): return kw_match.group(1)

    return 'N/A'

def get_flag_emoji(country_input):
    if not country_input:
        return '🌐'
    clean = re.sub(r'\s*\d+$', '', str(country_input)).strip().upper()
    if clean in FLAG_MAP:
        return FLAG_MAP[clean]
    for k, v in FLAG_MAP.items():
        if k in clean or clean in k:
            return v
    if len(clean) == 2 and clean.isalpha():
        return "".join(chr(127397 + ord(c)) for c in clean)
    return '🌐'

db_maintenance = False
db_services = [
    {'id': 'facebook', 'name': 'Facebook', 'icon': '📘', 'enabled': True},
    {'id': 'instagram', 'name': 'Instagram', 'icon': '📸', 'enabled': True},
    {'id': 'whatsapp', 'name': 'WhatsApp', 'icon': '💬', 'enabled': True}
]
db_countries = []
db_stock = {}
db_issued_numbers = {}
db_user_stats = {}
db_banned_users = set()
db_all_users = set()

import json

DB_FILE_PATH = "bot_db.json"

def save_db():
    try:
        data = {
            'isMaintenance': db_maintenance,
            'services': db_services,
db_global_dispense_qty = 2
db_user_dispense_quantities = {}

def save_db():
    try:
        data = {
            'isMaintenance': db_maintenance,
            'globalDispenseQty': db_global_dispense_qty,
            'userDispenseQuantities': db_user_dispense_quantities,
            'services': db_services,
            'countries': db_countries,
            'stock': db_stock,
            'issuedNumbers': db_issued_numbers,
            'userStats': db_user_stats,
            'bannedUsers': list(db_banned_users),
            'allUsers': list(db_all_users)
        }
        with open(DB_FILE_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print("[DB Save Error]:", e)

def load_db():
    global db_maintenance, db_global_dispense_qty, db_user_dispense_quantities, db_services, db_countries, db_stock, db_issued_numbers, db_user_stats, db_banned_users, db_all_users
    try:
        if os.path.exists(DB_FILE_PATH):
            with open(DB_FILE_PATH, 'r', encoding='utf-8') as f:
                loaded = json.load(f)
                if loaded:
                    db_maintenance = loaded.get('isMaintenance', db_maintenance)
                    db_global_dispense_qty = loaded.get('globalDispenseQty', 2)
                    db_user_dispense_quantities = loaded.get('userDispenseQuantities', {})
                    if loaded.get('services'): db_services = loaded['services']
                    if loaded.get('countries'): db_countries = loaded['countries']
                    if loaded.get('stock'): db_stock = loaded['stock']
                    if loaded.get('issuedNumbers'): db_issued_numbers = loaded['issuedNumbers']
                    if loaded.get('userStats'): db_user_stats = loaded['userStats']
                    if loaded.get('bannedUsers'): db_banned_users = set(loaded['bannedUsers'])
                    if loaded.get('allUsers'): db_all_users = set(loaded['allUsers'])
    except Exception as e:
        print("[DB Load Error]:", e)

load_db()

def set_global_dispense_quantity(qty):
    global db_global_dispense_qty
    load_db()
    try:
        v = int(qty)
    except:
        v = 2
    db_global_dispense_qty = max(1, min(6, v))
    save_db()
    return db_global_dispense_qty

def get_global_dispense_quantity():
    load_db()
    return db_global_dispense_qty or 2

def set_user_dispense_quantity(user_identifier, qty):
    global db_user_dispense_quantities
    load_db()
    if not user_identifier: return False
    clean_id = str(user_identifier).strip().lstrip('@').lower()
    try:
        v = int(qty)
    except:
        v = 1
    val = max(1, min(6, v))
    if db_user_dispense_quantities is None: db_user_dispense_quantities = {}
    db_user_dispense_quantities[clean_id] = val
    save_db()
    return val

def get_user_dispense_quantity(user_id, username=None):
    load_db()
    if not db_user_dispense_quantities: return get_global_dispense_quantity()

    if user_id and str(user_id) in db_user_dispense_quantities:
        return max(1, min(6, int(db_user_dispense_quantities[str(user_id)])))

    if username:
        clean_uname = str(username).strip().lstrip('@').lower()
        if clean_uname in db_user_dispense_quantities:
            return max(1, min(6, int(db_user_dispense_quantities[clean_uname])))

    return get_global_dispense_quantity()

def resolve_stock_key(service_id, country_code):
    load_db()
    clean_svc = str(service_id).lower().strip()
    clean_ctry = str(country_code).upper().strip()

    found_c = next((c for c in db_countries if c['code'] == clean_ctry or c['name'].upper() == clean_ctry), None)
    if found_c:
        clean_ctry = found_c['code']

    canonical_svc = clean_svc
    if 'faceb' in clean_svc or 'fb' in clean_svc: canonical_svc = 'facebook'
    elif 'what' in clean_svc or 'wa' in clean_svc: canonical_svc = 'whatsapp'
    elif 'teleg' in clean_svc or 'tg' in clean_svc: canonical_svc = 'telegram'
    elif 'insta' in clean_svc or 'ig' in clean_svc: canonical_svc = 'instagram'

    possibilities = [
        f"{clean_svc}:{clean_ctry}",
        f"{canonical_svc}:{clean_ctry}",
        f"{clean_svc}:{str(country_code).upper().strip()}",
        f"{canonical_svc}:{str(country_code).upper().strip()}"
    ]

    for p in possibilities:
        if p in db_stock and len(db_stock[p]) > 0:
            return p

    for k, v in db_stock.items():
        if v and len(v) > 0 and ':' in k:
            parts = k.split(':')
            k_svc, k_ctry = parts[0], parts[1]
            if k_ctry == clean_ctry or k_ctry == str(country_code).upper().strip():
                if k_svc == clean_svc or k_svc == canonical_svc or clean_svc in k_svc or k_svc in clean_svc:
                    return k
    return possibilities[0]

def get_stock_count(service_id, country_code):
    load_db()
    key = resolve_stock_key(service_id, country_code)
    if key and key in db_stock:
        return len(db_stock[key])
    return 0

def send_telegram_request(method, payload):
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/{method}"
    try:
        res = requests.post(url, json=payload, timeout=10)
        return res.json()
    except Exception as e:
        print("API Error:", e)
        return {"ok": False}

def log_to_group(payload):
    if not GROUP_ID:
        return
    if isinstance(payload, str):
        send_telegram_request('sendMessage', {'chat_id': GROUP_ID, 'text': payload, 'parse_mode': 'Markdown'})
    else:
        send_telegram_request('sendMessage', {'chat_id': GROUP_ID, **payload})

SERVICE_EMOJI_MAP = {
    'facebook': '📘', 'instagram': '📸', 'whatsapp': '💬', 'telegram': '✈️',
    'google': '🔍', 'gmail': '📧', 'tiktok': '🎵', 'twitter': '🐦', 'x': '🐦',
    'binance': '🟡', 'netflix': '🔴', 'discord': '🎮', 'amazon': '🛒',
    'paypal': '🅿️', 'snapchat': '👻', 'viber': '💜', 'line': '🟢'
}
DYNAMIC_COLOR_EMOJIS = ['🔥', '⚡', '💎', '🌟', '🚀', '👑', '🎯', '✨', '🔮', '🎲', '🌈', '🎨', '💥', '🏆']

def get_service_icon(service_name_or_id):
    if not service_name_or_id:
        return '📱'
    clean = str(service_name_or_id).lower().strip()
    if clean in SERVICE_EMOJI_MAP:
        return SERVICE_EMOJI_MAP[clean]
    for k, v in SERVICE_EMOJI_MAP.items():
        if k in clean:
            return v
    h = sum(ord(c) for c in clean)
    return DYNAMIC_COLOR_EMOJIS[h % len(DYNAMIC_COLOR_EMOJIS)]

def build_otp_card(service_id, country_code, phone_number, full_message, otp_code=None):
    svc_icon = get_service_icon(service_id)
    service_obj = next((s for s in db_services if s['id'] == str(service_id).lower()), {'name': str(service_id).upper(), 'icon': svc_icon})
    flag = get_flag_emoji(country_code)

    code = otp_code if (otp_code and otp_code != 'N/A') else extract_otp_code(full_message)

    bot_username = os.environ.get("BOT_USERNAME", "brosnumberbot")
    icon = service_obj.get('icon', svc_icon)

    msg = f"╔═══════════════════════════════════════╗\n   {icon} **{service_obj['name'].upper()} OTP RECEIVED**\n╚═══════════════════════════════════════╝\n\n"
    msg += f"{icon} {flag} `{phone_number}`\n"
    msg += f"💬 Language: #GLOBAL\n"
    msg += f"🌍 Country: {flag} ({country_code.upper()})\n"
    msg += f"🔐 OTP: `{code}`\n\n"
    msg += f"📩 **Message:**\n{full_message or 'No body text'}\n"
    msg += f"________________________________________"

    inline_keyboard = [
        [
            {"text": f"{code} 📋", "callback_data": f"copy_{code}", "copy_text": {"text": f"{code}"}, "style": "success"},
            {"text": "Get number ↗️", "url": f"https://t.me/{bot_username}?start=getnum", "style": "primary"}
        ]
    ]

    return {
        'text': msg,
        'parse_mode': 'Markdown',
        'reply_markup': {'inline_keyboard': inline_keyboard}
    }

def build_number_added_card(range_str, country_name, numbers, country_code=None, service_name="Facebook"):
    flag = get_flag_emoji(country_code or country_name)
    clean_country = str(country_name or country_code or 'GLOBAL').strip()
    clean_range = str(range_str or 'N/A').strip()
    otp_group_url = os.getenv("OTP_GROUP_URL", "https://t.me/c/4462028404/1")

    if isinstance(numbers, list):
        num_list = numbers
    else:
        num_list = [numbers]

    formatted_numbers = [str(n).strip() if str(n).strip().startswith('+') else f"+{str(n).strip()}" for n in num_list]

    msg = f"✅ **YOUR NUMBER ADDED** ✅\n\n" \
          f"> 📶 Range: {clean_range} ❞\n" \
          f"> 🌐 Country: {flag} {clean_country} ❞\n"

    if len(formatted_numbers) == 1:
        msg += f"> 📞 Number: `{formatted_numbers[0]}` ❞\n"
    else:
        msg += f"> 📞 Numbers ({len(formatted_numbers)}): ❞\n"
        for n in formatted_numbers:
            msg += f"> • `{n}` ❞\n"

    msg += f"> ✉️ SMS Status: Waiting for OTP... ❞"

    inline_keyboard = [
        [{"text": service_name, "callback_data": "svc_header"}]
    ]

    for num in formatted_numbers:
        raw_digits = re.sub(r'[^\d+]', '', num)
        inline_keyboard.append([
            {"text": f"{num} 📋", "callback_data": f"copy_{raw_digits}", "copy_text": {"text": raw_digits}}
        ])

    inline_keyboard.append([{"text": "🔄 Change Number", "callback_data": "getnum_change"}])
    inline_keyboard.append([{"text": "View OTP ↗️", "url": otp_group_url}])

    return {
        'text': msg,
        'parse_mode': 'Markdown',
        'reply_markup': {'inline_keyboard': inline_keyboard}
    }

def build_group_otp_broadcast_card(number, country_name, code, full_message, service_id=None):
    country_code = detect_country_from_phone(number or country_name) or country_name or 'GLOBAL'
    flag = get_flag_emoji(country_code)
    clean_country = str(country_name or country_code or 'GLOBAL').strip()
    bot_username = os.getenv("BOT_USERNAME", "brosnumberbot")
    otp_group_url = os.getenv("OTP_GROUP_URL", "https://t.me/c/4462028404/1")

    masked_number = re.sub(r'\D', '', str(number))
    if len(masked_number) > 7:
        masked_number = masked_number[:3] + 'xxxx' + masked_number[-4:]
    else:
        masked_number = str(number)

    clean_code = str(code or 'N/A').strip()
    clean_code_digits = re.sub(r'\D', '', clean_code) or clean_code
    sms_body = str(full_message or 'No body text').strip()

    msg = f"Your SMS received 🎀\n\n" \
          f"🐱 Number: {masked_number}\n" \
          f"🐱 Country: {clean_country} {flag}\n\n" \
          f"🎁 Code: `{clean_code}`\n\n"

    lines = [l.strip() for l in sms_body.splitlines() if l.strip()]
    for line in lines:
        msg += f"> {line} ❞\n"

    inline_keyboard = [
        [{"text": f"{clean_code_digits} 📋", "callback_data": f"copy_{clean_code_digits}", "copy_text": {"text": clean_code_digits}, "style": "success"}],
        [{"text": "Get Number ↗️", "url": f"https://t.me/{bot_username}?start=getnum", "style": "primary"}, {"text": "Join Channel ↗️", "url": otp_group_url, "style": "primary"}]
    ]

    return {
        'text': msg,
        'parse_mode': 'Markdown',
        'reply_markup': {'inline_keyboard': inline_keyboard}
    }

def send_main_menu(chat_id, text="🔥 **JS SUPER BOT** 🔥\n________________________\nSelect Your Service Number Button"):
    is_admin = not ADMIN_ID or str(chat_id) == str(ADMIN_ID)
    keyboard = [
        [{"text": "GET NUMBER", "style": "success"}],
        [{"text": "View Range", "style": "primary"}, {"text": "2FA GENARET", "style": "primary"}],
        [{"text": "My Status", "style": "primary"}, {"text": "Ldarbord", "style": "primary"}]
    ]
    if is_admin:
        keyboard.append([{"text": "⚙️ Admin Panel", "style": "danger"}])

    reply_markup = {
        "keyboard": keyboard,
        "resize_keyboard": True,
        "is_persistent": True
    }
    return send_telegram_request('sendMessage', {
        'chat_id': chat_id,
        'text': text,
        'parse_mode': 'Markdown',
        'reply_markup': reply_markup
    })

def send_service_selection(chat_id):
    active_services = [s for s in db_services if s.get('enabled', True)]

    inline_keyboard = [
        [{"text": "⚡ VOLTX SMS (Live Range API)", "callback_data": "voltx_getnum"}]
    ]
    for i in range(0, len(active_services), 2):
        row = []
        s1 = active_services[i]
        icon1 = s1.get('icon') or get_service_icon(s1.get('name', s1['id']))
        row.append({"text": f"{icon1} {s1['name']}", "callback_data": f"svc_{s1['id']}"})
        if i + 1 < len(active_services):
            s2 = active_services[i + 1]
            icon2 = s2.get('icon') or get_service_icon(s2.get('name', s2['id']))
            row.append({"text": f"{icon2} {s2['name']}", "callback_data": f"svc_{s2['id']}"})
        inline_keyboard.append(row)

    inline_keyboard.append([{"text": "🏠 Main Menu", "callback_data": "back_to_main_menu"}])

    return send_telegram_request('sendMessage', {
        'chat_id': chat_id,
        'text': "📲 **Select a Social Media Service or Voltx SMS API:**",
        'parse_mode': 'Markdown',
        'reply_markup': {"inline_keyboard": inline_keyboard}
    })

def send_country_selection(chat_id, service_id):
    service = next((s for s in db_services if s['id'] == service_id), {'name': service_id, 'icon': '📱'})
    if not db_countries:
        return send_telegram_request('sendMessage', {
            'chat_id': chat_id,
            'text': "⚠️ **No Countries Available Yet!**\n\nAdmin needs to add countries first using button in Admin Panel or by uploading stock!",
            'parse_mode': 'Markdown',
            'reply_markup': {
                "inline_keyboard": [
                    [{"text": "⬅️ Back to Services", "callback_data": "back_to_services"}],
                    [{"text": "🏠 Main Menu", "callback_data": "back_to_main_menu"}]
                ]
            }
        })

    inline_keyboard = []
    for i in range(0, len(db_countries), 2):
        row = []
        c1 = db_countries[i]
        stock1 = get_stock_count(service_id, c1['code'])
        row.append({"text": f"{c1['flag']} {c1['name']} ({stock1})", "callback_data": f"num_{service_id}_{c1['code']}"})

        if i + 1 < len(db_countries):
            c2 = db_countries[i + 1]
            stock2 = get_stock_count(service_id, c2['code'])
            row.append({"text": f"{c2['flag']} {c2['name']} ({stock2})", "callback_data": f"num_{service_id}_{c2['code']}"})
        inline_keyboard.append(row)

    inline_keyboard.append([
        {"text": "⬅️ Back to Services", "callback_data": "back_to_services"},
        {"text": "🏠 Main Menu", "callback_data": "back_to_main_menu"}
    ])
    return send_telegram_request('sendMessage', {
        'chat_id': chat_id,
        'text': f"🌏 **Select Country for {service['icon']} {service['name']}:**\n\n_Note: Dispenses 4 numbers instantly!_",
        'parse_mode': 'Markdown',
        'reply_markup': {"inline_keyboard": inline_keyboard}
    })

def get_live_traffic_analytics():
    analytics = {}
    total_otps = 0
    for num, rec in db_issued_numbers.items():
        s_id = str(rec.get('serviceId', 'instagram')).lower()
        c_code = str(rec.get('countryCode') or detect_country_from_phone(num) or 'GLOBAL').upper()
        key = f"{s_id}:{c_code}"
        if key not in analytics:
            s_obj = next((s for s in db_services if s['id'] == s_id), {'name': s_id.upper(), 'icon': '📱'})
            c_obj = next((c for c in db_countries if c['code'] == c_code), {'flag': get_flag_emoji(c_code), 'name': c_code})
            analytics[key] = {
                'serviceId': s_id, 'serviceName': s_obj['name'], 'serviceIcon': s_obj['icon'],
                'countryCode': c_code, 'countryName': c_obj['name'], 'countryFlag': c_obj['flag'],
                'issuedCount': 0, 'otpCount': 0
            }
        analytics[key]['issuedCount'] += 1
        if rec.get('fullMessage') or rec.get('otpCode'):
            analytics[key]['otpCount'] += 1
            total_otps += 1
    items = sorted(analytics.values(), key=lambda x: x['otpCount'], reverse=True)
    return {'total_otps': total_otps, 'items': items}

def get_view_stocks_report():
    total_stock = 0
    total_issued = len(db_issued_numbers)
    total_otps = sum(1 for rec in db_issued_numbers.values() if rec.get('otpCode') or rec.get('fullMessage'))

    breakdown_lines = []
    for s in db_services:
        for c in db_countries:
            key = f"{s['id']}:{c['code']}"
            stock_cnt = len(db_stock.get(key, []))
            total_stock += stock_cnt

            issued_cnt = 0
            otp_cnt = 0
            for num, rec in db_issued_numbers.items():
                if rec.get('serviceId', '').lower() == s['id'].lower() and rec.get('countryCode', '').upper() == c['code'].upper():
                    issued_cnt += 1
                    if rec.get('otpCode') or rec.get('fullMessage'):
                        otp_cnt += 1

            if stock_cnt > 0 or issued_cnt > 0 or otp_cnt > 0:
                flag = c.get('flag', get_flag_emoji(c['code']))
                breakdown_lines.append(
                    f"{s['icon']} **{s['name']}** | {flag} **{c['name']}** (`{c['code']}`)\n"
                    f"└ 📦 Stock: `{stock_cnt}` | 📲 Used: `{issued_cnt}` | 🔐 OTPs Received: `{otp_cnt}`"
                )

    msg = f"📊 **BRO'S BOT STOCKS & USAGE OVERVIEW** 📊\n\n"
    msg += f"📦 **Global Overview:**\n"
    msg += f"• 🟢 Total Stock Available: `{total_stock}`\n"
    msg += f"• 📲 Total Issued / Used Numbers: `{total_issued}`\n"
    msg += f"• 🔐 Total Numbers OTP Received: `{total_otps}`\n\n"
    msg += f"📋 **DETAILED STOCK & OTP BREAKDOWN:**\n\n"

    if not breakdown_lines:
        msg += f"ℹ️ _No stock numbers or usage records found in database._\n"
    else:
        msg += "\n\n".join(breakdown_lines) + "\n"

    msg += f"\n________________________________________\n"
    msg += f"💡 _Upload stock .txt files in Admin Panel to add more numbers!_"
    return msg

def send_admin_panel(chat_id, message_id=None):
    traffic_data = get_live_traffic_analytics()
    global_qty = get_global_dispense_quantity()
    summary_text = "⚙️ **BRO'S BOT ADMIN CONTROL PANEL** ⚙️\n\n"
    summary_text += "📊 **Bot Stats:**\n"
    summary_text += f"• Total Users: `{len(db_all_users)}`\n"
    summary_text += f"• Bot Status: {'🚧 **Maintenance ON**' if db_maintenance else '🟢 **Active**'}\n"
    summary_text += f"• Total OTPs Received: `{traffic_data['total_otps']}`\n"
    summary_text += f"• Dispense Quantity: Default `{global_qty}` Number(s)\n\n"
    summary_text += "👇 **Select an option below to manage your bot:**"

    reply_keyboard = {
        "keyboard": [
            [
                {"text": "🔢 Set Dispense Quantity", "style": "success"},
                {"text": "📢 Broadcast", "style": "primary"}
            ],
            [
                {"text": "🚫 Ban User", "style": "danger"},
                {"text": "✅ Unban User", "style": "success"}
            ],
            [
                {"text": "👤 User Info", "style": "primary"},
                {"text": f"🛠 Maint: {'ON 🚧' if db_maintenance else 'OFF 🟢'}", "style": "danger"}
            ],
            [
                {"text": "🧪 Test Group Post", "style": "success"},
                {"text": "🏠 Main Menu", "style": "primary"}
            ]
        ],
        "resize_keyboard": True,
        "is_persistent": True
    }

    return send_telegram_request('sendMessage', {
        'chat_id': chat_id,
        'text': summary_text,
        'parse_mode': 'Markdown',
        'reply_markup': reply_keyboard
    })

def send_service_toggle_menu(chat_id, message_id=None):
    text = "🔄 **TOGGLE SERVICES ON / OFF**\n\nClick any service button below to switch its visibility:\n"
    inline_keyboard = [
        [{"text": f"{s['icon']} {s['name']}: {'🟢 ON' if s.get('enabled', True) else '🔴 OFF'}", "callback_data": f"admin_togglesvc_{s['id']}"}]
        for s in db_services
    ]
    inline_keyboard.append([
        {"text": "🔙 Back to Admin", "callback_data": "admin_stock"},
        {"text": "🏠 Main Menu", "callback_data": "back_to_main_menu"}
    ])

    if message_id:
        return send_telegram_request('editMessageText', {
            'chat_id': chat_id,
            'message_id': message_id,
            'text': text,
            'parse_mode': 'Markdown',
            'reply_markup': {"inline_keyboard": inline_keyboard}
        })

    return send_telegram_request('sendMessage', {
        'chat_id': chat_id,
        'text': text,
        'parse_mode': 'Markdown',
        'reply_markup': {"inline_keyboard": inline_keyboard}
    })

def send_delete_service_menu(chat_id, message_id=None):
    if not db_services:
        text = "❌ **DELETE SERVICE**\n\nNo services currently exist in the database."
        inline_keyboard = [[{"text": "🔙 Back to Admin", "callback_data": "admin_stock"}, {"text": "🏠 Main Menu", "callback_data": "back_to_main_menu"}]]
        if message_id:
            return send_telegram_request('editMessageText', {'chat_id': chat_id, 'message_id': message_id, 'text': text, 'parse_mode': 'Markdown', 'reply_markup': {"inline_keyboard": inline_keyboard}})
        return send_telegram_request('sendMessage', {'chat_id': chat_id, 'text': text, 'parse_mode': 'Markdown', 'reply_markup': {"inline_keyboard": inline_keyboard}})

    text = "❌ **DELETE SERVICE**\n\nClick any service button below to remove it from the system:\n"
    inline_keyboard = [
        [{"text": f"❌ {s['icon']} {s['name']}", "callback_data": f"admin_confirm_delsvc_{s['id']}"}]
        for s in db_services
    ]
    inline_keyboard.append([
        {"text": "🔙 Back to Admin", "callback_data": "admin_stock"},
        {"text": "🏠 Main Menu", "callback_data": "back_to_main_menu"}
    ])

    if message_id:
        return send_telegram_request('editMessageText', {'chat_id': chat_id, 'message_id': message_id, 'text': text, 'parse_mode': 'Markdown', 'reply_markup': {"inline_keyboard": inline_keyboard}})
    return send_telegram_request('sendMessage', {'chat_id': chat_id, 'text': text, 'parse_mode': 'Markdown', 'reply_markup': {"inline_keyboard": inline_keyboard}})

def send_delete_country_menu(chat_id, message_id=None):
    if not db_countries:
        text = "❌ **DELETE COUNTRY**\n\nNo countries currently exist in the database."
        inline_keyboard = [[{"text": "🔙 Back to Admin", "callback_data": "admin_stock"}, {"text": "🏠 Main Menu", "callback_data": "back_to_main_menu"}]]
        if message_id:
            return send_telegram_request('editMessageText', {'chat_id': chat_id, 'message_id': message_id, 'text': text, 'parse_mode': 'Markdown', 'reply_markup': {"inline_keyboard": inline_keyboard}})
        return send_telegram_request('sendMessage', {'chat_id': chat_id, 'text': text, 'parse_mode': 'Markdown', 'reply_markup': {"inline_keyboard": inline_keyboard}})

    text = "❌ **DELETE COUNTRY**\n\nClick any country button below to remove it from the system:\n"
    inline_keyboard = [
        [{"text": f"❌ {c['flag']} {c['name']} ({c['code']})", "callback_data": f"admin_confirm_delcountry_{c['code']}"}]
        for c in db_countries
    ]
    inline_keyboard.append([
        {"text": "🔙 Back to Admin", "callback_data": "admin_stock"},
        {"text": "🏠 Main Menu", "callback_data": "back_to_main_menu"}
    ])

    if message_id:
        return send_telegram_request('editMessageText', {'chat_id': chat_id, 'message_id': message_id, 'text': text, 'parse_mode': 'Markdown', 'reply_markup': {"inline_keyboard": inline_keyboard}})
    return send_telegram_request('sendMessage', {'chat_id': chat_id, 'text': text, 'parse_mode': 'Markdown', 'reply_markup': {"inline_keyboard": inline_keyboard}})

def handle_update(update):
    global db_maintenance, db_stock, db_countries
    if "callback_query" in update:
        query = update["callback_query"]
        chat_id = query["message"]["chat"]["id"]
        message_id = query["message"]["message_id"]
        data = query["data"]
        send_telegram_request("answerCallbackQuery", {"callback_query_id": query["id"]})

        if str(chat_id) in db_banned_users:
            send_telegram_request("sendMessage", {'chat_id': chat_id, 'text': "🚫 **You are banned from using this bot.**"})
            return

        if data == "back_to_main_menu":
            send_main_menu(chat_id, "👋 **Welcome back to Main Menu!**")
            return

        if data.startswith("copy_"):
            send_telegram_request("answerCallbackQuery", {"callback_query_id": query["id"], "text": "Text copied to clipboard.", "show_alert": False})
            return

        if data == "getnum_change":
            send_telegram_request("sendMessage", {'chat_id': chat_id, 'text': "⌨️ **Enter Range ID (1 Number):**", 'parse_mode': 'Markdown'})
            return

        if data == "back_to_services":
            send_service_selection(chat_id)
        elif data.startswith("svc_"):
            service_id = data.replace("svc_", "")
            send_country_selection(chat_id, service_id)
        elif data.startswith("num_"):
            parts = data.split("_")
            service_id, country_code = parts[1], parts[2]
            key = resolve_stock_key(service_id, country_code)
            available = db_stock.get(key, []) if key else []

            if not available:
                send_telegram_request("sendMessage", {
                    'chat_id': chat_id,
                    'text': f"⚠️ **Out of Stock!**\n\nNo numbers available for {service_id.upper()} ({country_code}).",
                    'parse_mode': 'Markdown',
                    'reply_markup': {
                        "inline_keyboard": [
                            [{"text": "⬅️ Back to Services", "callback_data": "back_to_services"}],
                            [{"text": "🏠 Main Menu", "callback_data": "back_to_main_menu"}]
                        ]
                    }
                })
            else:
                dispensed = available[:4]
                db_stock[key] = available[4:]
                save_db()

                c_info = next((c for c in db_countries if c['code'] == country_code), {'flag': '🌐', 'name': country_code})
                s_info = next((s for s in db_services if s['id'] == service_id), {'icon': '📱', 'name': service_id})

                inline_keyboard = [
                    [{"text": s_info['name'], "callback_data": "dummy_svc", "style": "success"}]
                ]
                for num in dispensed:
                    inline_keyboard.append([{"text": num, "callback_data": f"copy_{num}", "copy_text": {"text": num}}])
                    db_issued_numbers[num] = {'serviceId': service_id, 'countryCode': country_code, 'userId': chat_id, 'fullMessage': None, 'otpCode': None}

                inline_keyboard.append([
                    {"text": "Change Number", "callback_data": "back_to_services", "style": "danger"},
                    {"text": "OTP Group", "url": "https://t.me/c/5477236175/1", "style": "primary"}
                ])
                inline_keyboard.append([
                    {"text": "Close", "callback_data": "close_msg", "style": "danger"},
                    {"text": "🏠 Main Menu", "callback_data": "back_to_main_menu"}
                ])

                send_telegram_request("sendMessage", {
                    'chat_id': chat_id,
                    'text': "NEW NUMBER",
                    'reply_markup': {'inline_keyboard': inline_keyboard}
                })
                log_to_group(f"📢 **New Order Dispensed!**\n\n👤 User ID: `{chat_id}`\n📌 Service: {s_info['icon']} {s_info['name']}\n🌐 Country: {c_info['flag']} {c_info['name']}\n📱 Numbers:\n" + "\n".join([f"• `{n}`" for n in dispensed]))
        elif data == "close_msg":
            send_telegram_request("deleteMessage", {'chat_id': chat_id, 'message_id': message_id})
        elif data == "admin_stock":
            send_admin_panel(chat_id, message_id)
        elif data == "admin_addstock_guide":
            text = "📥 **HOW TO UPLOAD / ADD NUMBER STOCK**\n\n" \
                   "To add phone numbers to bot stock:\n\n" \
                   "1️⃣ Create or open a `.txt` file containing phone numbers (1 number per line).\n" \
                   "2️⃣ Send / Upload the `.txt` file directly in this Telegram chat.\n" \
                   "3️⃣ In the **File Caption**, write: `<service> <country_code>`\n\n" \
                   "*Caption Examples:*\n" \
                   "• `facebook US` (Adds stock for Facebook USA 🇺🇸)\n" \
                   "• `whatsapp BD` (Adds stock for WhatsApp Bangladesh 🇧🇩)\n" \
                   "• `instagram IN` (Adds stock for Instagram India 🇮🇳)\n\n" \
                   "*Or Single Number Command:*\n" \
                   "`/addstock <service> <country_code> <phone_number>`\n" \
                   "Example: `/addstock facebook US +12025550143`\n\n" \
                   "_Note: If the country doesn't exist yet, the bot auto-creates it!_"
            send_telegram_request('editMessageText', {
                'chat_id': chat_id,
                'message_id': message_id,
                'text': text,
                'parse_mode': 'Markdown',
                'reply_markup': {"inline_keyboard": [
                    [{"text": "🔙 Back to Admin", "callback_data": "admin_stock"}, {"text": "🏠 Main Menu", "callback_data": "back_to_main_menu"}]
                ]}
            })
        elif data == "admin_traffic_details":
            traffic_data = get_live_traffic_analytics()
            text = "📈 **LIVE COUNTRY OTP TRAFFIC ANALYTICS** 📈\n\n"
            text += f"Total OTPs Processed Today: `{traffic_data['total_otps']}`\n\n"
            if not traffic_data['items']:
                text += "ℹ️ _No OTP traffic recorded yet._\n"
            else:
                text += "🔥 **High Demand Countries (Add Stock Here!):**\n\n"
                for item in traffic_data['items']:
                    text += f"{item['serviceIcon']} **{item['serviceName']}** | {item['countryFlag']} **{item['countryName']}** (`{item['countryCode']}`)\n"
                    text += f"└ 📩 **OTPs Received:** `{item['otpCount']}` | 📱 **Issued Numbers:** `{item['issuedCount']}`\n\n"
            send_telegram_request('editMessageText', {
                'chat_id': chat_id,
                'message_id': message_id,
                'text': text,
                'parse_mode': 'Markdown',
                'reply_markup': {"inline_keyboard": [
                    [{"text": "🔙 Back to Admin", "callback_data": "admin_stock"}, {"text": "🏠 Main Menu", "callback_data": "back_to_main_menu"}]
                ]}
            })
        elif data in ["admin_stock_details", "admin_exportstock"]:
            text = get_view_stocks_report()
            send_telegram_request('editMessageText', {
                'chat_id': chat_id,
                'message_id': message_id,
                'text': text,
                'parse_mode': 'Markdown',
                'reply_markup': {"inline_keyboard": [
                    [{"text": "🔙 Back to Admin", "callback_data": "admin_stock"}, {"text": "🏠 Main Menu", "callback_data": "back_to_main_menu"}]
                ]}
            })
        elif data == "admin_clearstock":
            text = "⚠️ **CLEAR ALL STOCK CONFIRMATION**\n\nAre you sure you want to delete all current number stock from the bot database?"
            send_telegram_request('editMessageText', {
                'chat_id': chat_id,
                'message_id': message_id,
                'text': text,
                'parse_mode': 'Markdown',
                'reply_markup': {"inline_keyboard": [
                    [{"text": "⚠️ Yes, Clear All Stock", "callback_data": "admin_confirm_clearstock"}],
                    [{"text": "🔙 Back to Admin", "callback_data": "admin_stock"}, {"text": "🏠 Main Menu", "callback_data": "back_to_main_menu"}]
                ]}
            })
        elif data.startswith("admin_confirm_delsvc_"):
            svc_id = data.replace("admin_confirm_delsvc_", "")
            db_services = [s for s in db_services if s['id'] != svc_id]
            send_delete_service_menu(chat_id, message_id)
        elif data.startswith("admin_confirm_delcountry_"):
            code = data.replace("admin_confirm_delcountry_", "")
            db_countries = [c for c in db_countries if c['code'] != code]
            send_delete_country_menu(chat_id, message_id)
        elif data == "admin_delsvc_menu":
            send_delete_service_menu(chat_id, message_id)
        elif data == "admin_delcountry_menu":
            send_delete_country_menu(chat_id, message_id)
        elif data == "admin_confirm_clearstock":
            db_stock = {}
            text = "✅ **All Stock Cleared Successfully!**"
            send_telegram_request('editMessageText', {
                'chat_id': chat_id,
                'message_id': message_id,
                'text': text,
                'parse_mode': 'Markdown',
                'reply_markup': {"inline_keyboard": [
                    [{"text": "🔙 Back to Admin", "callback_data": "admin_stock"}, {"text": "🏠 Main Menu", "callback_data": "back_to_main_menu"}]
                ]}
            })
        elif data == "admin_receivesms":
            text = "📲 **LIVE SMS TESTER / OVERRIDE**\n\nTo post a live SMS OTP card directly to group & user, send text:\n`/receivesms <number> <full message body>`\n\n*Example:*\n`/receivesms +255710962660 <#> 19926 es tu codigo de Facebook H29Q+Fsn4Sr`"
            send_telegram_request('editMessageText', {
                'chat_id': chat_id,
                'message_id': message_id,
                'text': text,
                'parse_mode': 'Markdown',
                'reply_markup': {"inline_keyboard": [
                    [{"text": "🔙 Back to Admin", "callback_data": "admin_stock"}, {"text": "🏠 Main Menu", "callback_data": "back_to_main_menu"}]
                ]}
            })



    elif "message" in update:
        message = update["message"]
        chat_id = message["chat"]["id"]
        chat_type = message.get("chat", {}).get("type", "private")
        is_group = chat_type in ["group", "supergroup"] or chat_id < 0
        text = message.get("text", "")
        is_admin = not ADMIN_ID or str(chat_id) == str(ADMIN_ID)

        if is_group:
            if text.startswith("/receivesms") and is_admin:
                raw = text.replace("/receivesms", "").strip()
                sp = raw.find(' ')
                if sp != -1:
                    number = raw[:sp].strip()
                    full_message = raw[sp:].strip()
                    otp_match = re.search(r'\b\d{4,8}\b', full_message)
                    otp_code = otp_match.group(0) if otp_match else 'N/A'
                    service_id = 'instagram'
                    lower_msg = full_message.lower()
                    if 'facebook' in lower_msg or 'fb' in lower_msg: service_id = 'facebook'
                    elif 'whatsapp' in lower_msg or 'wa' in lower_msg: service_id = 'whatsapp'
                    record = db_issued_numbers.get(number, {})
                    country_code = record.get('countryCode', 'TZ')
                    user_id = record.get('userId', None)
                    card = build_otp_card(service_id, country_code, number, full_message, otp_code)
                    log_to_group(card)
                    if user_id:
                        send_telegram_request("sendMessage", {'chat_id': user_id, **card})
            return

        db_all_users.add(str(chat_id))

        if not is_admin and str(chat_id) in db_banned_users:
            send_telegram_request("sendMessage", {'chat_id': chat_id, 'text': "🚫 **You are banned from using this bot.**"})
            return

        if not is_admin and db_maintenance:
            main_msg = "╔═════════════════════════╗\n   🚧 **BOT UNDER MAINTENANCE** 🚧\n╚═════════════════════════╝\n\nOur system is currently undergoing scheduled maintenance to add new stocks and upgrade server performance.\n━━━━━━━━━━━━━━━━━━━━━━━━━"
            send_telegram_request("sendMessage", {'chat_id': chat_id, 'text': main_msg, 'parse_mode': 'Markdown'})
            return

        # Voltx SMS OTP History (/voltxotp)
        if text.startswith("/voltxotp") or text.startswith("/myvoltxotp"):
            send_telegram_request("sendMessage", {'chat_id': chat_id, 'text': "⏳ **Fetching Voltx SMS OTP History...**", 'parse_mode': 'Markdown'})
            voltx_key = os.getenv("VOLTX_API_KEY", "MAB12CD34EF")
            try:
                res = requests.get("https://api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api/success-otp", headers={"mauthapi": voltx_key}, timeout=10)
                res_data = res.json()
                otps = res_data.get("data", {}).get("otps", [])
                if otps:
                    msg = "📩 **VOLTX SMS — LAST SUCCESSFUL OTPS** 📩\n\n"
                    for idx, item in enumerate(otps[:10]):
                        msg += f"{idx + 1}. 📱 `+{item.get('number')}`\n💬 Message: *{item.get('message')}*\n\n"
                    send_telegram_request("sendMessage", {'chat_id': chat_id, 'text': msg, 'parse_mode': 'Markdown'})
                else:
                    send_telegram_request("sendMessage", {'chat_id': chat_id, 'text': "ℹ️ **No recent successful OTPs found.**", 'parse_mode': 'Markdown'})
            except Exception as e:
                send_telegram_request("sendMessage", {'chat_id': chat_id, 'text': f"❌ **Request Failed:** `{str(e)}`", 'parse_mode': 'Markdown'})
            return

        # Voltx SMS Live Access Ranges (/voltxranges)
        if text.startswith("/voltxranges") or text.startswith("/voltxaccess"):
            send_telegram_request("sendMessage", {'chat_id': chat_id, 'text': "⏳ **Fetching Voltx Live Access Ranges...**", 'parse_mode': 'Markdown'})
            voltx_key = os.getenv("VOLTX_API_KEY", "MAB12CD34EF")
            try:
                res = requests.get("https://api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api/liveaccess", headers={"mauthapi": voltx_key}, timeout=10)
                res_data = res.json()
                services = res_data.get("data", {}).get("services", [])
                if services:
                    msg = "🛰️ **VOLTX SMS — RECENTLY ACTIVE SERVICES & RANGES** 🛰️\n\n"
                    for svc in services:
                        r_str = ", ".join(svc.get("ranges", []))
                        msg += f"📘 **{svc.get('sid')}**\n🎯 Ranges: `{r_str}`\n\n"
                    send_telegram_request("sendMessage", {'chat_id': chat_id, 'text': msg, 'parse_mode': 'Markdown'})
                else:
                    send_telegram_request("sendMessage", {'chat_id': chat_id, 'text': "ℹ️ **No active range data found.**", 'parse_mode': 'Markdown'})
            except Exception as e:
                send_telegram_request("sendMessage", {'chat_id': chat_id, 'text': f"❌ **Request Failed:** `{str(e)}`", 'parse_mode': 'Markdown'})
            return

        # Voltx SMS Command (/voltx <rid>)
        if text.startswith("/voltx") or text.startswith("/getvoltx"):
            parts = text.split()
            rid = parts[1] if len(parts) > 1 else None
            if not rid:
                msg = "⚡ **VOLTX SMS API COMMANDS** ⚡\n\n• `/voltx <range_id>` — Allocate virtual number\n• `/voltxotp` — View last 50 successful OTPs\n• `/voltxranges` — View recently active services & ranges\n\nExample: `/voltx 26134`"
                send_telegram_request("sendMessage", {'chat_id': chat_id, 'text': msg, 'parse_mode': 'Markdown'})
                return

            send_telegram_request("sendMessage", {'chat_id': chat_id, 'text': f"⏳ **Connecting to Voltx SMS...** Requesting number for Range ID `{rid}`...", 'parse_mode': 'Markdown'})
            voltx_url = os.getenv("VOLTX_BASE_URL", "https://api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api/getnum")
            if not voltx_url.endswith("/getnum"): voltx_url = voltx_url.rstrip("/") + "/getnum"
            voltx_key = os.getenv("VOLTX_API_KEY", "MAB12CD34EF")
            try:
                res = requests.post(voltx_url, json={"rid": str(rid).strip()}, headers={"Content-Type": "application/json", "mauthapi": voltx_key}, timeout=10)
                res_data = res.json()
                meta = res_data.get("meta", {})
                data = res_data.get("data", {})
                if meta.get("code") == 200 or meta.get("status") in ["ok", "success"]:
                    num = data.get("full_number") or (f"+{data.get('no_plus_number')}" if data.get('no_plus_number') else "N/A")
                    ctry = data.get("country", "Unknown")
                    op = data.get("operator", "Unknown")
                    card_msg = f"╔═══════════════════════════════════════╗\n   ⚡ **VOLTX SMS VIRTUAL NUMBER** ⚡\n╚═══════════════════════════════════════╝\n\n📱 **Allocated Number:** `{num}`\n📌 **Range ID:** `{rid}`\n🌍 **Country:** {ctry}\n📡 **Operator:** {op}\n🌐 **Provider:** Voltx SMS (2oo9 Cloud)\n\n💡 _Tap number to copy! Send your SMS to this number to receive OTP._"
                    send_telegram_request("sendMessage", {'chat_id': chat_id, 'text': card_msg, 'parse_mode': 'Markdown'})
                    log_to_group(f"⚡ **[VOLTX SMS ALLOCATED]** Range: `{rid}` | Number: `{num}` | {ctry}")
                else:
                    err_msg = res_data.get("message") or meta.get("message") or f"Error Code: {meta.get('code', res.status_code)}"
                    send_telegram_request("sendMessage", {'chat_id': chat_id, 'text': f"❌ **VOLTX SMS ALLOCATION FAILED** ❌\n\n📌 **Range ID:** `{rid}`\n⚠️ **Error:** `{err_msg}`", 'parse_mode': 'Markdown'})
            except Exception as e:
                send_telegram_request("sendMessage", {'chat_id': chat_id, 'text': f"❌ **VOLTX API Request Failed:** `{str(e)}`", 'parse_mode': 'Markdown'})
            return

        # Receive Live SMS
        if text.startswith("/receivesms") and is_admin:
            raw = text.replace("/receivesms", "").strip()
            sp = raw.find(' ')
            if sp != -1:
                number = raw[:sp].strip()
                full_message = raw[sp:].strip()

                otp_match = re.search(r'\b\d{4,8}\b', full_message)
                otp_code = otp_match.group(0) if otp_match else 'N/A'

                service_id = 'instagram'
                lower_msg = full_message.lower()
                if 'facebook' in lower_msg or 'fb' in lower_msg: service_id = 'facebook'
                elif 'whatsapp' in lower_msg or 'wa' in lower_msg: service_id = 'whatsapp'

                record = db_issued_numbers.get(number, {})
                country_code = record.get('countryCode', 'TZ')
                user_id = record.get('userId', None)

                db_issued_numbers[number] = {
                    'serviceId': service_id,
                    'countryCode': country_code,
                    'userId': user_id,
                    'fullMessage': full_message,
                    'otpCode': otp_code
                }

                if user_id:
                    db_user_stats[str(user_id)] = db_user_stats.get(str(user_id), 0) + 1

                card = build_otp_card(service_id, country_code, number, full_message, otp_code)

                # Post to Group
                log_to_group(card)

                # Send to User
                if user_id:
                    send_telegram_request("sendMessage", {'chat_id': user_id, **card})

                send_telegram_request("sendMessage", {'chat_id': chat_id, 'text': f"✅ Live SMS Card generated & posted to Group for `{number}`!"})
            return

        if text.startswith("/addservice") and is_admin:
            parts = text.split(' ')
            if len(parts) >= 4:
                db_services.append({'id': parts[1].lower(), 'name': parts[2], 'icon': parts[3], 'enabled': True})
                send_telegram_request("sendMessage", {'chat_id': chat_id, 'text': f"✅ Service **{parts[2]}** added!"})
            return

        if text.startswith("/addstock") and is_admin:
            parts = text.split(' ')
            if len(parts) >= 4:
                service_id = parts[1].lower()
                country_code = parts[2].upper()
                num = parts[3].strip()
                key = f"{service_id}:{country_code}"
                if key not in db_stock:
                    db_stock[key] = []
                db_stock[key].append(num)
                c_info = next((c for c in db_countries if c['code'] == country_code), None)
                if not c_info:
                    c_info = {'code': country_code, 'name': country_code, 'flag': get_flag_emoji(country_code)}
                    db_countries.append(c_info)

                flag = c_info['flag']
                country_name = c_info['name']

                # Broadcast notification card to Group
                broadcast_text = f"╔═══════════════════════════════════════╗\n" \
                                 f"   🚀 **NEW NUMBERS ADDED TO STOCK!** 🚀\n" \
                                 f"╚═══════════════════════════════════════╝\n\n" \
                                 f"🌐 **Country:** {flag} **{country_name}** ({country_code}) {flag}\n" \
                                 f"📊 **Total Added Numbers:** `1`\n\n" \
                                 f"🔥 **সবাই কোপানো শুরু করেন কোড আসবে ১০০ ১০০!** 🔥\n\n" \
                                 f"⚡ _Bro's Number Bot — Grab numbers now!_\n" \
                                 f"________________________________________"

                broadcast_card = {
                    'text': broadcast_text,
                    'parse_mode': 'Markdown',
                    'reply_markup': {
                        'inline_keyboard': [
                            [
                                {"text": "📲 Get Number ↗️", "url": "https://t.me/brosnumberbot?start=getnum"},
                                {"text": "💬 Support 👨‍💻", "url": "https://t.me/Prime90999"}
                            ]
                        ]
                    }
                }
                log_to_group(broadcast_card)

                send_telegram_request("sendMessage", {
                    'chat_id': chat_id,
                    'text': f"✅ **Number Added to Stock & Broadcasted!**\n\n📌 Service: `{service_id.upper()}`\n🌐 Country: {c_info['flag']} {c_info['name']}\n📱 Number: `{num}`\n📊 Total Stock: {len(db_stock[key])}",
                    'parse_mode': 'Markdown'
                })
            return

        if text.startswith("/banuser") and is_admin:
            uid = text.replace("/banuser", "").strip()
            if uid:
                db_banned_users.add(str(uid))
                send_telegram_request("sendMessage", {'chat_id': chat_id, 'text': f"🚫 User `{uid}` has been **banned**!", 'parse_mode': 'Markdown'})
            return

        if text.startswith("/unbanuser") and is_admin:
            uid = text.replace("/unbanuser", "").strip()
            if uid:
                db_banned_users.discard(str(uid))
                send_telegram_request("sendMessage", {'chat_id': chat_id, 'text': f"✅ User `{uid}` has been **unbanned**!", 'parse_mode': 'Markdown'})
            return

        if is_admin:
            if "delete service" in lower_text or lower_text.startswith("/delservice") or lower_text.startswith("/deleteservice"):
                parts = text.split(' ')
                if len(parts) >= 2 and parts[1].strip():
                    svc_id = parts[1].strip().lower()
                    db_services = [s for s in db_services if s['id'] != svc_id and s['name'].lower() != svc_id]
                    send_telegram_request("sendMessage", {'chat_id': chat_id, 'text': f"✅ Service `{svc_id}` removed!", 'parse_mode': 'Markdown'})
                else:
                    send_delete_service_menu(chat_id)
                return

            if "delete country" in lower_text or lower_text.startswith("/delcountry") or lower_text.startswith("/deletecountry"):
                parts = text.split(' ')
                if len(parts) >= 2 and parts[1].strip():
                    code = parts[1].strip().upper()
                    db_countries = [c for c in db_countries if c['code'] != code and c['name'].upper() != code]
                    send_telegram_request("sendMessage", {'chat_id': chat_id, 'text': f"✅ Country `{code}` removed!", 'parse_mode': 'Markdown'})
                else:
                    send_delete_country_menu(chat_id)
                return

            if "toggle service" in lower_text or lower_text == "/toggleservices":
                send_service_toggle_menu(chat_id)
                return

            if "toggle countr" in lower_text or lower_text == "/togglecountries":
                send_delete_country_menu(chat_id)
                return

            if "clear service" in lower_text or lower_text == "/clearservices":
                db_services = []
                send_admin_panel(chat_id)
                send_telegram_request("sendMessage", {'chat_id': chat_id, 'text': "✅ **All services have been cleared!**", 'parse_mode': 'Markdown'})
                return

            if "clear countr" in lower_text or lower_text == "/clearcountries":
                db_countries = []
                send_admin_panel(chat_id)
                send_telegram_request("sendMessage", {'chat_id': chat_id, 'text': "✅ **All countries have been cleared!**", 'parse_mode': 'Markdown'})
                return

        if (text.startswith("/viewstocks") or text.startswith("/exportstock") or "view stocks" in lower_text or "stock breakdown" in lower_text or "export stock" in lower_text) and is_admin:
            msg = get_view_stocks_report()
            send_telegram_request("sendMessage", {'chat_id': chat_id, 'text': msg, 'parse_mode': 'Markdown'})
            return

        if lower_text == "/admin" or "admin panel" in lower_text:
            if is_admin: send_admin_panel(chat_id)
        elif lower_text == "/start" or "main menu" in lower_text:
            send_main_menu(chat_id)
        elif "get number" in lower_text or lower_text == "/getnumber":
            send_telegram_request("sendMessage", {'chat_id': chat_id, 'text': "⌨️ **Enter Range ID (1 Number):**", 'parse_mode': 'Markdown'})
        elif "view range" in lower_text or "open range" in lower_text or lower_text == "/range":
            group_url = os.getenv("RANGE_GROUP_URL", os.getenv("GROUP_URL", "https://t.me/Prime90999"))
            inline_keyboard = [
                [{"text": "Open Range Group ↗️", "url": group_url}]
            ]
            send_telegram_request("sendMessage", {
                'chat_id': chat_id,
                'text': "👇 **Click the button below to view active ranges:**",
                'parse_mode': 'Markdown',
                'reply_markup': {"inline_keyboard": inline_keyboard}
            })
        elif "support" in lower_text:
            support_msg = "💎 **JS Super Bot — Support Center** 💎\n\nNeed assistance with virtual numbers or OTP verification? Contact our admin team below:"
            send_telegram_request("sendMessage", {
                'chat_id': chat_id,
                'text': support_msg,
                'parse_mode': 'Markdown',
                'reply_markup': {
                    'inline_keyboard': [
                        [{"text": "👨‍💻 Admin Contact", "url": "https://t.me/Prime90999"}]
                    ]
                }
            })
        elif text == "👤 My Profile" or "Profile" in text:
            profile_msg = f"╔═══════════════════╗\n   👤 **USER ACCOUNT PROFILE**\n╚═══════════════════╝\n"
            profile_msg += f"🆔 **User ID:** `{chat_id}`\n"
            profile_msg += f"📱 **Today OTP:** {db_user_stats.get(str(chat_id), 0)}\n\n"
            profile_msg += f"Balance and refer feature coming soon!\n"
            profile_msg += f"━━━━━━━━━━━━━━━━━━━━━"
            send_main_menu(chat_id, profile_msg)
        elif text == "🔎 Search OTP" or text.startswith("/otp") or (not text.startswith("/") and len(re.sub(r'\D', '', text)) >= 6):
            num_query = text.replace("/otp", "").strip()
            if not num_query or num_query == "🔎 Search OTP":
                send_main_menu(chat_id, "🔎 **Search OTP**\n\nPlease reply with your **Phone Number**:\n\nExample: `+255710962660`")
            else:
                clean_digits = re.sub(r'\D', '', num_query)
                found_num = None
                for n in db_issued_numbers:
                    if re.sub(r'\D', '', n) == clean_digits or clean_digits in re.sub(r'\D', '', n):
                        found_num = n
                        break
                if found_num and db_issued_numbers[found_num].get('fullMessage'):
                    rec = db_issued_numbers[found_num]
                    card = build_otp_card(rec['serviceId'], rec['countryCode'], found_num, rec['fullMessage'], rec['otpCode'])
                    send_telegram_request("sendMessage", {'chat_id': chat_id, **card})
                    log_to_group(card)
                else:
                    send_main_menu(chat_id, f"⚠️ **No OTP Received Yet!**\n\nNo SMS received for `{num_query}`. Please wait or search again.")
        else:
            send_main_menu(chat_id, f"You typed: *{text}*")

import threading

processed_console_hit_ids = set()

def process_and_broadcast_console_hits():
    global processed_console_hit_ids
    voltx_key = os.getenv("VOLTX_API_KEY", "MAB12CD34EF")
    try:
        url = "https://api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api/console"
        res = requests.get(url, headers={"mauthapi": voltx_key}, timeout=10)
        data = res.json()
        meta = data.get("meta", {})
        if meta.get("code") == 200 or meta.get("status") in ["ok", "success"]:
            hits = data.get("data", {}).get("hits", [])
            bot_username = os.getenv("BOT_USERNAME", "brosnumberbot")
            for hit in reversed(hits):
                hit_id = f"{hit.get('sid','')}_{hit.get('range','')}_{hit.get('time','')}_{(hit.get('message','') or '')[:20]}"
                if hit_id in processed_console_hit_ids:
                    continue
                processed_console_hit_ids.add(hit_id)
                if len(processed_console_hit_ids) > 1000:
                    processed_console_hit_ids.pop()

                sid = str(hit.get('sid') or hit.get('service') or 'Facebook').strip()
                raw_ctry = hit.get('country') or hit.get('operator') or hit.get('op') or ''
                if not raw_ctry and hit.get('range'):
                    raw_ctry = re.sub(r'\D', '', hit.get('range'))[:3]
                ctry_code = detect_country_from_phone(hit.get('range') or raw_ctry) or raw_ctry or 'GLOBAL'
                flag = get_flag_emoji(ctry_code)
                ctry_name = str(raw_ctry or ctry_code).strip()
                range_str = hit.get('range', 'N/A')
                sms_body = hit.get('message') or hit.get('text') or hit.get('fullMessage') or 'No SMS content'

                card_text = f"*New Range BOt*\n\n" \
                            f"> ✅ New Active Range ✅ ❞\n" \
                            f"> 🌐 Country: {flag} {ctry_name} ❞\n" \
                            f"> 📊 Range: {range_str} (🔥) ❞\n" \
                            f"> 🔵 Service: {sid} ❞\n" \
                            f"> ✉️ Full SMS: {sms_body} ❞"

                inline_keyboard = [
                    [{"text": "Numbar Bot ↗️", "url": f"https://t.me/{bot_username}?start=getnum"}]
                ]

                log_to_group({
                    'text': card_text,
                    'parse_mode': 'Markdown',
                    'reply_markup': {'inline_keyboard': inline_keyboard}
                })
    except Exception:
        pass

def start_console_poll_loop():
    while True:
        try:
            process_and_broadcast_console_hits()
        except Exception:
            pass
        time.sleep(5)

def main():
    print("🤖 Starting Bro's Number Bot (Polling)...")
    send_telegram_request("setMyCommands", {
        "commands": [
            {"command": "start", "description": "🚀 Start Bot & Main Menu"}
        ]
    })
    
    # Start live Voltx console polling thread
    t = threading.Thread(target=start_console_poll_loop, daemon=True)
    t.start()

    offset = 0
    while True:
        try:
            res = requests.get(f"https://api.telegram.org/bot{BOT_TOKEN}/getUpdates?offset={offset}&timeout=20", timeout=25)
            data = res.json()
            if data.get("ok"):
                for update in data.get("result", []):
                    offset = update["update_id"] + 1
                    handle_update(update)
        except Exception as e:
            print("Polling Error:", e)
            time.sleep(3)

if __name__ == "__main__":
    main()
