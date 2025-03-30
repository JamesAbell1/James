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

// Main handler function
exports.handler = async (event, context) => {
  // Validate request method
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse and validate request body
    const body = JSON.parse(event.body);
    const { email, event_type } = body;

    // Handle page view events
    if (event_type === 'pageview') {
      logEvent('pageview_request', { event_type });
      
      // Send page view events in parallel
      const [facebookResult, redditResult] = await Promise.all([
        sendPageViewToFacebook(event),
        sendPageViewToReddit(event)
      ]);

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Page view events sent successfully',
          facebook: facebookResult,
          reddit: redditResult
        })
      };
    }

    // Handle lead events
    if (event_type === 'lead') {
      if (!email || !email.includes('@')) {
        logEvent('validation_error', {
          error: 'Invalid email format',
          email
        });
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid email format' })
        };
      }

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

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Lead events sent successfully',
          facebook: facebookResult,
          reddit: redditResult
        })
      };
    }

    // Invalid event type
    logEvent('invalid_event_type', { event_type });
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid event type' })
    };

  } catch (error) {
    logEvent('handler_error', {
      error: error.message,
      stack: error.stack
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
}; 