const express = require("express");
const app = express();
app.use(express.json());

// --- Firebase Admin SDK Setup ---
const admin = require("firebase-admin");
let db;
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      // Optionally add databaseURL if needed
    });
  }
  db = admin.firestore();
  console.log("Firebase initialized");
} catch (err) {
  console.error("Firebase initialization error:", err);
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
  // Detect which app the message is coming from
  const sourceApp = req.body.entry ? "messenger" : "whatsapp";
  const messageData = {
    app: sourceApp,
    from: req.body.sender_name || "Lulu",
    text: req.body.message_text,
    timestamp: new Date().toLocaleTimeString(),
  };
  // Log the event
  console.log("Incoming Message Event Received", messageData);

  // Save to Firebase if db is available
  if (db && db.collection) {
    db.collection("vault_messages")
      .add(messageData)
      .then(() => res.sendStatus(200))
      .catch((err) => {
        console.error("Firebase error:", err);
        res.sendStatus(500);
      });
  } else {
    res.sendStatus(500);
  }
});

app.listen(PORT, () => console.log(`Vault Engine Live on Port ${PORT}`));
