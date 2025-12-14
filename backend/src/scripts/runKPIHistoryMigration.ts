import pool from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

async function runKPIHistoryMigration() {
  console.log('='.repeat(80));
  console.log('Running KPI History Table Migration');
  console.log('='.repeat(80));

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../database/migrations/006_ensure_kpi_history_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('\n📄 Migration SQL:');
    console.log(migrationSQL);
    console.log('\n' + '='.repeat(80));

    // Execute the migration
    console.log('\n🔧 Executing migration...');
    await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!');

    // Verify the table exists and check its structure
    console.log('\n🔍 Verifying table structure...');
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'kpi_history'
      ORDER BY ordinal_position;
    `);

    console.log('\n📊 KPI History Table Structure:');
    console.table(result.rows);

    // Check if there's any existing data
    const countResult = await pool.query('SELECT COUNT(*) as count FROM kpi_history');
    console.log(`\n📈 Existing history entries: ${countResult.rows[0].count}`);

    // Test inserting a sample entry (and then deleting it)
    console.log('\n🧪 Testing insert operation...');

    // First, get a KPI to test with
    const kpiResult = await pool.query('SELECT id, name FROM kpis LIMIT 1');
    if (kpiResult.rows.length === 0) {
      console.log('⚠️  No KPIs found in database. Skipping insert test.');
    } else {
      const testKPI = kpiResult.rows[0];
      console.log(`   Using KPI: ${testKPI.name} (${testKPI.id})`);

      try {
        const testInsert = await pool.query(
          `INSERT INTO kpi_history (kpi_id, value, recorded_date, notes)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [testKPI.id, 999.99, '2025-12-14', 'Migration test entry']
        );

        console.log('✅ Test insert successful!');
        console.log('   Inserted entry:', testInsert.rows[0]);

        // Clean up test entry
        await pool.query('DELETE FROM kpi_history WHERE notes = $1', ['Migration test entry']);
        console.log('✅ Test entry cleaned up');
      } catch (insertError: any) {
        console.error('❌ Test insert failed:', insertError.message);
        console.error('   This indicates the table structure may have issues');
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ All checks completed!');
    console.log('='.repeat(80));

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runKPIHistoryMigration();
