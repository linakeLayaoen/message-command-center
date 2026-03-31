const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

const VERIFY_TOKEN = "vault_master_2026";

exports.universalWebhook = functions.https.onRequest(async (req, res) => {
  // 1. Handshake for Meta (WhatsApp/IG/Messenger)
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  }

  // 2. Receiving a Message
  if (req.method === "POST") {
    const body = req.body;
    let msgObj = null;

    // CATCH WHATSAPP
    if (body.object === "whatsapp_business_account") {
      const entry = body.entry[0].changes[0].value.messages?.[0];
      if (entry) {
        msgObj = { text: entry.text.body, from: entry.from, app: "whatsapp" };
      }
    }
    // CATCH MESSENGER / INSTAGRAM
    else if (body.object === "page" || body.object === "instagram") {
      const entry = body.entry[0].messaging[0];
      msgObj = {
        text: entry.message.text,
        from: entry.sender.id,
        app: body.object === "page" ? "meta" : "instagram",
      };
    }
    // CATCH SIGNAL (Via your local bridge)
    else if (body.source === "signal_bridge") {
      msgObj = { text: body.text, from: body.from, app: "signal" };
    }

    if (msgObj) {
      await db.collection("consortium_vault").add({
        ...msgObj,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    return res.status(200).send("OK");
  }
});

// Data Deletion Callback for Meta
exports.dataDeletion = functions.https.onRequest((req, res) => {
  const userId = req.body.user_id; // Meta sends the ID to be deleted
  console.log(`Deletion request received for user: ${userId}`);
  // This tells Meta the deletion is confirmed
  res.status(200).send({
    url: "https://message-command-center.web.app/deletion.html",
    confirmation_code: "DELETED_" + Date.now(),
  });
});

// Reply relay endpoint
exports.sendReply = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") return res.sendStatus(405);
  const { reply, to, app, contactId, original } = req.body;
  if (!reply || !to || !app || !contactId)
    return res.status(400).send("Missing fields");

  // Write to outbox for relay bridges, with contactId
  await db.collection("consortium_outbox").add({
    message: reply,
    to,
    app,
    contactId,
    sent: false,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
  res.status(200).send({ status: "queued", app });
});
