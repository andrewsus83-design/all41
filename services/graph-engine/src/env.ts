/** Side-effect module: load ./.env in dev. Import it FIRST (ESM evaluates imports in order). Production gets env from Coolify. */
import { existsSync } from 'node:fs';
if (existsSync('.env')) process.loadEnvFile('.env');
