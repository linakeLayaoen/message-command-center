// WhatsApp Cloud API Example
// Replace 'YOUR_TOKEN' with your actual token (use environment variables in production)
const fetch = require("node-fetch");

const token = process.env.WHATSAPP_TOKEN || "YOUR_TOKEN";
const phoneNumberId = "YOUR_PHONE_NUMBER_ID"; // Replace with your WhatsApp phone number ID
const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

async function sendWhatsAppMessage(to, message) {
  const body = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: message },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

// Usage example:
// sendWhatsAppMessage('recipient_phone_number', 'Hello from WhatsApp API!').then(console.log);
