const admin = require("firebase-admin");
const fs = require("fs");

// Initialize Firebase using your service account key
const serviceAccount = require("./firebase-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

async function uploadContacts() {
  // Read the JSON file you just generated
  const rawData = fs.readFileSync("contact-lookup.json");
  const contactsMap = JSON.parse(rawData);

  const batchArray = [];
  let currentBatch = db.batch();
  let operationCounter = 0;
  let totalUploaded = 0;

  console.log(`Preparing to upload contacts to the Vault...`);

  // Loop through your JSON (Format: { "7783230609": "Name" })
  for (const [phone, name] of Object.entries(contactsMap)) {
    const docRef = db.collection("contacts").doc(); // Auto-generate a clean ID
    
    // Check if the number already has a country code, if not, prepend a '1' (assuming NA numbers)
    // This fixes the WhatsApp format issue we talked about earlier
    const formattedPhone = phone.length === 10 ? `1${phone}` : phone;

    currentBatch.set(docRef, {
      name: name,
      whatsapp: formattedPhone, 
      signal: formattedPhone,   
      aliases: [phone, formattedPhone]
    });

    operationCounter++;
    totalUploaded++;

    // Firestore has a strict limit of 500 operations per batch.
    // We commit at 450 just to be safe.
    if (operationCounter === 450) {
      batchArray.push(currentBatch.commit());
      currentBatch = db.batch(); // Start a fresh batch
      operationCounter = 0;
      console.log(`Queued ${totalUploaded} contacts...`);
    }
  }

  // Commit any leftover contacts in the final batch
  if (operationCounter > 0) {
    batchArray.push(currentBatch.commit());
  }

  // Wait for all batches to finish uploading
  await Promise.all(batchArray);
  console.log(`SUCCESS: ${totalUploaded} contacts successfully seeded into the database!`);
}

uploadContacts().catch(console.error);
