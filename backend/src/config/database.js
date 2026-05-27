// src/config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('\n❌ MONGODB_URI is undefined — .env not loaded or value missing.');
    console.error('   Check that backend/.env exists and contains: MONGODB_URI=mongodb://127.0.0.1:27017/younovate\n');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri, { dbName: 'younovate_lms' });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;