import mongoose from 'mongoose';
import { seedData } from '../utils/seed';
import fs from 'fs';
import path from 'path';

let isConnected = false;

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  const mongoUri = process.env.MONGODB_URI;

  if (mongoUri) {
    try {
      console.log('Connecting to MongoDB via process.env.MONGODB_URI...');
      const instance = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`✅ MongoDB Connected Successfully: ${instance.connection.host}`);
      isConnected = true;
      await seedData();
      return instance;
    } catch (error: any) {
      console.error('================================');
      console.error('MongoDB Connection Failed');
      console.error('Error:', error.message);
      console.error('================================');

      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Failed to connect to production MongoDB: ${error.message}`);
      }
    }
  } else {
    console.warn('⚠️ MONGODB_URI is not defined in process.env');
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MONGODB_URI environment variable is missing in production');
    }
  }

  try {
    console.log('Attempting local MongoDB service (mongodb://127.0.0.1:27017/mamafarm)...');
    const instance = await mongoose.connect('mongodb://127.0.0.1:27017/mamafarm', {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`✅ Local MongoDB Connected: ${instance.connection.host}`);
    isConnected = true;
    await seedData();
    return instance;
  } catch {
    console.log('Using persistent local database storage engine (.mongo-data)...');
    const { MongoMemoryServer } = await import('mongodb-memory-server');

    const dbPath = path.join(process.cwd(), '.mongo-data');
    if (!fs.existsSync(dbPath)) {
      fs.mkdirSync(dbPath, { recursive: true });
    }

    const mongod = await MongoMemoryServer.create({
      instance: {
        dbName: 'mamafarm',
        dbPath,
        storageEngine: 'wiredTiger',
      },
    });

    const memoryUri = mongod.getUri();
    const instance = await mongoose.connect(memoryUri);
    console.log(`✅ Persistent Local MongoDB Connected at: ${dbPath}`);
    isConnected = true;
    await seedData();
    return instance;
  }
}
