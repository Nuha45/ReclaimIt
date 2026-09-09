const mongoose = require('mongoose');
const dns = require('dns');

// Prefer IPv4; helps on some Windows networks
dns.setDefaultResultOrder('ipv4first');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('Missing MONGODB_URI in .env file.');
    process.exit(1);
  }

  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    console.error('MONGODB_URI must start with mongodb:// or mongodb+srv://');
    process.exit(1);
  }

  const options = {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
  };

  try {
    await mongoose.connect(uri, options);
    console.log(`MongoDB connected: ${mongoose.connection.name}`);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);

    if (err.message.includes('ECONNREFUSED') || err.message.includes('querySrv')) {
      console.error('\nTroubleshooting tips:');
      console.error('  1. Use a standard mongodb:// URI instead of mongodb+srv:// on Windows');
      console.error('  2. Whitelist your IP in MongoDB Atlas → Network Access');
      console.error('  3. For local dev: MONGODB_URI=mongodb://127.0.0.1:27017/reclaimit');
    }

    if (err.message.includes('bad auth') || err.message.includes('Authentication failed')) {
      console.error('  → Check your MongoDB username and password in MONGODB_URI');
    }

    process.exit(1);
  }
};

module.exports = connectDB;
