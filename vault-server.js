const express = require("express");
const admin = require("firebase-admin");

// Initialize Firebase using your downloaded key
const serviceAccount = require("./firebase-key.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

const app = express();
app.use(express.json());

// Make sure this matches the token you put in Render's environment variables
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "vault_2026";

// 1. Handshake for Meta
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// 2. Receiving Messages
app.post("/webhook", async (req, res) => {
  const body = req.body;
  let msgObj = null;

  // -- 1. UNPACK THE MESSAGE --
  if (body.object === "whatsapp_business_account") {
    const entry = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (entry)
      msgObj = { text: entry.text.body, from: entry.from, app: "whatsapp" };
  } else if (body.object === "page" || body.object === "instagram") {
    const entry = body.entry?.[0]?.messaging?.[0];
    if (entry) {
      msgObj = {
        text: entry.message.text,
        from: entry.sender.id,
        app: body.object === "page" ? "meta" : "instagram",
      };
    }
  } else if (body.source === "signal_bridge") {
    msgObj = { text: body.text, from: body.from, app: "signal" };
  }

  // -- 2. CONTACT LOOKUP & VAULT ARCHIVE --
  if (msgObj) {
    let contactId = msgObj.from; // Fallback to the raw ID if we don't know them

    try {
      // Search the database for a contact where their specific app ID matches the sender
      const contactSnap = await db
        .collection("contacts")
        .where(msgObj.app, "==", msgObj.from)
        .limit(1)
        .get();

      if (!contactSnap.empty) {
        contactId = contactSnap.docs[0].id; // We found them! Attach their Master ID.
      } else {
        // Optional: If you want unknown people to auto-generate a profile, you can add that here later.
        console.log(`Unrecognized contact from ${msgObj.app}: ${msgObj.from}`);
      }
    } catch (err) {
      console.error("Lookup Error:", err);
    }

    // Save it all to the vault
    await db.collection("consortium_vault").add({
      ...msgObj,
      contactId: contactId, // This is the magic link for your front-end
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  return res.status(200).send("OK");
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Vault Command Center Server running on port ${PORT}`);
});
