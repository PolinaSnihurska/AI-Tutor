import { query } from '../db/connection';
import { MongoClient, ObjectId } from 'mongodb';

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = 'ai_tutor';

let mongoClient: MongoClient | null = null;

async function getMongoClient() {
  if (!mongoClient) {
    mongoClient = new MongoClient(MONGO_URL);
    await mongoClient.connect();
  }
  return mongoClient;
}

export interface TestQuestion {
  _id?: ObjectId;
  subject: string;
  topic: string;
  type: 'multiple_choice' | 'true_false' | 'open_ended';
  content: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
  difficulty: number;
  points: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentLibraryItem {
  _id?: ObjectId;
  subject: string;
  topic: string;
  subtopic?: string;
  content: string;
  difficulty: number;
  examples: any[];
  relatedTopics: string[];
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIPromptTemplate {
  _id?: ObjectId;
  name: string;
  type: 'explanation' | 'test_generation' | 'learning_plan';
  template: string;
  variables: string[];
  description: string;
  isActive: boolean;
  version: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subject {
  id: string;
  name: string;
  description: string;
  topics: Topic[];
  created_at: Date;
  updated_at: Date;
}

export interface Topic {
  id: string;
  name: string;
  description: string;
  subtopics: string[];
}

export class Content {
  // Test Questions
  static async getTestQuestions(
    page: number = 1,
    limit: number = 50,
    filters?: { subject?: string; topic?: string; difficulty?: number }
  ) {
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    const collection = db.collection('test_questions');

    const query: any = {};
    if (filters?.subject) query.subject = filters.subject;
    if (filters?.topic) query.topic = filters.topic;
    if (filters?.difficulty) query.difficulty = filters.difficulty;

    const skip = (page - 1) * limit;
    const questions = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await collection.countDocuments(query);

    return { questions, total };
  }

  static async getTestQuestionById(id: string) {
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    const collection = db.collection('test_questions');

    return await collection.findOne({ _id: new ObjectId(id) });
  }

  static async createTestQuestion(data: Omit<TestQuestion, '_id'>) {
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    const collection = db.collection('test_questions');

    const result = await collection.insertOne({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return result.insertedId;
  }

  static async updateTestQuestion(id: string, data: Partial<TestQuestion>) {
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    const collection = db.collection('test_questions');

    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } }
    );
  }

  static async deleteTestQuestion(id: string) {
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    const collection = db.collection('test_questions');

    await collection.deleteOne({ _id: new ObjectId(id) });
  }

  // Content Library
  static async getContentLibrary(
    page: number = 1,
    limit: number = 50,
    filters?: { subject?: string; topic?: string }
  ) {
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    const collection = db.collection('content_library');

    const query: any = {};
    if (filters?.subject) query.subject = filters.subject;
    if (filters?.topic) query.topic = filters.topic;

    const skip = (page - 1) * limit;
    const items = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await collection.countDocuments(query);

    return { items, total };
  }

  static async createContentItem(data: Omit<ContentLibraryItem, '_id'>) {
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    const collection = db.collection('content_library');

    const result = await collection.insertOne({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return result.insertedId;
  }

  static async updateContentItem(id: string, data: Partial<ContentLibraryItem>) {
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    const collection = db.collection('content_library');

    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } }
    );
  }

  static async deleteContentItem(id: string) {
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    const collection = db.collection('content_library');

    await collection.deleteOne({ _id: new ObjectId(id) });
  }

  // AI Prompt Templates
  static async getPromptTemplates(type?: string) {
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    const collection = db.collection('prompt_templates');

    const query: any = {};
    if (type) query.type = type;

    return await collection.find(query).sort({ createdAt: -1 }).toArray();
  }

  static async getPromptTemplateById(id: string) {
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    const collection = db.collection('prompt_templates');

    return await collection.findOne({ _id: new ObjectId(id) });
  }

  static async createPromptTemplate(data: Omit<AIPromptTemplate, '_id'>) {
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    const collection = db.collection('prompt_templates');

    const result = await collection.insertOne({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return result.insertedId;
  }

  static async updatePromptTemplate(id: string, data: Partial<AIPromptTemplate>) {
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    const collection = db.collection('prompt_templates');

    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } }
    );
  }

  static async deletePromptTemplate(id: string) {
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    const collection = db.collection('prompt_templates');

    await collection.deleteOne({ _id: new ObjectId(id) });
  }

  // Subjects and Topics (stored in PostgreSQL)
  static async getSubjects(): Promise<Subject[]> {
    const result = await query(`
      SELECT id, name, description, topics, created_at, updated_at
      FROM subjects
      ORDER BY name
    `);

    return result.rows;
  }

  static async getSubjectById(id: string): Promise<Subject | null> {
    const result = await query(
      'SELECT id, name, description, topics, created_at, updated_at FROM subjects WHERE id = $1',
      [id]
    );

    return result.rows[0] || null;
  }

  static async createSubject(data: {
    name: string;
    description: string;
    topics: Topic[];
  }): Promise<string> {
    const result = await query(
      `INSERT INTO subjects (name, description, topics)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [data.name, data.description, JSON.stringify(data.topics)]
    );

    return result.rows[0].id;
  }

  static async updateSubject(
    id: string,
    data: Partial<{ name: string; description: string; topics: Topic[] }>
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(data.description);
    }
    if (data.topics !== undefined) {
      fields.push(`topics = $${paramCount++}`);
      values.push(JSON.stringify(data.topics));
    }

    if (fields.length === 0) return;

    values.push(id);
    await query(
      `UPDATE subjects SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramCount}`,
      values
    );
  }

  static async deleteSubject(id: string): Promise<void> {
    await query('DELETE FROM subjects WHERE id = $1', [id]);
  }
}
