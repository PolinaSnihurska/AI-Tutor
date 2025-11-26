#!/usr/bin/env node

/**
 * Script to create an admin user
 * Usage: node scripts/create-admin.js <email> <password> <firstName> <lastName>
 */

const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function createAdmin() {
  const args = process.argv.slice(2);
  
  if (args.length < 4) {
    console.error('Usage: node scripts/create-admin.js <email> <password> <firstName> <lastName>');
    process.exit(1);
  }

  const [email, password, firstName, lastName] = args;

  // Validate email
  if (!email.includes('@')) {
    console.error('Error: Invalid email address');
    process.exit(1);
  }

  // Validate password
  if (password.length < 8) {
    console.error('Error: Password must be at least 8 characters');
    process.exit(1);
  }

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'ai_tutor',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Check if admin already exists
    const checkResult = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (checkResult.rows.length > 0) {
      console.error(`Error: User with email ${email} already exists`);
      process.exit(1);
    }

    // Hash password
    console.log('Hashing password...');
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert admin user
    console.log('Creating admin user...');
    const result = await client.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, email_verified)
       VALUES ($1, $2, 'admin', $3, $4, true)
       RETURNING id, email, role, first_name, last_name`,
      [email, passwordHash, firstName, lastName]
    );

    const admin = result.rows[0];
    console.log('\n✅ Admin user created successfully!');
    console.log('\nDetails:');
    console.log(`  ID: ${admin.id}`);
    console.log(`  Email: ${admin.email}`);
    console.log(`  Name: ${admin.first_name} ${admin.last_name}`);
    console.log(`  Role: ${admin.role}`);
    console.log('\nYou can now login at http://localhost:5174/login');

  } catch (error) {
    console.error('Error creating admin user:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createAdmin();
