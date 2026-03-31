docker run -d ^
  --name signal-cli-rest-api ^
  -p 8080:8080 ^
  -v C:\your\signal\config:/home/.local/share/signal-cli ^
  bbernhard/signal-cli-rest-api:latest// Unified Webhook Server for WhatsApp, Instagram, Messenger
// Replace placeholders with your actual values and use environment variables for secrets in production
const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK (replace with your Firebase project config)
// admin.initializeApp({ credential: admin.credential.cert(require('./serviceAccountKey.json')) });
// const db = admin.firestore();

const app = express();
app.use(bodyParser.json());

// Set these as environment variables or replace with your actual values
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'YOUR_VERIFY_TOKEN';

// --- Webhook Verification (GET) ---
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// --- Webhook Receiver (POST) ---
app.post('/webhook', (req, res) => {
  const body = req.body;
  // WhatsApp
  if (body.object === 'whatsapp_business_account') {
    // Handle WhatsApp messages
    // Example: relay to Firebase
    // db.collection('messages').add({ platform: 'whatsapp', data: body });
    console.log('WhatsApp webhook:', JSON.stringify(body, null, 2));
  }
  // Instagram
  else if (body.object === 'instagram') {
    // Handle Instagram messages
    // db.collection('messages').add({ platform: 'instagram', data: body });
    console.log('Instagram webhook:', JSON.stringify(body, null, 2));
  }
  // Messenger
  else if (body.object === 'page') {
    // Handle Messenger messages
    // db.collection('messages').add({ platform: 'messenger', data: body });
    console.log('Messenger webhook:', JSON.stringify(body, null, 2));
  }
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Webhook server running on port ${PORT}`));

// --- Meta App Setup Instructions ---
// 1. Deploy this server to a public URL (use ngrok for local testing: ngrok http 3000)
// 2. In Meta for Developers portal, set your webhook URL to https://your-domain.com/webhook
// 3. Set VERIFY_TOKEN in both your code and Meta portal
// 4. Subscribe to WhatsApp, Instagram, and Messenger events
// 5. Use your actual API tokens/IDs in your message sending code (see previous examples)
// 6. Relay incoming messages to your backend (e.g., Firebase, as shown above)
