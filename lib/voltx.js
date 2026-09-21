/**
 * Bro's Number Bot - Voltx SMS (2oo9 Cloud) Full API Integration Module
 * Base Path: https://api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api
 * Authentication: mauthapi: <YOUR_API_KEY>
 */

const VOLTX_BASE_URL = process.env.VOLTX_BASE_URL || "https://api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api";
const VOLTX_API_KEY = process.env.VOLTX_API_KEY || "MAB12CD34EF";
const VOLTX_EMAIL = process.env.VOLTX_EMAIL || "mithucb999@gmail.com";
const VOLTX_PASSWORD = process.env.VOLTX_PASSWORD || "Mithu@808";

let cachedVoltxToken = null;

async function loginVoltxAccount(email = null, password = null, loginUrl = null) {
  const mailToUse = email || process.env.VOLTX_EMAIL || VOLTX_EMAIL;
  const passToUse = password || process.env.VOLTX_PASSWORD || VOLTX_PASSWORD;
  const targetUrl = loginUrl || process.env.VOLTX_LOGIN_URL || "https://zero.voltxsms.com/api/auth/login";

  if (!mailToUse || !passToUse) {
    return { success: false, error: "Email and password are required for login." };
  }

  const endpointsToTry = [
    targetUrl,
    "https://zero.voltxsms.com/api/auth/login",
    "https://zero.voltxsms.com/api/login",
    "https://api.2oo9.cloud/auth/login"
  ];

  for (const url of endpointsToTry) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: mailToUse, password: passToUse, mail: mailToUse, pass: passToUse })
      });
      const data = await res.json();
      const token = data?.token || data?.data?.token || data?.access_token || data?.data?.access_token || data?.mauthapi;

      if (token) {
        cachedVoltxToken = token;
        return { success: true, token, raw: data };
      }
    } catch (err) {
      console.log(`[Voltx Login Attempt Error - ${url}]:`, err.message);
    }
  }

  return { success: false, error: "Failed to authenticate with Voltx portal. Check Email & Password." };
}

function getApiKey(overrideKey = null) {
  if (overrideKey) return overrideKey;
  if (cachedVoltxToken) return cachedVoltxToken;
  return process.env.VOLTX_API_KEY || VOLTX_API_KEY;
}

/**
 * 1. Allocate a virtual number from Voltx SMS using Range ID (rid)
 * POST /getnum
 * Body: { "rid": "26134" }
 */
async function allocateVoltxNumber(rid, apiKey = null, isRetry = false) {
  let keyToUse = getApiKey(apiKey);
  const endpoint = `${VOLTX_BASE_URL.replace(/\/$/, '')}/getnum`;

  if (!rid) {
    return { success: false, error: "Range ID (rid) is required." };
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'mauthapi': keyToUse,
        'mauth': keyToUse,
        'Authorization': `Bearer ${keyToUse}`,
        'Cookie': `mauth=${keyToUse}`
      },
      body: JSON.stringify({ rid: String(rid).trim() })
    });

    const data = await response.json();

    if (data && data.meta && (data.meta.code === 200 || data.meta.status === 'ok')) {
      return {
        success: true,
        fullNumber: data.data?.full_number || (data.data?.no_plus_number ? `+${data.data.no_plus_number}` : null),
        nationalNumber: data.data?.national_number || null,
        noPlusNumber: data.data?.no_plus_number || null,
        country: data.data?.country || 'Unknown',
        operator: data.data?.operator || 'Unknown',
        data: data.data,
        rid: data.rid || rid,
        raw: data
      };
    }

    const errMsg = (data?.message || data?.meta?.message || '').toLowerCase();
    if (!isRetry && (errMsg.includes('invalid') || errMsg.includes('expired') || errMsg.includes('token') || errMsg.includes('unauthorized') || !data?.meta)) {
      console.log("[Voltx SMS] Attempting auto-login using credentials...");
      const loginRes = await loginVoltxAccount();
      if (loginRes.success && loginRes.token) {
        return await allocateVoltxNumber(rid, loginRes.token, true);
      }
    }

    if (data && data.meta && data.meta.code === 2946) {
      return { success: false, isOutOfStock: true, error: "Range is currently Out of Stock (Code 2946).", raw: data };
    } else {
      return {
        success: false,
        error: data?.message || data?.meta?.message || `API Error Code: ${data?.meta?.code || response.status}`,
        raw: data
      };
    }
  } catch (err) {
    console.error("[Voltx SMS getnum Error]:", err);
    return { success: false, error: err.message };
  }
}

/**
 * 2. Get Recently-active services + ranges each one hit (Access Cache)
 * GET /liveaccess
 */
async function getVoltxLiveAccess(apiKey = null) {
  const keyToUse = getApiKey(apiKey);
  const endpoint = `${VOLTX_BASE_URL.replace(/\/$/, '')}/liveaccess`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'mauthapi': keyToUse,
        'mauth': keyToUse,
        'Authorization': `Bearer ${keyToUse}`,
        'Cookie': `mauth=${keyToUse}`
      }
    });

    const data = await response.json();

    if (data && data.meta && (data.meta.code === 200 || data.meta.status === 'ok')) {
      return {
        success: true,
        services: data.data?.services || [],
        cached: data.data?.cached || false,
        raw: data
      };
    } else {
      return { success: false, error: data?.message || data?.meta?.message || `API Error: ${response.status}` };
    }
  } catch (err) {
    console.error("[Voltx SMS liveaccess Error]:", err);
    return { success: false, error: err.message };
  }
}

/**
 * 3. Get your own last 50 successful OTPs
 * GET /success-otp
 */
async function getVoltxSuccessOtp(apiKey = null) {
  const keyToUse = getApiKey(apiKey);
  const endpoint = `${VOLTX_BASE_URL.replace(/\/$/, '')}/success-otp`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { 'mauthapi': keyToUse }
    });

    const data = await response.json();

    if (data && data.meta && (data.meta.code === 200 || data.meta.status === 'ok')) {
      return {
        success: true,
        otps: data.data?.otps || [],
        cached: data.data?.cached || false,
        raw: data
      };
    } else {
      return { success: false, error: data?.message || data?.meta?.message || `API Error: ${response.status}` };
    }
  } catch (err) {
    console.error("[Voltx SMS success-otp Error]:", err);
    return { success: false, error: err.message };
  }
}

/**
 * 4. Get Global live feed of recent hits (last 15 minutes)
 * GET /console
 */
async function getVoltxConsole(apiKey = null) {
  const keyToUse = getApiKey(apiKey);
  const endpoint = `${VOLTX_BASE_URL.replace(/\/$/, '')}/console`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { 'mauthapi': keyToUse }
    });

    const data = await response.json();

    if (data && data.meta && (data.meta.code === 200 || data.meta.status === 'ok')) {
      return {
        success: true,
        hits: data.data?.hits || [],
        cached: data.data?.cached || false,
        raw: data
      };
    } else {
      return { success: false, error: data?.message || data?.meta?.message || `API Error: ${response.status}` };
    }
  } catch (err) {
    console.error("[Voltx SMS console Error]:", err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  allocateVoltxNumber,
  getVoltxLiveAccess,
  getVoltxSuccessOtp,
  getVoltxConsole,
  loginVoltxAccount,
  VOLTX_BASE_URL
};
