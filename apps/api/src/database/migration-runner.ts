import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

export async function runMigrations(): Promise<{ success: boolean; applied: string[] }> {
  const connectionString =
    process.env.DATABASE_URL ||
    'postgresql://smartlight:local_dev_secret_2026@localhost:5432/smartlight';

  console.log(`[MigrationRunner] Connecting to PostgreSQL at ${connectionString.replace(/:[^:@]+@/, ':****@')}...`);

  const client = new Client({ connectionString });
  const applied: string[] = [];

  try {
    await client.connect();
    console.log('[MigrationRunner] Connected successfully.');

    // Ensure migration table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        checksum VARCHAR(64)
      );
    `);

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const { rows } = await client.query('SELECT version FROM schema_migrations');
    const appliedVersions = new Set(rows.map((r: any) => r.version));

    for (const file of files) {
      const version = file.split('_')[0];
      if (appliedVersions.has(version)) {
        console.log(`[MigrationRunner] Skip already applied: ${file}`);
        continue;
      }

      console.log(`[MigrationRunner] Applying migration: ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (version, name) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING',
          [version, file],
        );
        await client.query('COMMIT');
        applied.push(file);
        console.log(`[MigrationRunner] Successfully applied: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[MigrationRunner] FAILED to apply ${file}:`, err);
        throw err;
      }
    }

    console.log(`[MigrationRunner] All migrations processed. Applied ${applied.length} new migrations.`);
    return { success: true, applied };
  } catch (err: any) {
    console.error(`[MigrationRunner] Migration execution failed: ${err.message}`);
    return { success: false, applied };
  } finally {
    await client.end().catch(() => {});
  }
}

if (require.main === module) {
  runMigrations().then((res) => {
    if (!res.success) {
      console.warn('[MigrationRunner] Note: If PostgreSQL is not currently running, ensure docker-compose is started:');
      console.warn('  docker compose -f infra/docker/docker-compose.yml up -d postgres');
      process.exit(1);
    }
  });
}
