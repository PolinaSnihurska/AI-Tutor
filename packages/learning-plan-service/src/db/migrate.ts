import { readFileSync } from 'fs';
import { join } from 'path';
import { query, closePool } from './connection';

async function runMigrations() {
  try {
    console.log('Running database migrations...');

    // Create migrations table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // List of migration files in order
    const migrations = [
      '001_create_learning_plans_table.sql',
      '002_create_notifications_table.sql',
    ];

    for (const migrationFile of migrations) {
      // Check if migration has already been run
      const result = await query(
        'SELECT * FROM migrations WHERE name = $1',
        [migrationFile]
      );

      if (result.rows.length > 0) {
        console.log(`Migration ${migrationFile} already executed, skipping...`);
        continue;
      }

      // Read and execute migration
      const migrationPath = join(__dirname, 'migrations', migrationFile);
      const migrationSQL = readFileSync(migrationPath, 'utf-8');

      console.log(`Executing migration: ${migrationFile}`);
      await query(migrationSQL);

      // Record migration as executed
      await query(
        'INSERT INTO migrations (name) VALUES ($1)',
        [migrationFile]
      );

      console.log(`Migration ${migrationFile} completed successfully`);
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await closePool();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default runMigrations;
