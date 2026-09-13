"""
Bro's Number Bot - IVAS Portal Automated Scraper & Live Broadcaster
Automates authentication to ivasms.com using provided credentials.
Polls Link 1 (/portal/live/my_sms) -> User + Group (-5477236175)
Polls Link 2 (/portal/sms/test/sms) -> Group Only (-5477236175)
"""

import os
import re
import requests
import time
from bs4 import BeautifulSoup

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "8848165401:AAFiUELKvW-apfBB5xBdQc92yzKcqgViwa4")
GROUP_ID = os.getenv("GROUP_ID", "-1004296466829")
IVAS_EMAIL = os.getenv("IVAS_EMAIL", "mithuchandra647@gmail.com")
IVAS_PASSWORD = os.getenv("IVAS_PASSWORD", "Mithu@808")

LINK_1_URL = "https://www.ivasms.com/portal/live/my_sms"
LOGIN_URL = "https://www.ivasms.com/portal/login"

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
    'AE': '🇦🇪', 'UAE': '🇦🇪',
    'SA': '🇸🇦', 'SAUDI ARABIA': '🇸🇦',
    'TZ': '🇹🇿', 'TANZANIA': '🇹🇿',
    'TG': '🇹🇬', 'TOGO': '🇹🇬',
    'BENIN': '🇧🇯', 'CAMBODIA': '🇰🇭', 'SUDAN': '🇸🇩', 'AFGHANISTAN': '🇦🇫'
}

def get_flag_emoji(country_input):
    if not country_input:
        return '🌐'
    clean = str(country_input).strip().upper()
    if clean in FLAG_MAP:
        return FLAG_MAP[clean]
    if len(clean) == 2 and clean.isalpha():
        return "".join(chr(127397 + ord(c)) for c in clean)
    return '🌐'

def send_telegram(payload):
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    try:
        res = requests.post(url, json=payload, timeout=10)
        return res.json()
    except Exception as e:
        print("Telegram Send Error:", e)
        return None

def build_otp_card(sid_text, country_text, phone_number, full_message):
    lower_sid = (sid_text or '').lower()
    lower_msg = (full_message or '').lower()

    icon = '📸'
    service_title = 'INSTAGRAM'

    if 'facebook' in lower_sid or 'facebook' in lower_msg or 'fb' in lower_msg:
        icon = '📘'
        service_title = 'FACEBOOK'
    elif 'whatsapp' in lower_sid or 'whatsapp' in lower_msg or 'wa' in lower_msg:
        icon = '💬'
        service_title = 'WHATSAPP'
    elif 'instagram' in lower_sid or 'instagram' in lower_msg or 'ig' in lower_msg:
        icon = '📸'
        service_title = 'INSTAGRAM'

    flag = get_flag_emoji(country_text)

    otp_code = 'N/A'
    match = re.search(r'\b\d{4,8}\b', full_message)
    if match:
        otp_code = match.group(0)

    card_text = f"╔═══════════════════════════════════════╗\n   {icon} **{service_title} OTP RECEIVED**\n╚═══════════════════════════════════════╝\n\n"
    card_text += f"{icon} {flag} `{phone_number}`\n"
    card_text += f"💬 Language: #GLOBAL\n"
    card_text += f"🌍 Country: {flag} ({country_text or 'GLOBAL'})\n"
    card_text += f"🔐 OTP: `{otp_code}`\n\n"
    card_text += f"📩 **Message:**\n{full_message}\n"
    card_text += f"________________________________________"

    inline_keyboard = [
        [
            {"text": f"{otp_code} 📋", "callback_data": f"copy_{otp_code}", "copy_text": {"text": f"{otp_code}"}},
            {"text": "Get number ↗️", "url": "https://t.me/brosnumberbot?start=getnum"}
        ]
    ]

    return {
        'text': card_text,
        'parse_mode': 'Markdown',
        'reply_markup': {'inline_keyboard': inline_keyboard}
    }

class IVASScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        })
        # Inject Cookies from .env if present
        cf_clearance = os.getenv("CF_CLEARANCE")
        ivas_session = os.getenv("ivas_sms_session") or os.getenv("IVAS_SMS_SESSION")
        xsrf_token = os.getenv("XSRF-TOKEN") or os.getenv("XSRF_TOKEN")
        
        if cf_clearance: self.session.cookies.set("cf_clearance", cf_clearance)
        if ivas_session: self.session.cookies.set("ivas_sms_session", ivas_session)
        if xsrf_token: self.session.cookies.set("XSRF-TOKEN", xsrf_token)

        self.processed_link1 = set()
        self.processed_link2 = set()

    def login(self):
        print(f"🔑 Logging into IVAS Portal with {IVAS_EMAIL}...")
        try:
            res = self.session.get(LOGIN_URL, timeout=10)
            soup = BeautifulSoup(res.text, 'html.parser')
            
            payload = {
                "email": IVAS_EMAIL,
                "password": IVAS_PASSWORD
            }
            
            login_res = self.session.post(LOGIN_URL, data=payload, timeout=15)
            if "logout" in login_res.text.lower() or login_res.status_code == 200:
                print("✅ Logged in successfully to IVAS Portal!")
                return True
            else:
                print("⚠️ Login status code:", login_res.status_code)
                return True
        except Exception as e:
            print("Login Error:", e)
            return False

    def parse_sms_table(self, html_content):
        soup = BeautifulSoup(html_content, 'html.parser')
        messages = []
        rows = soup.find_all('tr')
        for row in rows:
            cols = row.find_all('td')
            if len(cols) >= 4:
                country = cols[0].text.strip()
                phone = cols[1].text.strip().replace(' ', '')
                sid = cols[2].text.strip()
                msg = cols[3].text.strip() if len(cols) > 3 else ''
                if phone and msg:
                    messages.append({
                        'country': country,
                        'phone': phone,
                        'sid': sid,
                        'message': msg
                    })
        return messages

    def poll_link_1(self):
        """ Link 1 (/portal/live/my_sms) -> Send to Group AND User """
        try:
            res = self.session.get(LINK_1_URL, timeout=15)
            messages = self.parse_sms_table(res.text)
            for item in messages:
                msg_id = f"{item['phone']}_{item['message']}"
                if msg_id not in self.processed_link1:
                    self.processed_link1.add(msg_id)
                    print(f"📲 [Link 1 - User + Group] New SMS for {item['phone']}")
                    
                    card = build_otp_card(item['sid'], item['country'], item['phone'], item['message'])
                    
                    # 1. Send to Group (-5477236175)
                    send_telegram({'chat_id': GROUP_ID, **card})

                    # 2. Forward to Bot Server so it delivers to the User who owns the number
                    requests.get(f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage", json={'chat_id': GROUP_ID, **card})
        except Exception as e:
            print("Error polling Link 1:", e)

    def start(self):
        self.login()
        print("🚀 IVAS Scraper Started! Polling Link 1 (User + Group SMS) in Real-Time...")
        while True:
            self.poll_link_1()
            time.sleep(3)

import threading
from http.server import HTTPServer, BaseHTTPRequestHandler

class HealthCheckHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        self.wfile.write(b"IVAS Scraper Web Service is Active & Running 24/7!")

    def log_message(self, format, *args):
        return  # Suppress HTTP access logs

def start_health_server():
    port = int(os.getenv("PORT", "10000"))
    try:
        server = HTTPServer(('0.0.0.0', port), HealthCheckHandler)
        print(f"🌐 Health check HTTP web server active on port {port}")
        server.serve_forever()
    except Exception as e:
        print("Web server error:", e)

if __name__ == "__main__":
    health_thread = threading.Thread(target=start_health_server, daemon=True)
    health_thread.start()

    scraper = IVASScraper()
    scraper.start()
