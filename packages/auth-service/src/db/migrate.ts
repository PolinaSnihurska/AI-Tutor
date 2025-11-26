import fs from 'fs';
import path from 'path';
import { query, getClient } from './connection';

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

interface Migration {
  id: number;
  name: string;
  executed_at: Date;
}

async function createMigrationsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getExecutedMigrations(): Promise<string[]> {
  const result = await query('SELECT name FROM migrations ORDER BY id');
  return result.rows.map((row: Migration) => row.name);
}

async function executeMigration(filename: string) {
  const filePath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filePath, 'utf-8');
  
  const client = await getClient();
  try {
    await client.query('BEGIN');
    
    // Execute the migration SQL
    await client.query(sql);
    
    // Record the migration
    await client.query(
      'INSERT INTO migrations (name) VALUES ($1)',
      [filename]
    );
    
    await client.query('COMMIT');
    console.log(`✓ Executed migration: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`✗ Failed to execute migration: ${filename}`, error);
    throw error;
  } finally {
    client.release();
  }
}

export async function runMigrations() {
  try {
    console.log('Starting database migrations...');
    
    // Create migrations tracking table
    await createMigrationsTable();
    
    // Get list of executed migrations
    const executedMigrations = await getExecutedMigrations();
    
    // Get all migration files
    const migrationFiles = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    // Execute pending migrations
    for (const file of migrationFiles) {
      if (!executedMigrations.includes(file)) {
        await executeMigration(file);
      } else {
        console.log(`- Skipping already executed migration: ${file}`);
      }
    }
    
    console.log('Database migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
