/**
 * ============================================
 * SOCKET SPECIALIST - BACKEND SERVER
 * Real-time Click Event Broadcasting System
 * ============================================
 * 
 * Purpose: Efficient socket server that:
 * 1. Receives click events from one device
 * 2. Broadcasts to all other connected devices
 * 3. Logs everything to console (visible in terminal)
 * 4. Tracks device connections/disconnections
 */

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
require('dotenv').config();

// ============================================
// SERVER INITIALIZATION
// ============================================

const app = express();
const server = http.createServer(app);

const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 60000
});

// ============================================
// MIDDLEWARE
// ============================================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// IN-MEMORY DEVICE STORAGE
// ============================================

const connectedDevices = new Map();

/**
 * Device Object Structure:
 * {
 *   socketId: string,
 *   deviceType: 'laptop' | 'phone',
 *   deviceName: string,
 *   connectedAt: timestamp,
 *   lastActivity: timestamp
 * }
 */

// ============================================
// HTTP ROUTES
// ============================================

/**
 * Health Check Endpoint
 * Test this: http://localhost:3000/health
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    connectedDevices: connectedDevices.size,
    devices: Array.from(connectedDevices.values()).map(d => ({
      deviceType: d.deviceType,
      deviceName: d.deviceName,
      connectedAt: d.connectedAt
    }))
  });
});

/**
 * Get Connected Devices
 * Test this: http://localhost:3000/devices
 */
app.get('/devices', (req, res) => {
  const devicesList = Array.from(connectedDevices.values());
  res.json({
    count: devicesList.length,
    devices: devicesList
  });
});

/**
 * Root Route - Server Info
 * Test this: http://localhost:3000
 */
app.get('/', (req, res) => {
  res.json({
    message: 'Socket Specialist Backend Running',
    version: '1.0.0',
    instructions: {
      step1: 'Frontend sends -> register-device event with {type, name}',
      step2: 'Frontend sends -> button-clicked event',
      step3: 'Backend logs to console: console.log("Clicked!")',
      step4: 'Backend broadcasts -> click-received event to other devices'
    },
    socketEvents: {
      listen: ['register-device', 'button-clicked'],
      emit: ['devices-updated', 'click-received', 'click-confirmed']
    }
  });
});

// ============================================
// SOCKET.IO EVENTS (CORE LOGIC)
// ============================================

io.on('connection', (socket) => {
  const connectionTime = new Date().toLocaleTimeString();
  console.log(`\n✅ [${connectionTime}] Device Connected: ${socket.id}\n`);

  // ========================================
  // EVENT 1: Register Device
  // Frontend sends: socket.emit('register-device', {type: 'phone', name: 'MyPhone'})
  // ========================================
  socket.on('register-device', (deviceInfo) => {
    const registerTime = new Date().toLocaleTimeString();

    connectedDevices.set(socket.id, {
      socketId: socket.id,
      deviceType: deviceInfo.type || 'unknown',
      deviceName: deviceInfo.name || `${deviceInfo.type}-${socket.id.slice(0, 5)}`,
      connectedAt: registerTime,
      lastActivity: registerTime
    });

    console.log(`📱 Device Registered`);
    console.log(`   Type: ${deviceInfo.type}`);
    console.log(`   Name: ${deviceInfo.name}`);
    console.log(`   Total Connected: ${connectedDevices.size}\n`);

    // Send updated device list to ALL clients
    io.emit('devices-updated', {
      devices: Array.from(connectedDevices.values()),
      timestamp: registerTime,
      totalCount: connectedDevices.size
    });
  });

  // ========================================
  // EVENT 2: Button Clicked (THE CORE "HELLO WORLD")
  // Frontend sends: socket.emit('button-clicked', {message: 'Click from Phone!'})
  // ========================================
  socket.on('button-clicked', (clickData) => {
    const clickTime = new Date().toLocaleTimeString();
    const device = connectedDevices.get(socket.id);

    if (device) {
      device.lastActivity = clickTime;
    }

    // ✅ THIS IS THE KEY LOG - "console.log('Clicked!')" ON LAPTOP
    console.log(`\n🔘 CLICK EVENT RECEIVED`);
    console.log(`   Clicked!`); // <-- THE HELLO WORLD OUTPUT
    console.log(`   Time: ${clickTime}`);
    console.log(`   From: ${device?.deviceName || 'Unknown'}`);
    console.log(`   Type: ${device?.deviceType || 'Unknown'}`);
    console.log(`   Message: ${clickData.message || 'Button clicked!'}\n`);

    // Create payload to send to other devices
    const broadcastPayload = {
      clickId: Math.random().toString(36).slice(2, 11),
      senderSocketId: socket.id,
      senderName: device?.deviceName || 'Unknown Device',
      senderType: device?.deviceType || 'unknown',
      message: clickData.message || 'Button clicked!',
      timestamp: clickTime,
      originalTimestamp: clickData.timestamp
    };

    // ✅ BROADCAST TO ALL OTHER DEVICES (not including sender)
    socket.broadcast.emit('click-received', broadcastPayload);

    // ✅ SEND CONFIRMATION BACK TO SENDER
    socket.emit('click-confirmed', {
      ...broadcastPayload,
      status: 'sent',
      recipientCount: Math.max(0, io.engine.clientsCount - 1)
    });
  });

  // ========================================
  // EVENT 3: Disconnect
  // ========================================
  socket.on('disconnect', () => {
    const device = connectedDevices.get(socket.id);
    connectedDevices.delete(socket.id);

    const disconnectTime = new Date().toLocaleTimeString();
    console.log(`\n❌ [${disconnectTime}] Device Disconnected`);
    console.log(`   Name: ${device?.deviceName || 'Unknown'}`);
    console.log(`   Remaining: ${connectedDevices.size}\n`);

    // Notify other clients
    io.emit('devices-updated', {
      devices: Array.from(connectedDevices.values()),
      timestamp: disconnectTime,
      totalCount: connectedDevices.size,
      disconnected: device?.deviceName
    });
  });

  // ========================================
  // ERROR HANDLING
  // ========================================
  socket.on('error', (error) => {
    console.log(`\n⚠️  Socket Error [${socket.id}]: ${error}\n`);
  });
});

// ============================================
// HTTP ERROR HANDLING
// ============================================

app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════════╗`);
  console.log(`║  🔗 SOCKET SPECIALIST - BACKEND SERVER   ║`);
  console.log(`╚════════════════════════════════════════════╝\n`);

  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 WebSocket URL: ws://localhost:${PORT}`);
  console.log(`🌐 HTTP URL: http://localhost:${PORT}`);

  console.log(`\n📡 NEXT: Expose to public internet using ngrok:\n`);
  console.log(`   $ ngrok http ${PORT}\n`);

  console.log(`Then copy the ngrok URL to your phone/frontend.\n`);
  console.log(`Waiting for device connections...\n`);
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down gracefully...\n');
  
  io.emit('server-shutdown', {
    message: 'Server is shutting down',
    timestamp: new Date().toLocaleTimeString()
  });

  server.close(() => {
    console.log('✅ Server closed\n');
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.log('⚠️  Forced shutdown\n');
    process.exit(1);
  }, 10000);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

module.exports = server;