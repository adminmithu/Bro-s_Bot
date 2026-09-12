/**
 * Bro's Number Bot - Vercel Cron Job Handler
 * Triggered automatically by Vercel Cron according to schedule in vercel.json
 * Automatically pings IVAS SMS Portal, fetches Link 1 & Link 2, parses SMS, and broadcasts!
 */

const { fetchAndProcessIVAS } = require('../lib/ivas.js');

const CRON_SECRET = process.env.CRON_SECRET;

module.exports = async function handler(req, res) {
  // Optional security check for Vercel Cron Header
  if (CRON_SECRET) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return res.status(401).json({ success: false, message: 'Unauthorized cron request' });
    }
  }

  console.log(`[Vercel Cron Executed] Time: ${new Date().toISOString()}`);

  try {
    // Automatically fetch live SMS from IVAS Portal Link 1 & Link 2
    const result = await fetchAndProcessIVAS();

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      message: "IVAS SMS Auto-Fetcher executed successfully!",
      result: result
    });
  } catch (error) {
    console.error("Cron Execution Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

