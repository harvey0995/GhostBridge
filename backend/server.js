const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  // INCREASED LIMIT: 100MB (1e8) to ensure high-res files don't get cut off
  maxHttpBufferSize: 1e8, 
  transports: ['websocket', 'polling']
});

// Middleware with 100MB limit for JSON payloads
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

const connectedDevices = new Map();

// ============================================
// SOCKET.IO CORE LOGIC
// ============================================

io.on('connection', (socket) => {
  const connectionTime = new Date().toLocaleTimeString();
  console.log(`\n✅ [${connectionTime}] Device Connected: ${socket.id}`);

  // 1. JOIN ROOM
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    
    connectedDevices.set(socket.id, {
      socketId: socket.id,
      room: roomId,
      connectedAt: new Date().toLocaleTimeString()
    });

    console.log(`🏠 [ROOM JOIN] Device joined: ${roomId}`);
    
    io.to(roomId).emit('devices-updated', {
      totalCount: io.sockets.adapter.rooms.get(roomId)?.size || 0,
      timestamp: new Date().toLocaleTimeString()
    });
  });

  // 2. FILE BEAMING (Supports up to 100MB)
  socket.on("send-file", (data) => {
    const { room, file } = data;
    const clickTime = new Date().toLocaleTimeString();

    console.log(`\n📡 [FILE INCOMING]`);
    console.log(`   Name: ${file.name}`);
    console.log(`   Type: ${file.type}`);
    console.log(`   Size: ${file.size} MB`);
    console.log(`   Target Room: ${room}`);

    // VALIDATION: Check if data is actually present
    if (!file.content || file.content.length < 10) {
      console.log(`   ❌ ERROR: File content missing or corrupted!`);
      return;
    }

    // BEAMING: Using socket.to(room) sends it to EVERYONE ELSE in that room
    // If the Laptop is in that room, it will receive it.
    socket.to(room).emit("receive-file", file);
    
    console.log(`   🚀 RESULT: Beamed to room ${room}`);

    // Confirm to phone
    socket.emit('click-confirmed', { 
      status: 'success', 
      fileName: file.name,
      timestamp: clickTime 
    });
  });

  socket.on('disconnect', () => {
    const device = connectedDevices.get(socket.id);
    if (device) {
      console.log(`❌ Device disconnected from room: ${device.room}`);
      connectedDevices.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════════╗`);
  console.log(`║     🔗 GHOSTBRIDGE - 100MB SECURE SERVER   ║`);
  console.log(`╚════════════════════════════════════════════╝\n`);
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📦 Max File Size: 100MB`);
});