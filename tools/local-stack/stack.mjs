#!/usr/bin/env node
// A small stand-in for Supabase on a machine without Docker: your own
// Postgres, the real PostgREST, and a fake sign-in server, behind one address.
// It runs the real migrations, so row level security and the triggers behave as
// they do in production. See README.md.
import { execFileSync, spawn } from "node:child_process";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");

const config = {
  pgUrl: process.env.STACK_PG_URL ?? "postgres://postgres@127.0.0.1:54322/postgres",
  dbName: process.env.STACK_DB ?? "a41_local",
  apiPort: Number(process.env.STACK_API_PORT ?? 54321),
  restPort: Number(process.env.STACK_REST_PORT ?? 54323),
  postgrest: process.env.POSTGREST_BIN ?? "postgrest",
  dataDir: process.env.STACK_DATA_DIR ?? join(root, ".local-stack"),
  jwtSecret: process.env.STACK_JWT_SECRET ?? "local-only-secret-local-only-secret-1234",
};

const dbUrl = (name) => config.pgUrl.replace(/\/[^/]*$/, `/${name}`);
const psql = (url, args) => execFileSync("psql", [url, "-v", "ON_ERROR_STOP=1", "-q", "-X", ...args], { encoding: "utf8" });
const sqlQuote = (value) => `'${String(value).replaceAll("'", "''")}'`;

// ---------------------------------------------------------------- database
function prepareDatabase({ reset }) {
  const exists = psql(config.pgUrl, ["-At", "-c", `select 1 from pg_database where datname = ${sqlQuote(config.dbName)}`]).trim() === "1";
  if (exists && !reset) return;
  if (exists) psql(config.pgUrl, ["-c", `drop database ${config.dbName} with (force)`]);
  psql(config.pgUrl, ["-c", `create database ${config.dbName}`]);

  const url = dbUrl(config.dbName);
  psql(url, ["-f", join(here, "stubs.sql")]);
  const migrations = join(root, "supabase/migrations");
  const files = execFileSync("ls", [migrations], { encoding: "utf8" }).split("\n").filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) psql(url, ["-f", join(migrations, file)]);
  console.log(`database ${config.dbName} ready with ${files.length} migrations`);
}

// ------------------------------------------------------------------- users
mkdirSync(config.dataDir, { recursive: true });
const usersFile = join(config.dataDir, "users.json");
const users = new Map(existsSync(usersFile) ? JSON.parse(readFileSync(usersFile, "utf8")) : []);
const refreshTokens = new Map();

const saveUsers = () => writeFileSync(usersFile, JSON.stringify([...users]));

function insertUser(user) {
  psql(dbUrl(config.dbName), [
    "-c",
    `insert into auth.users (id, email) values (${sqlQuote(user.id)}, ${sqlQuote(user.email)}) on conflict (id) do nothing`,
  ]);
}

function ensureUser(email, password, id = randomUUID()) {
  const key = email.toLowerCase();
  if (!users.has(key)) users.set(key, { id, email: key, password });
  insertUser(users.get(key));
  saveUsers();
  return users.get(key);
}

// -------------------------------------------------------------------- JWTs
const b64url = (input) => Buffer.from(input).toString("base64url");
const sign = (payload) => {
  const body = `${b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${b64url(JSON.stringify(payload))}`;
  return `${body}.${createHmac("sha256", config.jwtSecret).update(body).digest("base64url")}`;
};

function verify(token) {
  const [header, payload, signature] = String(token).split(".");
  if (!header || !payload || !signature) return null;
  const expected = createHmac("sha256", config.jwtSecret).update(`${header}.${payload}`).digest("base64url");
  if (expected !== signature) return null;
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  return claims.exp * 1000 > Date.now() ? claims : null;
}

const userJson = (user) => ({
  id: user.id,
  aud: "authenticated",
  role: "authenticated",
  email: user.email,
  email_confirmed_at: new Date(0).toISOString(),
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  identities: [],
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
});

function sessionFor(user) {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = 3600;
  const refresh = randomBytes(12).toString("hex");
  refreshTokens.set(refresh, user.email);
  return {
    access_token: sign({
      aud: "authenticated",
      role: "authenticated",
      sub: user.id,
      email: user.email,
      iat: now,
      exp: now + expiresIn,
      session_id: randomUUID(),
      aal: "aal1",
      amr: [{ method: "password", timestamp: now }],
      is_anonymous: false,
    }),
    token_type: "bearer",
    expires_in: expiresIn,
    expires_at: now + expiresIn,
    refresh_token: refresh,
    user: userJson(user),
  };
}

// ------------------------------------------------------------------ server
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, apikey, content-type, x-client-info, x-upsert, prefer, range, accept-profile, content-profile, cache-control",
  "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS",
  "access-control-expose-headers": "content-range, content-length, etag",
};

const readBody = (request) =>
  new Promise((resolve) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks)));
  });

function sendJson(response, status, body) {
  response.writeHead(status, { "content-type": "application/json", ...CORS });
  response.end(JSON.stringify(body));
}

const authError = (response, status, code, message) => sendJson(response, status, { code: status, error_code: code, msg: message, message });

async function handleAuth(request, response, url) {
  const route = url.pathname.replace("/auth/v1", "");

  if (route === "/token" && request.method === "POST") {
    const body = JSON.parse((await readBody(request)).toString() || "{}");
    const grant = url.searchParams.get("grant_type");
    if (grant === "password") {
      const user = users.get(String(body.email ?? "").toLowerCase());
      if (!user || user.password !== body.password) return authError(response, 400, "invalid_credentials", "Invalid login credentials");
      return sendJson(response, 200, sessionFor(user));
    }
    if (grant === "refresh_token") {
      const email = refreshTokens.get(body.refresh_token);
      const user = email && users.get(email);
      if (!user) return authError(response, 400, "refresh_token_not_found", "Invalid Refresh Token");
      return sendJson(response, 200, sessionFor(user));
    }
  }

  if (route === "/signup" && request.method === "POST") {
    const body = JSON.parse((await readBody(request)).toString() || "{}");
    const email = String(body.email ?? "").toLowerCase();
    if (!email || String(body.password ?? "").length < 8) return authError(response, 422, "weak_password", "Password should be at least 8 characters.");
    if (users.has(email)) return authError(response, 422, "user_already_exists", "User already registered");
    return sendJson(response, 200, sessionFor(ensureUser(email, body.password)));
  }

  if (route === "/user" && request.method === "GET") {
    const claims = verify((request.headers.authorization ?? "").replace(/^Bearer /i, ""));
    const user = claims && [...users.values()].find((candidate) => candidate.id === claims.sub);
    return user ? sendJson(response, 200, userJson(user)) : authError(response, 401, "bad_jwt", "invalid JWT");
  }

  if (route === "/logout" && request.method === "POST") {
    response.writeHead(204, CORS);
    return response.end();
  }

  return authError(response, 404, "not_found", `No fake for ${request.method} ${route}`);
}

async function handleRest(request, response, url) {
  const headers = { ...request.headers, host: `127.0.0.1:${config.restPort}` };
  // The publishable key is not a token PostgREST can read; without a valid one the caller is anonymous.
  const bearer = (headers.authorization ?? "").replace(/^Bearer /i, "");
  if (!verify(bearer)) delete headers.authorization;
  delete headers.apikey;

  const upstream = http.request(
    { host: "127.0.0.1", port: config.restPort, method: request.method, path: url.pathname.replace("/rest/v1", "") + url.search, headers },
    (result) => {
      response.writeHead(result.statusCode ?? 502, { ...result.headers, ...CORS });
      result.pipe(response);
    },
  );
  upstream.on("error", (error) => sendJson(response, 502, { message: `PostgREST is not reachable: ${error.message}` }));
  request.pipe(upstream);
}

function startFrontServer() {
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://stack.local");
    try {
      if (request.method === "OPTIONS") {
        response.writeHead(204, CORS);
        return response.end();
      }
      if (url.pathname.startsWith("/auth/v1")) return await handleAuth(request, response, url);
      if (url.pathname.startsWith("/rest/v1")) return await handleRest(request, response, url);
      return sendJson(response, 404, { message: "Not part of the local stack" });
    } catch (error) {
      console.error(error);
      return sendJson(response, 500, { message: String(error) });
    }
  });
  server.listen(config.apiPort, "127.0.0.1", () => console.log(`local Supabase on http://127.0.0.1:${config.apiPort}`));
}

function startPostgrest() {
  const dbUri = dbUrl(config.dbName).replace("postgres@", "authenticator@");
  const child = spawn(config.postgrest, [], {
    env: {
      ...process.env,
      PGRST_DB_URI: dbUri,
      PGRST_DB_SCHEMAS: "public",
      PGRST_DB_ANON_ROLE: "anon",
      PGRST_DB_MAX_ROWS: "1000",
      PGRST_JWT_SECRET: config.jwtSecret,
      PGRST_SERVER_HOST: "127.0.0.1",
      PGRST_SERVER_PORT: String(config.restPort),
      PGRST_LOG_LEVEL: "warn",
    },
    stdio: ["ignore", "inherit", "inherit"],
  });
  child.on("exit", (code) => {
    console.error(`PostgREST stopped (${code})`);
    process.exit(1);
  });
  process.on("exit", () => child.kill());
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => process.exit(0));
}

// -------------------------------------------------------------------- main
prepareDatabase({ reset: process.argv.includes("--reset") });
if (process.argv.includes("--reset")) {
  users.clear();
  saveUsers();
}
ensureUser("owner@example.test", "password1234", "00000000-0000-4000-8000-0000000000a1");
ensureUser("staff@example.test", "password1234", "00000000-0000-4000-8000-0000000000a2");
startPostgrest();
startFrontServer();
console.log("sign in with owner@example.test or staff@example.test, password password1234");
