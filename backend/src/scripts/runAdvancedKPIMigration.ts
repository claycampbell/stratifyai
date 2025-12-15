import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'ogsm-postgres-server.postgres.database.azure.com',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ogsm_manager',
  user: process.env.DB_USER || 'ogsmadmin',
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_HOST?.includes('postgres.database.azure.com') ? { rejectUnauthorized: false } : undefined
});

async function runMigration() {
  console.log('================================================================================');
  console.log('Running Migration 007: Add Advanced KPI Fields');
  console.log('================================================================================\n');

  try {
    console.log('Connecting to database...');
    console.log(`Host: ${process.env.DB_HOST}`);
    console.log(`Database: ${process.env.DB_NAME}\n`);

    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '007_add_kpi_advanced_fields.sql');
    console.log(`Reading migration file: ${migrationPath}`);

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    console.log('✓ Migration file loaded\n');

    console.log('Executing migration...');
    await pool.query(migrationSQL);
    console.log('✓ Migration executed successfully\n');

    // Verify columns were added
    console.log('Verifying schema changes...');
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'kpis'
      AND column_name IN (
        'owner_email', 'tags', 'validation_rules', 'ownership',
        'persons_responsible', 'category_id', 'at_risk_threshold',
        'off_track_threshold', 'auto_calculate_status', 'trend_direction',
        'last_calculated'
      )
      ORDER BY column_name;
    `);

    console.log('\nAdded columns:');
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.column_name} (${row.data_type})`);
    });

    console.log('\n================================================================================');
    console.log('✅ Migration completed successfully!');
    console.log('================================================================================\n');

    console.log('Summary:');
    console.log(`  - ${result.rows.length} columns added to kpis table`);
    console.log('  - Indexes created for performance');
    console.log('  - Comments added for documentation');
    console.log('\nThe KPI update functionality should now work correctly.\n');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
