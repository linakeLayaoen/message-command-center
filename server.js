const express = require("express");
const path = require("path");
const app = express();
app.use(express.json());

// --- Firebase Admin SDK Setup ---
const admin = require("firebase-admin");
let db;
const fs = require("fs");
try {
  // Load service account: check env var, then Render secret files, then local
  let credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath || !fs.existsSync(credPath)) {
    credPath = "/etc/secrets/firebase-key.json";
  }
  if (!fs.existsSync(credPath)) {
    credPath = path.join(__dirname, "firebase-key.json");
  }
  const serviceAccount = require(credPath);
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  db = admin.firestore();
  console.log("Firebase initialized successfully");
} catch (err) {
  console.error("Firebase initialization error:", err.message);
}

const PORT = process.env.PORT || 10000;
const VERIFY_TOKEN = "vault_2026";

// Root route for homepage/status
app.get("/", (req, res) => {
  res
    .status(200)
    .send(
      "<h1>Message Command Center Backend is Running</h1><p>Welcome to the API backend. For the frontend, visit your Firebase Hosting URL.</p>",
    );
});

// 1. Meta Webhook Handshake
app.get("/webhook", (req, res) => {
  if (req.query["hub.verify_token"] === VERIFY_TOKEN) {
    console.log("WEBHOOK_VERIFIED_SUCCESSFULLY");
    return res.status(200).send(req.query["hub.challenge"]);
  }
  res.status(403).send("Verification failed");
});

// 2. Data Deletion Callback (Required by Meta)
app.post("/deletion", (req, res) => {
  res.status(200).json({
    url: "https://message-command-center.web.app/deletion.html",
    confirmation_code: "DEL_" + Date.now(),
  });
});

// --- Unified /webhook POST route for incoming messages ---
app.post("/webhook", (req, res) => {
  const body = req.body;
  console.log("Webhook POST received:", JSON.stringify(body, null, 2));

  if (!db) {
    console.error("Firestore not initialized");
    return res.sendStatus(500);
  }

  try {
    // WhatsApp Business API payload
    if (body.object === "whatsapp_business_account" && body.entry) {
      for (const entry of body.entry) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value || {};
          const messages = value.messages || [];
          const contacts = value.contacts || [];
          for (const msg of messages) {
            const contact = contacts.find((c) => c.wa_id === msg.from) || {};
            const messageData = {
              app: "whatsapp",
              from: contact.profile?.name || msg.from,
              phone: msg.from,
              text: msg.text
                ? msg.text.body
                : `[${msg.type || "unknown"} message]`,
              timestamp: new Date(Number(msg.timestamp) * 1000).toISOString(),
              type: msg.type || "text",
              raw_id: msg.id,
            };
            console.log("Saving WhatsApp message:", messageData);
            db.collection("vault_messages").add(messageData);
          }
        }
      }
      return res.sendStatus(200);
    }

    // Facebook Messenger / Instagram payload
    if (body.object === "page" || body.object === "instagram") {
      for (const entry of body.entry || []) {
        const messaging = entry.messaging || [];
        for (const event of messaging) {
          if (event.message) {
            const messageData = {
              app: body.object === "page" ? "messenger" : "instagram",
              from: event.sender?.id || "unknown",
              text: event.message.text || "[non-text message]",
              timestamp: new Date(event.timestamp).toISOString(),
              type: "text",
              raw_id: event.message.mid,
            };
            console.log("Saving Messenger/IG message:", messageData);
            db.collection("vault_messages").add(messageData);
          }
        }
      }
      return res.sendStatus(200);
    }

    console.log("Unknown webhook object:", body.object);
    res.sendStatus(404);
  } catch (err) {
    console.error("Webhook processing error:", err);
    res.sendStatus(500);
  }
});

app.listen(PORT, () => console.log(`Vault Engine Live on Port ${PORT}`));
