# 👻 GhostBridge: Secure Retail Print Stream

**GhostBridge** is a high-speed, privacy-first "zero-footprint" file transfer bridge designed specifically for retail print shops. It eliminates the need for awkward WhatsApp messages, clunky emails, or insecure USB drives by creating a temporary, memory-only pipe between a customer's phone and a shop's workstation.

---

## ⚡ Key Features

### 🌫️ The Ghost Protocol (Zero-Footprint)
Security is at the core of GhostBridge. Unlike traditional upload services:
* **No Database:** Files are never written to a server disk.
* **RAM-Only Rendering:** Files are stored as volatile **Blob URLs** in the browser's memory.
* **Instant Purge:** Clicking "Finish" invokes `URL.revokeObjectURL()`, physically wiping the data from the workstation's RAM.

### ♻️ Paper-Saver Mode (Dynamic Grid)
Built for efficiency and sustainability.
* **Dynamic Grid Layout:** Toggle Grid Mode to fit up to 4 images on a single A4 sheet.
* **Auto-Flow:** Handles 1, 2, 3, or 4 images gracefully using CSS Grid logic.
* **Smart Detection:** Automatically scales images for the grid while keeping PDFs in full-page format to preserve legibility.

### 🔗 Seamless Handshake
* **QR Entry:** Customers join the session instantly by scanning a dynamic QR code. 
* **Socket-Streaming:** Uses **Socket.io** for real-time bidirectional communication. The moment a user hits "Beam," the file appears on the shop screen with near-zero latency.

---

## 📡 System Workflow



1. **Initialization:** Shop generates a unique `RoomID` via the dashboard.
2. **Tunneling:** Customer scans QR and establishes a private WebSocket tunnel.
3. **Beaming:** Files are converted to Base64 and streamed directly to the shop’s RAM.
4. **Rendering:** The PC receives data and generates a local Blob preview—no "Downloads" folder involved.
5. **Output:** Shopkeeper triggers `window.print()`; CSS isolates the documents from the UI.
6. **The Ghost Purge:** Session ends; all memory addresses are flushed.

---

## 🛠️ Tech Stack

* **Frontend:** React.js + Tailwind CSS
* **Backend:** Node.js + Express.js
* **Real-time Engine:** Socket.io
* **Layout:** CSS Grid & `@media print` isolation

---

## 🚀 Installation & Setup

### 1. Clone & Install
```bash
git clone [https://github.com/your-username/ghostbridge.git](https://github.com/your-username/ghostbridge.git)
cd ghostbridge
npm install
```

### 2. Configure Endpoint
To enable the bridge between the customer's mobile device and the shop workstation, update the socket URL in `SecureUploader.jsx` to your local network IP or your public tunnel URL:

```javascript
// File: src/SecureUploader.jsx
const socket = io("[http://10.145.50.165:3000](http://10.145.50.165:3000)");

```
## 🚀 3. Run the System

To launch the **GhostBridge** environment, you must start both the real-time relay server and the frontend interface. Open two separate terminal windows:

### **A. Start the Backend (Socket Relay)**
This initializes the Socket.io engine that handles the private rooms and file streaming.
```bash
node server.js

```

## 🛡️ Why GhostBridge?

In a typical print shop, customers often share personal phone numbers or send private documents over public networks. **GhostBridge** acts as a "disposable bridge"—once the print is done, the bridge collapses, and the data disappears forever.

**Privacy is not a feature; it's the foundation.**

---
© 2026 GhostBridge Protocol | Secure. Volatile. Instant.
