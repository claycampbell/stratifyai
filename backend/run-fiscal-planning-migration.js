/**
 * Migration Script: Fiscal Year Planning Mode
 * Run this script to create the fiscal year planning tables in Azure PostgreSQL
 *
 * Usage: node run-fiscal-planning-migration.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🔌 Connected to Azure PostgreSQL database');
    console.log(`📍 Database: ${process.env.DB_NAME} on ${process.env.DB_HOST}`);
    console.log('');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'src', 'database', 'migrations', '002_fiscal_year_planning.sql');

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    console.log('📄 Reading migration file...');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Starting migration: Fiscal Year Planning Mode');
    console.log('');

    // Execute the migration
    await client.query('BEGIN');
    console.log('📊 Creating tables and indexes...');

    await client.query(migrationSQL);

    await client.query('COMMIT');

    console.log('');
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('📋 Created tables:');
    console.log('   - fiscal_year_plans');
    console.log('   - fiscal_year_priorities');
    console.log('   - fiscal_year_draft_strategies');
    console.log('');
    console.log('📊 Created indexes:');
    console.log('   - idx_fiscal_plans_status');
    console.log('   - idx_fiscal_plans_fiscal_year');
    console.log('   - idx_fiscal_priorities_plan');
    console.log('   - idx_draft_strategies_plan');
    console.log('   - idx_draft_strategies_priority');
    console.log('   - idx_draft_strategies_status');
    console.log('');

    // Verify tables were created
    console.log('🔍 Verifying tables...');
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('fiscal_year_plans', 'fiscal_year_priorities', 'fiscal_year_draft_strategies')
      ORDER BY table_name
    `);

    if (result.rows.length === 3) {
      console.log('✅ All tables verified successfully');
      result.rows.forEach(row => {
        console.log(`   ✓ ${row.table_name}`);
      });
    } else {
      console.warn('⚠️  Warning: Not all tables were found');
      console.log(`   Found ${result.rows.length} of 3 expected tables`);
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('');
    console.error('❌ Migration failed!');
    console.error('');
    console.error('Error details:', error.message);

    if (error.code) {
      console.error('Error code:', error.code);
    }

    if (error.code === '42P07') {
      console.error('');
      console.error('💡 Note: Tables may already exist. This is OK if you\'re re-running the migration.');
      console.error('   The CREATE TABLE statements use "IF NOT EXISTS" so they won\'t fail on re-run.');
    }

    throw error;
  } finally {
    client.release();
    await pool.end();
    console.log('');
    console.log('👋 Database connection closed');
  }
}

// Run the migration
console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('  Fiscal Year Planning Mode - Database Migration');
console.log('═══════════════════════════════════════════════════════════');
console.log('');

runMigration()
  .then(() => {
    console.log('');
    console.log('🎉 Migration script completed successfully!');
    console.log('');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('💥 Migration script failed');
    console.error('');
    process.exit(1);
  });
