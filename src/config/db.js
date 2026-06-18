const mongoose = require('mongoose');
const { MONGO_URI } = require('./env');

mongoose.set('strictQuery', true);

let connected = false;

async function connectDB() {
  if (!MONGO_URI) {
    throw new Error('MONGO_URI не задан в .env');
  }
  if (connected) return mongoose.connection;
  mongoose.connection.on('connected', () => {
    connected = true;
    console.log('  MongoDB: подключено');
  });
  mongoose.connection.on('error', (err) => {
    console.error('  MongoDB ошибка:', err.message);
  });
  mongoose.connection.on('disconnected', () => {
    connected = false;
    console.warn('  MongoDB: соединение разорвано');
  });
  await mongoose.connect(MONGO_URI, {
    maxPoolSize: 50,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 4000,
    socketTimeoutMS: 45000,
  });
  connected = true;
  return mongoose.connection;
}

async function disconnectDB() {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
}

module.exports = { connectDB, disconnectDB, mongoose };
