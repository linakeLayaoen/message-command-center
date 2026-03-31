// Instagram Graph API Example
// Replace 'YOUR_TOKEN' with your actual token (use environment variables in production)
const fetch = require('node-fetch');

const token = process.env.INSTAGRAM_TOKEN || 'YOUR_TOKEN';
const instagramUserId = 'YOUR_IG_USER_ID'; // Replace with your Instagram user ID
const url = `https://graph.facebook.com/v18.0/${instagramUserId}/messages`;

async function sendInstagramMessage(recipientId, message) {
  const body = {
    recipient: { id: recipientId },
    message: { text: message },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

// Usage example:
// sendInstagramMessage('recipient_ig_id', 'Hello from Instagram API!').then(console.log);