import { MongoClient, Db } from 'mongodb';

const MONGO_USER = process.env.MONGO_USER || 'mongo';
const MONGO_PASSWORD = process.env.MONGO_PASSWORD || 'mongo';
const MONGO_HOST = process.env.MONGO_HOST || 'localhost';
const MONGO_PORT = process.env.MONGO_PORT || '27017';
const MONGO_DB = process.env.MONGO_DB || 'ai_tutor';

const MONGO_URI = `mongodb://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}`;

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectToMongoDB(): Promise<Db> {
  if (db) {
    return db;
  }

  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db(MONGO_DB);
    
    console.log(`Connected to MongoDB: ${MONGO_DB}`);
    
    // Initialize collections and indexes
    await initializeCollections(db);
    
    return db;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export async function disconnectFromMongoDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('Disconnected from MongoDB');
  }
}

export function getDatabase(): Db {
  if (!db) {
    throw new Error('Database not initialized. Call connectToMongoDB first.');
  }
  return db;
}

async function initializeCollections(database: Db): Promise<void> {
  // Create tests collection with indexes
  const testsCollection = database.collection('tests');
  
  await testsCollection.createIndexes([
    { key: { subject: 1 } },
    { key: { topics: 1 } },
    { key: { createdBy: 1 } },
    { key: { createdAt: -1 } },
    { key: { subject: 1, topics: 1 } },
  ]);

  // Create test_results collection with indexes
  const testResultsCollection = database.collection('test_results');
  
  await testResultsCollection.createIndexes([
    { key: { studentId: 1 } },
    { key: { testId: 1 } },
    { key: { createdAt: -1 } },
    { key: { studentId: 1, createdAt: -1 } },
    { key: { studentId: 1, testId: 1 } },
  ]);

  // Create conversations collection with indexes (for AI context)
  const conversationsCollection = database.collection('conversations');
  
  await conversationsCollection.createIndexes([
    { key: { userId: 1 } },
    { key: { subject: 1 } },
    { key: { createdAt: -1 } },
    { key: { userId: 1, createdAt: -1 } },
  ]);

  console.log('MongoDB collections and indexes initialized');
}
