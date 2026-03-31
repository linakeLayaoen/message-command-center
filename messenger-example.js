// Facebook Messenger API Example
// Replace 'YOUR_TOKEN' with your actual token (use environment variables in production)
const fetch = require('node-fetch');

const token = process.env.MESSENGER_TOKEN || 'YOUR_TOKEN';
const pageId = 'YOUR_PAGE_ID'; // Replace with your Facebook Page ID
const url = `https://graph.facebook.com/v18.0/me/messages?access_token=${token}`;

async function sendMessengerMessage(recipientId, message) {
  const body = {
    recipient: { id: recipientId },
    message: { text: message },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

// Usage example:
// sendMessengerMessage('recipient_psid', 'Hello from Messenger API!').then(console.log);