import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Filesystem paths the API resolves relative to its own source.
 *
 * Gathered here so the `import.meta.url` dance happens once rather than being
 * repeated by every module that needs to reach the data directory.
 */

const here = dirname(fileURLToPath(import.meta.url));

/** `apps/api/data` - the generated database and the client-supplied recipes. */
const DATA_DIR = join(here, '..', '..', 'data');

export const DEFAULT_DB_PATH = join(DATA_DIR, 'nosh.db');

/** The starter recipes supplied by the client. */
export const SAMPLE_RECIPES_PATH = join(DATA_DIR, 'project-nosh-sample-recipes.json');

export const SCHEMA_PATH = join(here, 'schema.sql');
