// WhatsApp bridge with Firestore outbox relay
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

const client = new Client({
  authStrategy: new LocalAuth(),
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
  console.log("SCAN THIS QR CODE WITH YOUR WHATSAPP");
});

client.on("ready", () => {
  console.log("BRIDGE ONLINE: Listening for personal messages...");
  listenForOutbox();
});

client.on("message", async (msg) => {
  if (msg.body) {
    try {
      const whatsappId = msg.from.split("@")[0];
      // Try to find contact by WhatsApp number
      let contactSnap = await db
        .collection("contacts")
        .where("whatsapp", "==", whatsappId)
        .limit(1)
        .get();
      let contactId;
      if (!contactSnap.empty) {
        contactId = contactSnap.docs[0].id;
      } else {
        // Create new contact if not found
        const newContact = await db.collection("contacts").add({
          name: whatsappId, // You can update this later
          whatsapp: whatsappId,
          aliases: [whatsappId],
        });
        contactId = newContact.id;
      }
      await db.collection("consortium_vault").add({
        text: msg.body,
        contactId,
        app: "whatsapp",
        from: msg.from,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log("Message archived in Vault for contactId:", contactId);
    } catch (err) {
      console.error("Vault Error:", err);
    }
  }
});

// Listen for outgoing messages in Firestore outbox
function listenForOutbox() {
  db.collection("consortium_outbox")
    .where("app", "==", "whatsapp")
    .where("sent", "==", false)
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          try {
            await client.sendMessage(data.to, data.message);
            await change.doc.ref.update({
              sent: true,
              sentAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`Sent WhatsApp reply to ${data.to}: ${data.message}`);
          } catch (err) {
            console.error("Failed to send WhatsApp message:", err);
          }
        }
      });
    });
}

client.initialize();
