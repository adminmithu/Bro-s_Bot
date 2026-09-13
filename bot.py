"""
Bro's Number Bot - Standalone Python Runner (Long Polling)
Includes IVAS SMS Portal live parser & Image 2 OTP Card formatting.
"""

import os
import re
import requests
import time

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "8848165401:AAFiUELKvW-apfBB5xBdQc92yzKcqgViwa4")
ADMIN_ID = os.getenv("ADMIN_ID", "8929349073")
GROUP_ID = os.getenv("GROUP_ID", "-1004296466829")

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
    'TG': '🇹🇬', 'TOGO': '🇹🇬'
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

def send_main_menu(chat_id, text="👋 **Welcome to Bro's Number Bot!**\n\nPlease select an option below:"):
    reply_markup = {
        "keyboard": [
            [
                {"text": "📲 Get Number", "style": "success"},
                {"text": "🔎 Search OTP", "style": "primary"}
            ],
            [
                {"text": "📞 Support", "style": "danger"},
                {"text": "👤 My Profile", "style": "primary"}
            ],
            [
                {"text": "⚙️ Admin Panel", "style": "primary"}
            ]
        ],
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
    if not active_services:
        return send_telegram_request('sendMessage', {'chat_id': chat_id, 'text': "⚠️ **No active services available.**"})

    inline_keyboard = []
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
        'text': "📲 **Select a Social Media Service:**",
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
        key1 = f"{service_id}:{c1['code']}"
        stock1 = len(db_stock.get(key1, []))
        row.append({"text": f"{c1['flag']} {c1['name']} ({stock1})", "callback_data": f"num_{service_id}_{c1['code']}"})

        if i + 1 < len(db_countries):
            c2 = db_countries[i + 1]
            key2 = f"{service_id}:{c2['code']}"
            stock2 = len(db_stock.get(key2, []))
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

def send_admin_panel(chat_id, message_id=None):
    traffic_data = get_live_traffic_analytics()
    summary_text = "⚙️ **BRO'S BOT ADMIN CONTROL PANEL** ⚙️\n\n"
    summary_text += f"📊 **Bot Stats:** Users: `{len(db_all_users)}` | Status: {'🚧 **Maintenance ON**' if db_maintenance else '🟢 **Active**'} | Total OTPs: `{traffic_data['total_otps']}`\n\n"

    summary_text += "🔥 **LIVE COUNTRY OTP TRAFFIC:**\n"
    if not traffic_data['items']:
        summary_text += "ℹ️ _No OTP traffic recorded yet._\n"
    else:
        for item in traffic_data['items'][:5]:
            summary_text += f"{item['serviceIcon']} {item['serviceName']} | {item['countryFlag']} **{item['countryName']}** ({item['countryCode']}): **{item['otpCount']} OTPs received**\n"

    summary_text += "\n📦 **CURRENT STOCK BREAKDOWN:**\n"
    stock_entries = []
    for s in db_services:
        for c in db_countries:
            key = f"{s['id']}:{c['code']}"
            cnt = len(db_stock.get(key, []))
            if cnt > 0:
                stock_entries.append(f"{s['icon']} {s['name']} | {c['flag']} {c['name']} ({c['code']}): **{cnt} numbers in stock**")
    if not stock_entries:
        summary_text += "⚠️ _No stock numbers currently available in bot database._\n"
    else:
        summary_text += "\n".join(stock_entries) + "\n"

    summary_text += "\n👇 **Use the Colored Admin Reply Keyboard below to manage your bot:**"

    reply_keyboard = {
        "keyboard": [
            [
                {"text": "📥 Add Stock (.txt)", "style": "success"},
                {"text": "📦 Stock Breakdown", "style": "primary"}
            ],
            [
                {"text": "📈 Live Traffic Details", "style": "primary"},
                {"text": "📢 Broadcast", "style": "danger"}
            ],
            [
                {"text": "➕ Add Service", "style": "success"},
                {"text": "🔄 Toggle Services", "style": "primary"}
            ],
            [
                {"text": "➕ Add Country", "style": "success"},
                {"text": "❌ Delete Country", "style": "danger"}
            ],
            [
                {"text": "🚫 Ban User", "style": "danger"},
                {"text": "✅ Unban User", "style": "success"}
            ],
            [
                {"text": "👤 User Info", "style": "primary"},
                {"text": "📥 Export Stock", "style": "primary"}
            ],
            [
                {"text": "📲 Live SMS Tester", "style": "primary"},
                {"text": f"🛠 Maint: {'ON 🚧' if db_maintenance else 'OFF 🟢'}", "style": "danger"}
            ],
            [
                {"text": "🗑 Clear Stock", "style": "danger"},
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

        if data == "back_to_services":
            send_service_selection(chat_id)
        elif data.startswith("svc_"):
            service_id = data.replace("svc_", "")
            send_country_selection(chat_id, service_id)
        elif data.startswith("num_"):
            parts = data.split("_")
            service_id, country_code = parts[1], parts[2]
            key = f"{service_id}:{country_code}"
            available = db_stock.get(key, [])

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
        elif data == "admin_stock_details":
            text = "📦 **FULL NUMBER STOCK BREAKDOWN** 📦\n\n"
            stock_lines = []
            for s in db_services:
                for c in db_countries:
                    key = f"{s['id']}:{c['code']}"
                    cnt = len(db_stock.get(key, []))
                    status_badge = f"🟢 `{cnt}` in stock" if cnt > 0 else "🔴 **OUT OF STOCK**"
                    stock_lines.append(f"{s['icon']} **{s['name']}** | {c['flag']} **{c['name']}** (`{c['code']}`)\n└ Status: {status_badge}")
            if not stock_lines:
                text += "⚠️ _No stock numbers or countries added yet._\n"
            else:
                text += "\n\n".join(stock_lines)
            send_telegram_request('editMessageText', {
                'chat_id': chat_id,
                'message_id': message_id,
                'text': text,
                'parse_mode': 'Markdown',
                'reply_markup': {"inline_keyboard": [
                    [{"text": "🔙 Back to Admin", "callback_data": "admin_stock"}, {"text": "🏠 Main Menu", "callback_data": "back_to_main_menu"}]
                ]}
            })
        elif data == "admin_broadcast":
            text = "📢 **BROADCAST ANNOUNCEMENT**\n\nTo send a broadcast message to all bot users, send text in format:\n`/broadcast Your announcement message here`\n\n*Example:*\n`/broadcast 🔥 New Facebook US numbers added to stock!`"
            send_telegram_request('editMessageText', {
                'chat_id': chat_id,
                'message_id': message_id,
                'text': text,
                'parse_mode': 'Markdown',
                'reply_markup': {"inline_keyboard": [
                    [{"text": "🔙 Back to Admin", "callback_data": "admin_stock"}, {"text": "🏠 Main Menu", "callback_data": "back_to_main_menu"}]
                ]}
            })
        elif data == "admin_addsvc":
            text = "➕ **ADD NEW SERVICE**\n\nTo add a new service, send text command:\n`/addservice <id> <name> <icon>`\n\n*Example:*\n`/addservice telegram Telegram ✈️`"
            send_telegram_request('editMessageText', {
                'chat_id': chat_id,
                'message_id': message_id,
                'text': text,
                'parse_mode': 'Markdown',
                'reply_markup': {"inline_keyboard": [
                    [{"text": "🔙 Back to Admin", "callback_data": "admin_stock"}, {"text": "🏠 Main Menu", "callback_data": "back_to_main_menu"}]
                ]}
            })
        elif data == "admin_togglesvc_menu":
            send_service_toggle_menu(chat_id, message_id)
        elif data.startswith("admin_togglesvc_"):
            svc_id = data.replace("admin_togglesvc_", "")
            svc = next((s for s in db_services if s['id'] == svc_id), None)
            if svc:
                svc['enabled'] = not svc.get('enabled', True)
            send_service_toggle_menu(chat_id, message_id)
        elif data == "admin_toggle_maint":
            db_maintenance = not db_maintenance
            send_admin_panel(chat_id, message_id)
        elif data == "admin_addcountry":
            text = "➕ **ADD NEW COUNTRY**\n\nTo add a country, send text command:\n`/addcountry <Country Name>`\n\n*Example:*\n`/addcountry United States` or `/addcountry BD`"
            send_telegram_request('editMessageText', {
                'chat_id': chat_id,
                'message_id': message_id,
                'text': text,
                'parse_mode': 'Markdown',
                'reply_markup': {"inline_keyboard": [
                    [{"text": "🔙 Back to Admin", "callback_data": "admin_stock"}, {"text": "🏠 Main Menu", "callback_data": "back_to_main_menu"}]
                ]}
            })
        elif data == "admin_delcountry_menu":
            send_delete_country_menu(chat_id, message_id)
        elif data.startswith("admin_confirm_delcountry_"):
            code = data.replace("admin_confirm_delcountry_", "")
            db_countries = [c for c in db_countries if c['code'] != code]
            send_delete_country_menu(chat_id, message_id)
        elif data == "admin_banuser":
            text = "🚫 **BAN USER**\n\nTo ban a user from using the bot, send text command:\n`/banuser <user_id>`\n\n*Example:*\n`/banuser 123456789`"
            send_telegram_request('editMessageText', {
                'chat_id': chat_id,
                'message_id': message_id,
                'text': text,
                'parse_mode': 'Markdown',
                'reply_markup': {"inline_keyboard": [
                    [{"text": "🔙 Back to Admin", "callback_data": "admin_stock"}, {"text": "🏠 Main Menu", "callback_data": "back_to_main_menu"}]
                ]}
            })
        elif data == "admin_unbanuser":
            text = "✅ **UNBAN USER**\n\nTo unban a user, send text command:\n`/unbanuser <user_id>`\n\n*Example:*\n`/unbanuser 123456789`"
            send_telegram_request('editMessageText', {
                'chat_id': chat_id,
                'message_id': message_id,
                'text': text,
                'parse_mode': 'Markdown',
                'reply_markup': {"inline_keyboard": [
                    [{"text": "🔙 Back to Admin", "callback_data": "admin_stock"}, {"text": "🏠 Main Menu", "callback_data": "back_to_main_menu"}]
                ]}
            })
        elif data == "admin_userinfo":
            text = "👤 **USER SEARCH & DETAILS**\n\nTo view details and order history for a user, send text command:\n`/userinfo <user_id>`\n\n*Example:*\n`/userinfo 8929349073`"
            send_telegram_request('editMessageText', {
                'chat_id': chat_id,
                'message_id': message_id,
                'text': text,
                'parse_mode': 'Markdown',
                'reply_markup': {"inline_keyboard": [
                    [{"text": "🔙 Back to Admin", "callback_data": "admin_stock"}, {"text": "🏠 Main Menu", "callback_data": "back_to_main_menu"}]
                ]}
            })
        elif data == "admin_exportstock":
            text = "📥 **EXPORT STOCK**\n\nTo view stock numbers for a service and country, send text command:\n`/exportstock <service> <country_code>`\n\n*Example:*\n`/exportstock facebook US`"
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

        # Receive Live SMS from IVAS Portal
        if text.startsWith("/receivesms") and is_admin:
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

        if (text.startswith("/delcountry") or text.startswith("/deletecountry")) and is_admin:
            code = text.replace("/delcountry", "").replace("/deletecountry", "").strip().upper()
            if code:
                db_countries = [c for c in db_countries if c['code'] != code]
                send_telegram_request("sendMessage", {'chat_id': chat_id, 'text': f"✅ Country `{code}` removed!", 'parse_mode': 'Markdown'})
            return

        if text.startswith("/userinfo") and is_admin:
            uid = text.replace("/userinfo", "").strip()
            if uid:
                is_b = str(uid) in db_banned_users
                msg = f"👤 **USER INFO & HISTORY**\n\n🆔 User ID: `{uid}`\n🚫 Status: {'BANNED 🔴' if is_b else 'ACTIVE 🟢'}\n"
                send_telegram_request("sendMessage", {'chat_id': chat_id, 'text': msg, 'parse_mode': 'Markdown'})
            return

        if text == "/admin" or text == "⚙️ Admin Panel":
            if is_admin: send_admin_panel(chat_id)
        elif text == "/start" or "Start" in text:
            send_main_menu(chat_id)
        elif text == "📲 Get Number" or "Get Number" in text:
            send_service_selection(chat_id)
        elif text == "📞 Support":
            support_msg = "💎 **Bro's Number Bot — Support Center** 💎\n\nNeed assistance with virtual numbers or OTP verification? Contact our admin team below:"
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

def main():
    print("🤖 Starting Bro's Number Bot (Polling)...")
    send_telegram_request("setMyCommands", {
        "commands": [
            {"command": "start", "description": "🚀 Start Bot & Main Menu"}
        ]
    })
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
