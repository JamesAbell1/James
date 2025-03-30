const crypto = require("crypto");
const fetch = require("node-fetch");

// Utility functions
const logger = {
  info: (message, data) => console.log(JSON.stringify({ level: 'info', message, data, timestamp: new Date().toISOString() })),
  error: (message, error) => console.error(JSON.stringify({ level: 'error', message, error: error.message, stack: error.stack, timestamp: new Date().toISOString() }))
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const TIMEOUT = 5000; // 5 seconds
const fetchWithTimeout = async (url, options) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
};

const retry = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return retry(fn, retries - 1, delay);
  }
};

const validateResponse = async (response) => {
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API request failed: ${error}`);
  }
  return response;
};

exports.handler = async (event) => {
  try {
    logger.info('Received event', { event });
    
    const { email } = JSON.parse(event.body || "{}");
    if (!email) {
      logger.error('Missing email in request');
      return { statusCode: 400, body: JSON.stringify({ error: "Missing email" }) };
    }

    if (!validateEmail(email)) {
      logger.error('Invalid email format', { email });
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid email format" }) };
    }

    const eventId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const hashedEmail = crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex");

    logger.info('Processing event', { eventId, hashedEmail });

    // Meta via Stape
    await retry(async () => {
      const response = await fetchWithTimeout("https://capig.stape.ma/event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + process.env.CAPIG_API_KEY
        },
        body: JSON.stringify({
          event_name: "Lead",
          event_time: now,
          event_id: eventId,
          action_source: "website",
          event_source_url: "https://your-carrd-site.com",
          user_data: {
            em: hashedEmail,
            client_user_agent: event.headers["user-agent"]
          }
        })
      });
      await validateResponse(response);
      logger.info('Meta event tracked successfully', { eventId });
    });

    // Reddit
    await retry(async () => {
      const response = await fetchWithTimeout("https://ads.reddit.com/conversion-api/v2/event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.REDDIT_TOKEN}`
        },
        body: JSON.stringify({
          event_time: now,
          event_name: "Lead",
          event_id: eventId,
          advertiser_id: process.env.REDDIT_ADVERTISER_ID,
          pixel_id: process.env.REDDIT_PIXEL_ID,
          user: {
            email: hashedEmail,
            ip_address: event.headers["x-forwarded-for"] || "0.0.0.0",
            user_agent: event.headers["user-agent"]
          }
        })
      });
      await validateResponse(response);
      logger.info('Reddit event tracked successfully', { eventId });
    });

    logger.info('All events tracked successfully', { eventId });
    return { statusCode: 200, body: JSON.stringify({ success: true, eventId }) };
  } catch (err) {
    logger.error('Error processing event', err);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ 
        error: err.message,
        eventId: err.eventId // Include eventId if available for debugging
      }) 
    };
  }
};
