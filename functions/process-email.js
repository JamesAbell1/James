const crypto = require('crypto');
const axios = require('axios');
const { promisify } = require('util');
const setTimeoutPromise = promisify(setTimeout);

// Constants
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const REQUEST_TIMEOUT = 5000; // 5 seconds

// Utility function to hash email
const hashEmail = (email) => {
  const normalizedEmail = email.toLowerCase().trim();
  return crypto.createHash('sha256').update(normalizedEmail).digest('hex');
};

// Utility function to generate event ID
const generateEventId = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Utility function to log events
const logEvent = (event, data) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event,
    ...data
  }));
};

// Function to send page view event to Facebook via Stape
const sendPageViewToFacebook = async (event, retryCount = 0) => {
  try {
    const eventId = generateEventId();
    const response = await axios.post('https://capig.stape.ma/event', {
      event_name: 'PageView',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: 'website',
      event_source_url: process.env.WEBSITE_URL || 'https://yourdomain.com',
      user_data: {
        client_user_agent: event.headers['user-agent'] || 'Mozilla/5.0...',
        client_ip_address: event.headers['x-forwarded-for'] || event.headers['x-real-ip']
      }
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.CAPIG_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: REQUEST_TIMEOUT
    });

    logEvent('facebook_pageview_sent', {
      status: 'success',
      response: response.data,
      event_id: eventId
    });

    return response.data;
  } catch (error) {
    logEvent('facebook_pageview_error', {
      error: error.message,
      retryCount,
      stack: error.stack
    });

    if (retryCount < MAX_RETRIES) {
      await setTimeoutPromise(RETRY_DELAY * (retryCount + 1));
      return sendPageViewToFacebook(event, retryCount + 1);
    }

    throw error;
  }
};

// Function to send page view event to Reddit
const sendPageViewToReddit = async (event, retryCount = 0) => {
  try {
    const eventId = generateEventId();
    const response = await axios.post('https://ads.reddit.com/conversion-api/v2/event', {
      event_name: 'PageVisit',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      advertiser_id: process.env.REDDIT_ADVERTISER_ID,
      pixel_id: process.env.REDDIT_PIXEL_ID,
      user: {
        ip_address: event.headers['x-forwarded-for'] || event.headers['x-real-ip'],
        user_agent: event.headers['user-agent'] || 'Mozilla/5.0...'
      }
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.REDDIT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: REQUEST_TIMEOUT
    });

    logEvent('reddit_pageview_sent', {
      status: 'success',
      response: response.data,
      event_id: eventId
    });

    return response.data;
  } catch (error) {
    logEvent('reddit_pageview_error', {
      error: error.message,
      retryCount,
      stack: error.stack
    });

    if (retryCount < MAX_RETRIES) {
      await setTimeoutPromise(RETRY_DELAY * (retryCount + 1));
      return sendPageViewToReddit(event, retryCount + 1);
    }

    throw error;
  }
};

// Function to send lead event to Facebook via Stape
const sendLeadToFacebook = async (hashedEmail, event, retryCount = 0) => {
  try {
    const eventId = generateEventId();
    const response = await axios.post('https://capig.stape.ma/event', {
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: 'website',
      event_source_url: process.env.WEBSITE_URL || 'https://yourdomain.com',
      user_data: {
        em: [hashedEmail],
        client_user_agent: event.headers['user-agent'] || 'Mozilla/5.0...',
        client_ip_address: event.headers['x-forwarded-for'] || event.headers['x-real-ip']
      }
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.CAPIG_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: REQUEST_TIMEOUT
    });

    logEvent('facebook_lead_sent', {
      status: 'success',
      response: response.data,
      event_id: eventId
    });

    return response.data;
  } catch (error) {
    logEvent('facebook_lead_error', {
      error: error.message,
      retryCount,
      stack: error.stack
    });

    if (retryCount < MAX_RETRIES) {
      await setTimeoutPromise(RETRY_DELAY * (retryCount + 1));
      return sendLeadToFacebook(hashedEmail, event, retryCount + 1);
    }

    throw error;
  }
};

// Function to send lead event to Reddit
const sendLeadToReddit = async (hashedEmail, event, retryCount = 0) => {
  try {
    const eventId = generateEventId();
    const response = await axios.post('https://ads.reddit.com/conversion-api/v2/event', {
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      advertiser_id: process.env.REDDIT_ADVERTISER_ID,
      pixel_id: process.env.REDDIT_PIXEL_ID,
      user: {
        email: hashedEmail,
        ip_address: event.headers['x-forwarded-for'] || event.headers['x-real-ip'],
        user_agent: event.headers['user-agent'] || 'Mozilla/5.0...'
      }
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.REDDIT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: REQUEST_TIMEOUT
    });

    logEvent('reddit_lead_sent', {
      status: 'success',
      response: response.data,
      event_id: eventId
    });

    return response.data;
  } catch (error) {
    logEvent('reddit_lead_error', {
      error: error.message,
      retryCount,
      stack: error.stack
    });

    if (retryCount < MAX_RETRIES) {
      await setTimeoutPromise(RETRY_DELAY * (retryCount + 1));
      return sendLeadToReddit(hashedEmail, event, retryCount + 1);
    }

    throw error;
  }
};

// Utility function to create response with CORS headers
const createResponse = (statusCode, body) => {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  };
};

// Main handler function
exports.handler = async (event, context) => {
  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, {});
  }

  // Validate request method
  if (event.httpMethod !== 'POST') {
    return createResponse(405, { error: 'Method not allowed' });
  }

  try {
    // Parse and validate request body
    const body = JSON.parse(event.body);
    const { email, event_type } = body;

    // Log the incoming request
    logEvent('incoming_request', {
      event_type,
      email: email ? 'REDACTED' : undefined,
      headers: event.headers
    });

    // Handle page view events
    if (event_type === 'pageview') {
      logEvent('pageview_request', { event_type });
      
      try {
        // Send page view events in parallel
        const [facebookResult, redditResult] = await Promise.all([
          sendPageViewToFacebook(event),
          sendPageViewToReddit(event)
        ]);

        return createResponse(200, {
          message: 'Page view events sent successfully',
          facebook: facebookResult,
          reddit: redditResult
        });
      } catch (error) {
        logEvent('pageview_error', {
          error: error.message,
          stack: error.stack,
          facebook_error: error.response?.data,
          reddit_error: error.response?.data
        });
        throw error;
      }
    }

    // Handle lead events
    if (event_type === 'lead') {
      if (!email || !email.includes('@')) {
        logEvent('validation_error', {
          error: 'Invalid email format',
          email: 'REDACTED'
        });
        return createResponse(400, { 
          error: 'Invalid email format',
          details: 'Email must be a valid email address'
        });
      }

      try {
        // Hash the email
        const hashedEmail = hashEmail(email);
        logEvent('email_processed', {
          email_hash: hashedEmail
        });

        // Send lead events in parallel
        const [facebookResult, redditResult] = await Promise.all([
          sendLeadToFacebook(hashedEmail, event),
          sendLeadToReddit(hashedEmail, event)
        ]);

        return createResponse(200, {
          message: 'Lead events sent successfully',
          facebook: facebookResult,
          reddit: redditResult
        });
      } catch (error) {
        logEvent('lead_error', {
          error: error.message,
          stack: error.stack,
          facebook_error: error.response?.data,
          reddit_error: error.response?.data
        });
        throw error;
      }
    }

    // Invalid event type
    logEvent('invalid_event_type', { event_type });
    return createResponse(400, { 
      error: 'Invalid event type',
      details: 'Event type must be either "pageview" or "lead"'
    });

  } catch (error) {
    logEvent('handler_error', {
      error: error.message,
      stack: error.stack,
      response_data: error.response?.data
    });

    return createResponse(500, {
      error: 'Internal server error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}; 