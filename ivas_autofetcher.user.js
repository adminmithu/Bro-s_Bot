// ==UserScript==
// @name         IVAS SMS Auto-Fetcher & Telegram OTP Broadcaster
// @namespace    http://tampermonkey.net/
// @version      3.2
// @description  Automatically fetches live SMS from IVAS Portal links with Cloudflare resilience, auto-login helper & persistent Telegram OTP broadcasting.
// @author       Prime ADMIN
// @match        https://www.ivasms.com/portal/*
// @grant        GM_xmlhttpRequest
// @connect      api.telegram.org
// @connect      *
// ==UserScript==

(function() {
    'use strict';

    const BOT_TOKEN = "8848165401:AAFiUELKvW-apfBB5xBdQc92yzKcqgViwa4";
    const GROUP_ID = "-1004296466829";
    const CHECK_INTERVAL_SECONDS = 3;
    const AUTO_REFRESH_SECONDS = 45;

    // IVAS Login Credentials Auto-Fill
    const AUTO_LOGIN_EMAIL = "mithucb999@gmail.com";

    const currentUrl = window.location.href;
    const isLink1 = currentUrl.includes("/portal/live/my_sms");
    const isLink2 = currentUrl.includes("/portal/sms/test/sms");
    const isLoginPage = currentUrl.includes("/portal/login");

    // Persist processed messages in localStorage to prevent duplicate sends & preserve state across reloads/login redirects
    function getStoredMessages() {
        try {
            const raw = localStorage.getItem('ivas_processed_ids');
            if (raw) return new Set(JSON.parse(raw).slice(-1000));
        } catch (e) {
            console.error("Storage error:", e);
        }
        return new Set();
    }

    function saveStoredMessages(setObj) {
        try {
            const arr = Array.from(setObj).slice(-1000);
            localStorage.setItem('ivas_processed_ids', JSON.stringify(arr));
        } catch (e) {
            console.error("Storage save error:", e);
        }
    }

    const processedMessages = getStoredMessages();
    let sentCount = 0;
    let reloadTimer = null;

    console.log(`🚀 IVAS SMS Auto-Fetcher 3.2 Activated for: ${isLink1 ? 'Link 1 (User + Group)' : isLink2 ? 'Group Only' : isLoginPage ? 'Login Page' : 'Portal'}`);

    // Create & Inject Floating Status Badge UI
    function injectStatusUI() {
        if (document.getElementById('ivas-status-ui')) return;
        const ui = document.createElement('div');
        ui.id = 'ivas-status-ui';
        ui.style.position = 'fixed';
        ui.style.top = '12px';
        ui.style.right = '12px';
        ui.style.zIndex = '999999';
        ui.style.padding = '8px 14px';
        ui.style.borderRadius = '8px';
        ui.style.fontFamily = 'monospace, sans-serif';
        ui.style.fontSize = '13px';
        ui.style.fontWeight = 'bold';
        ui.style.color = '#ffffff';
        ui.style.backgroundColor = 'rgba(15, 23, 42, 0.92)';
        ui.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        ui.style.border = '1px solid rgba(255,255,255,0.15)';
        ui.style.backdropFilter = 'blur(6px)';
        ui.innerHTML = `🚀 <b>IVAS Fetcher:</b> <span id="ivas-status-text" style="color: #4ade80;">Active</span> | Sent: <span id="ivas-sent-count">0</span>`;
        document.body.appendChild(ui);
    }

    function updateStatusUI(statusText, color = '#4ade80') {
        const textEl = document.getElementById('ivas-status-text');
        const countEl = document.getElementById('ivas-sent-count');
        if (textEl) {
            textEl.innerText = statusText;
            textEl.style.color = color;
        }
        if (countEl) {
            countEl.innerText = sentCount;
        }
    }

    // Cloudflare Challenge Detector
    function isCloudflareActive() {
        const title = document.title.toLowerCase();
        if (title.includes("just a moment") || title.includes("cloudflare") || title.includes("attention required")) {
            return true;
        }
        if (document.querySelector('#challenge-running') ||
            document.querySelector('#challenge-stage') ||
            document.querySelector('.cf-browser-verification') ||
            document.querySelector('#cf-wrapper') ||
            document.querySelector('iframe[src*="challenges.cloudflare.com"]')) {
            return true;
        }
        return false;
    }

    function sendToTelegram(payload) {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        if (typeof GM_xmlhttpRequest !== 'undefined') {
            GM_xmlhttpRequest({
                method: "POST",
                url: url,
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify(payload),
                onload: function(response) {
                    console.log("Telegram Delivery Response:", response.responseText);
                },
                onerror: function(err) {
                    console.error("GM_xmlhttpRequest Error, falling back to fetch:", err);
                    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(e => console.error(e));
                }
            });
        } else {
            fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(e => console.error(e));
        }
    }

    function extractOtpCode(messageContent) {
        if (!messageContent) return 'N/A';
        const numMatch = messageContent.match(/\b\d{4,8}\b/);
        if (numMatch) return numMatch[0];

        const maskMatch = messageContent.match(/\bX{4,8}\b/i);
        if (maskMatch) return maskMatch[0];

        const hyphenMatch = messageContent.match(/\b(?:\d|X){3,4}[- ](?:\d|X){3,4}\b/i);
        if (hyphenMatch) return hyphenMatch[0];

        const kwMatch = messageContent.match(/(?:code|is|codigo|código|verification|verificação|codice|kod)[:\s]+([A-Z0-9X-]{4,10})/i);
        if (kwMatch && kwMatch[1]) return kwMatch[1];

        return 'N/A';
    }

    function getFlagEmoji(countryStr) {
        if (!countryStr) return '🌐';
        const clean = countryStr.replace(/\s*\d+$/g, '').trim().toUpperCase();

        const map = {
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
            'SA': '🇸🇦', 'SAUDI ARABIA': '🇸🇦', 'SAUDI': '🇸🇦',
            'TZ': '🇹🇿', 'TANZANIA': '🇹🇿',
            'TG': '🇹🇬', 'TOGO': '🇹🇬',
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

        if (map[clean]) return map[clean];
        for (const k in map) {
            if (clean.includes(k) || k.includes(clean)) return map[k];
        }
        if (clean.length === 2 && /^[A-Z]{2}$/.test(clean)) {
            return String.fromCodePoint(...[...clean].map(c => 127397 + c.charCodeAt(0)));
        }
        return '🌐';
    }

    function buildOtpCard(serviceName, countryStr, phoneNumber, messageContent) {
        const lowerSid = (serviceName || '').toLowerCase();
        const lowerMsg = (messageContent || '').toLowerCase();

        let icon = '📸';
        let serviceTitle = 'INSTAGRAM';

        if (lowerSid.includes('facebook') || lowerMsg.includes('facebook') || lowerMsg.includes('fb')) {
            icon = '📘';
            serviceTitle = 'FACEBOOK';
        } else if (lowerSid.includes('whatsapp') || lowerMsg.includes('whatsapp') || lowerMsg.includes('wa')) {
            icon = '💬';
            serviceTitle = 'WHATSAPP';
        } else if (lowerSid.includes('instagram') || lowerMsg.includes('instagram') || lowerMsg.includes('ig')) {
            icon = '📸';
            serviceTitle = 'INSTAGRAM';
        }

        const cleanCountry = (countryStr || 'GLOBAL').replace(/\s*\d+$/g, '').trim().toUpperCase();
        const flag = getFlagEmoji(cleanCountry);
        const otpCode = extractOtpCode(messageContent);
        const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

        let cardText = `╔═══════════════════════════════════════╗\n`;
        cardText += `   ${icon} **${serviceTitle} OTP RECEIVED**\n`;
        cardText += `╚═══════════════════════════════════════╝\n\n`;
        cardText += `${flag} **${cleanCountry} - BRO'S NUMBER BOT**\n`;
        cardText += `${icon} ${flag} \`${formattedPhone}\`\n`;
        cardText += `💬 Language: #GLOBAL\n`;
        cardText += `🌍 Country: ${flag} (${cleanCountry})\n`;
        cardText += `🔐 OTP: \`${otpCode}\`\n\n`;
        cardText += `📩 **Message:**\n${messageContent}\n`;
        cardText += `________________________________________`;

        return {
            chat_id: GROUP_ID,
            text: cardText,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: `${otpCode} 📋`, callback_data: `copy_${otpCode}`, copy_text: { text: `${otpCode}` }, style: "success" },
                        { text: "Get number ↗️", url: "https://t.me/brosnumberbot?start=getnum", style: "primary" }
                    ]
                ]
            }
        };
    }

    // Auto-Login Credentials Helper
    function handleAutoLogin() {
        if (!window.location.href.includes("/portal/login")) return false;

        injectStatusUI();
        updateStatusUI("🔑 Auto-Login Active", "#3b82f6");

        const emailInput = document.querySelector('input[name="email"], input[type="email"], #email');
        if (emailInput && (!emailInput.value || emailInput.value !== AUTO_LOGIN_EMAIL)) {
            emailInput.value = AUTO_LOGIN_EMAIL;
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
            emailInput.dispatchEvent(new Event('change', { bubbles: true }));
            console.log("🔑 Auto-filled email:", AUTO_LOGIN_EMAIL);
        }

        return true;
    }

    function checkLiveSMS() {
        // Auto-login handler if on login page
        if (window.location.href.includes("/login")) {
            handleAutoLogin();
            if (!isCloudflareActive() && document.querySelector('table')) {
                window.location.href = "https://www.ivasms.com/portal/live/my_sms";
                return;
            }
        }

        // Auto-recover if page redirected to /logout
        if (window.location.href.includes("/logout")) {
            if (!isCloudflareActive()) {
                console.log("🔄 Session ended, auto-navigating back to Link 1...");
                window.location.href = "https://www.ivasms.com/portal/live/my_sms";
                return;
            }
        }

        if (isCloudflareActive()) {
            console.warn("⚠️ Cloudflare challenge detected! Pausing table check & reloads until verification completes.");
            updateStatusUI("⚠️ Cloudflare Check", "#f59e0b");
            if (reloadTimer) {
                clearTimeout(reloadTimer);
                reloadTimer = null;
            }
            // Auto-check title restoration every 2 seconds
            setTimeout(() => {
                if (!isCloudflareActive() && (window.location.href.includes("/logout") || window.location.href.includes("/login"))) {
                    window.location.href = "https://www.ivasms.com/portal/live/my_sms";
                }
            }, 2000);
            return;
        }

        injectStatusUI();
        updateStatusUI("🟢 Active", "#4ade80");

        const rows = document.querySelectorAll("table tr");
        rows.forEach(row => {
            const cells = row.querySelectorAll("td");
            if (cells.length >= 4) {
                const countryText = cells[0].innerText.trim();
                const phoneText = cells[1].innerText.trim().replace(/\s+/g, '');
                const sidText = cells[2].innerText.trim();
                const messageText = cells[3] ? cells[3].innerText.trim() : '';

                if (phoneText && messageText) {
                    const uniqueId = `${phoneText}_${messageText}`;
                    if (!processedMessages.has(uniqueId)) {
                        processedMessages.add(uniqueId);
                        saveStoredMessages(processedMessages);
                        sentCount++;

                        if (isLink1) {
                            console.log(`📩 [Link 1 Live OTP] Capturing & Sending to Group: ${phoneText} | SID: ${sidText}`);
                            const payload = buildOtpCard(sidText, countryText, phoneText, messageText);
                            sendToTelegram(payload);
                            updateStatusUI("🟢 Link 1 Active", "#4ade80");
                        } else if (isLink2) {
                            const rangeName = countryText.trim(); // e.g. CAMBODIA 7290, TOGO 1447, BENIN 6396
                            console.log(`📡 [Link 2 Live Range] Active Range Detected: ${rangeName} | SID: ${sidText}`);
                            updateStatusUI(`📡 Range: ${rangeName}`, "#3b82f6");

                            // Notify Bot Server of Live Range activity
                            const pingUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
                            // Post range update to backend API if needed
                        }
                    }
                }
            }
        });

        // Ensure auto-refresh is active when page is healthy
        if (!reloadTimer) {
            reloadTimer = setTimeout(() => {
                if (!isCloudflareActive()) {
                    console.log("🔄 Auto-refreshing tab to keep connection fresh...");
                    location.reload();
                } else {
                    console.log("⏸️ Postponing reload because Cloudflare is active.");
                    reloadTimer = null;
                }
            }, AUTO_REFRESH_SECONDS * 1000);
        }
    }

    // Interval checks
    setInterval(checkLiveSMS, CHECK_INTERVAL_SECONDS * 1000);
    checkLiveSMS();

})();
