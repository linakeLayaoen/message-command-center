import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import {
  collection,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCtg0Ff_gJU-oY2q2EDpZmUmsf_hWw9O5c",
  authDomain: "message-command-center.firebaseapp.com",
  projectId: "message-command-center",
  storageBucket: "message-command-center.appspot.com",
  messagingSenderId: "6044429735",
  appId: "1:55473733150:web:0632be2ec0522ea47ab80f",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const messagesCol = collection(db, "consortium_vault");
const contactsCol = collection(db, "contacts");
const feed = document.getElementById("feed");
let currentFilter = "ALL";

// Load contacts and messages, then group by contact
async function loadAndRender() {
  const [contactsSnap, messagesSnap] = await Promise.all([
    getDocs(contactsCol),
    getDocs(query(messagesCol, orderBy("timestamp", "desc"))),
  ]);
  const contacts = {};
  contactsSnap.forEach((doc) => {
    contacts[doc.id] = doc.data();
  });
  const messages = [];
  messagesSnap.forEach((doc) => messages.push({ ...doc.data(), id: doc.id }));
  renderGrouped(messages, contacts);
}

onSnapshot(messagesCol, loadAndRender);
onSnapshot(contactsCol, loadAndRender);

function renderGrouped(messages, contacts) {
  feed.innerHTML = "";
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  // Group messages by contactId
  const grouped = {};
  messages.forEach((msg) => {
    if (!grouped[msg.contactId]) grouped[msg.contactId] = [];
    grouped[msg.contactId].push(msg);
  });
  Object.entries(grouped).forEach(([contactId, msgs], groupIdx) => {
    const contact = contacts[contactId] || { name: "Unknown" };
    // Filter by search
    const filteredMsgs = msgs.filter((msg) => {
      const matchesFilter =
        currentFilter === "ALL" ||
        (msg.app && msg.app.toUpperCase() === currentFilter);
      const matchesSearch =
        msg.text?.toLowerCase().includes(searchTerm) ||
        msg.from?.toLowerCase().includes(searchTerm) ||
        contact.name?.toLowerCase().includes(searchTerm);
      return matchesFilter && matchesSearch;
    });
    if (filteredMsgs.length === 0) return;
    // Contact header
    const contactDiv = document.createElement("div");
    contactDiv.className = "msg-card";
    contactDiv.style.background = "#222b36";
    contactDiv.innerHTML = `<span style="font-size:1.1em;font-weight:bold;">${contact.name}</span>`;
    feed.appendChild(contactDiv);
    // Messages for this contact
    filteredMsgs.forEach((msg, idx) => {
      const card = document.createElement("div");
      card.className = "msg-card";
      card.style.borderLeftColor = getAppColor(msg.app);
      card.innerHTML = `
        <span class="app-badge">${msg.app?.toUpperCase() || "UNKNOWN"}</span>
        <span style="font-weight:bold; color:#fff;">${msg.from || "Unknown"}</span>
        <p>${msg.text}</p>
        <small style="color: #8b949e;">${msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleString() : "Syncing..."}</small>
        <div style="margin-top:10px;">
          <input type="text" id="replyInput-${groupIdx}-${idx}" placeholder="Reply..." style="width:60%;padding:6px;">
          <select id="replyApp-${groupIdx}-${idx}" style="padding:6px;">
            ${contact.whatsapp ? `<option value="whatsapp">WhatsApp</option>` : ""}
            ${contact.signal ? `<option value="signal">Signal</option>` : ""}
            ${contact.meta ? `<option value="meta">Meta</option>` : ""}
            ${contact.instagram ? `<option value="instagram">Instagram</option>` : ""}
          </select>
          <button id="replyBtn-${groupIdx}-${idx}" style="padding:6px 12px;">Reply</button>
        </div>
      `;
      feed.appendChild(card);
      // Add reply logic
      setTimeout(() => {
        const replyBtn = document.getElementById(`replyBtn-${groupIdx}-${idx}`);
        const replyInput = document.getElementById(
          `replyInput-${groupIdx}-${idx}`,
        );
        const replyApp = document.getElementById(`replyApp-${groupIdx}-${idx}`);
        if (replyBtn && replyInput && replyApp) {
          replyBtn.onclick = async () => {
            const replyText = replyInput.value.trim();
            const app = replyApp.value;
            let to = "";
            if (app === "whatsapp") to = contact.whatsapp;
            else if (app === "signal") to = contact.signal;
            else if (app === "meta") to = contact.meta;
            else if (app === "instagram") to = contact.instagram;
            if (!replyText || !to) return;
            replyBtn.disabled = true;
            replyBtn.textContent = "Sending...";
            try {
              await fetch("/reply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  reply: replyText,
                  to,
                  app,
                  contactId,
                  original: msg.text,
                }),
              });
              replyBtn.textContent = "Sent!";
              replyInput.value = "";
            } catch (e) {
              replyBtn.textContent = "Error";
            }
            setTimeout(() => {
              replyBtn.textContent = "Reply";
              replyBtn.disabled = false;
            }, 1500);
          };
        }
      }, 0);
    });
  });
}

function getAppColor(app) {
  const colors = {
    whatsapp: "#25D366",
    signal: "#3A76F0",
    meta: "#0668E1",
    instagram: "#E4405F",
  };
  return colors[app] || "#58a6ff";
}

window.setFilter = function (filter) {
  currentFilter = filter;
  document
    .querySelectorAll(".filter-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document.getElementById("btn-" + filter).classList.add("active");
  // Re-render will happen on next snapshot, or you can force a render if you cache last data
  // For now, just rely on snapshot
};

document.getElementById("searchInput").addEventListener("input", () => {
  // Re-render will happen on next snapshot, or you can force a render if you cache last data
  // For now, just rely on snapshot
});
