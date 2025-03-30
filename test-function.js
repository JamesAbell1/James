const fetch = require('node-fetch');

async function testLeadTracking() {
  try {
    const response = await fetch('http://localhost:8888/.netlify/functions/track-lead', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Test-Script/1.0',
        'X-Forwarded-For': '127.0.0.1'
      },
      body: JSON.stringify({
        email: 'test@example.com'
      })
    });

    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('Status:', response.status);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the test
testLeadTracking(); 