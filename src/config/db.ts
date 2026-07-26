import mongoose from 'mongoose';
import { seedData } from '../utils/seed';
import fs from 'fs';
import path from 'path';

let isConnected = false;

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://suneelsoni4u_db:MuniyA7264@tracker.dbbwb2b.mongodb.net/mamafarm?retryWrites=true&w=majority&appName=tracker';

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    console.log('Connecting to MongoDB Atlas SRV URL...');
    const instance = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 4000,
    });
    console.log(`✅ MongoDB Atlas Connected Successfully: ${instance.connection.host}`);
    isConnected = true;
    await seedData();
    return instance;
  } catch (error: any) {
    console.warn(`⚠️ MongoDB Atlas Connection Error: ${error.message}`);
    console.log('Notice: Make sure your IP is whitelisted (0.0.0.0/0) in MongoDB Atlas Network Access.');

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
      console.log('Using persistent local database storage engine (.mongo-data)...');      const { MongoMemoryServer } = await import('mongodb-memory-server');

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
}
