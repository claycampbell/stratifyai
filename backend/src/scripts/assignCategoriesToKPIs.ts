import pool from '../config/database';

/**
 * Script to assign default categories to existing KPIs based on their names
 * Run with: npx ts-node src/scripts/assignCategoriesToKPIs.ts
 */

async function assignCategoriesToKPIs() {
  try {
    console.log('Starting category assignment...\n');

    // Get all categories
    const categoriesResult = await pool.query(
      'SELECT id, name FROM kpi_categories ORDER BY name'
    );
    const categories = categoriesResult.rows;

    console.log('Available categories:');
    categories.forEach(cat => console.log(`  - ${cat.name} (${cat.id})`));
    console.log('');

    // Get all KPIs
    const kpisResult = await pool.query(
      'SELECT id, name, category_id FROM kpis'
    );
    const kpis = kpisResult.rows;

    console.log(`Found ${kpis.length} KPIs\n`);

    // Find the "Uncategorized" default category
    const uncategorizedCategory = categories.find(c => c.name === 'Uncategorized');
    if (!uncategorizedCategory) {
      console.error('Error: Uncategorized category not found!');
      return;
    }

    // Count KPIs already categorized
    const categorizedCount = kpis.filter(kpi => kpi.category_id !== null).length;
    const uncategorizedCount = kpis.filter(kpi => kpi.category_id === null).length;

    console.log(`KPIs already categorized: ${categorizedCount}`);
    console.log(`KPIs without category: ${uncategorizedCount}\n`);

    if (uncategorizedCount === 0) {
      console.log('All KPIs already have categories assigned!');
      await pool.end();
      return;
    }

    // Assign categories based on KPI names (smart categorization)
    let updatedCount = 0;
    for (const kpi of kpis) {
      if (kpi.category_id !== null) {
        continue; // Skip already categorized KPIs
      }

      const kpiNameLower = kpi.name.toLowerCase();
      let assignedCategory = uncategorizedCategory; // Default to Uncategorized

      // Smart categorization based on keywords
      if (kpiNameLower.includes('revenue') || kpiNameLower.includes('budget') ||
          kpiNameLower.includes('cost') || kpiNameLower.includes('financial') ||
          kpiNameLower.includes('profit') || kpiNameLower.includes('funding')) {
        const financialCat = categories.find(c => c.name === 'Financial');
        if (financialCat) assignedCategory = financialCat;
      }
      else if (kpiNameLower.includes('student') || kpiNameLower.includes('academic') ||
               kpiNameLower.includes('graduation') || kpiNameLower.includes('gpa') ||
               kpiNameLower.includes('enrollment')) {
        const academicCat = categories.find(c => c.name === 'Academic');
        if (academicCat) assignedCategory = academicCat;
      }
      else if (kpiNameLower.includes('athlete') || kpiNameLower.includes('sport') ||
               kpiNameLower.includes('team') || kpiNameLower.includes('win') ||
               kpiNameLower.includes('championship') || kpiNameLower.includes('game')) {
        const athleticsCat = categories.find(c => c.name === 'Athletics');
        if (athleticsCat) assignedCategory = athleticsCat;
      }
      else if (kpiNameLower.includes('marketing') || kpiNameLower.includes('social') ||
               kpiNameLower.includes('engagement') || kpiNameLower.includes('brand') ||
               kpiNameLower.includes('campaign')) {
        const marketingCat = categories.find(c => c.name === 'Marketing');
        if (marketingCat) assignedCategory = marketingCat;
      }
      else if (kpiNameLower.includes('operation') || kpiNameLower.includes('efficiency') ||
               kpiNameLower.includes('process') || kpiNameLower.includes('productivity')) {
        const operationsCat = categories.find(c => c.name === 'Operations');
        if (operationsCat) assignedCategory = operationsCat;
      }

      // Update the KPI with the assigned category
      await pool.query(
        'UPDATE kpis SET category_id = $1 WHERE id = $2',
        [assignedCategory.id, kpi.id]
      );

      console.log(`✓ "${kpi.name}" → ${assignedCategory.name}`);
      updatedCount++;
    }

    console.log(`\n✓ Successfully assigned categories to ${updatedCount} KPIs`);

    // Show final counts
    const finalResult = await pool.query(`
      SELECT c.name, COUNT(k.id) as count
      FROM kpi_categories c
      LEFT JOIN kpis k ON k.category_id = c.id
      GROUP BY c.id, c.name
      ORDER BY c.name
    `);

    console.log('\nFinal category distribution:');
    finalResult.rows.forEach(row => {
      console.log(`  ${row.name}: ${row.count} KPIs`);
    });

    await pool.end();
  } catch (error) {
    console.error('Error assigning categories:', error);
    await pool.end();
    process.exit(1);
  }
}

assignCategoriesToKPIs();
