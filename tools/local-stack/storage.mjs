// A small stand-in for the Supabase Storage API, for the local stack.
//
// It speaks the endpoints supabase-js uses for the a41_photos bucket (upload,
// public download, remove, list), keeps the bytes on disk and keeps the
// metadata in the real storage.objects table. Every insert, delete and select
// runs in the database as the caller's role (anon or authenticated, set from
// the bearer token), so the real Row Level Security policies decide, exactly as
// they do on Supabase. What it does not do is listed in README.md.
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";

const MAX_BODY_BYTES = 64 * 1024 * 1024;
const ROLES = new Set(["anon", "authenticated", "service_role"]);

/**
 * Splits a multipart/form-data body into its parts.
 * @param {Buffer} body
 * @param {string} boundary
 * @returns {{ name: string, filename: string | null, contentType: string | null, data: Buffer }[]}
 */
export function parseMultipart(body, boundary) {
  const delimiter = Buffer.from(`--${boundary}`);
  const parts = [];
  let position = body.indexOf(delimiter);
  while (position !== -1) {
    const start = position + delimiter.length;
    // "--" right after a delimiter closes the body
    if (body[start] === 0x2d && body[start + 1] === 0x2d) break;
    const next = body.indexOf(delimiter, start);
    if (next === -1) break;
    // each part runs from after the delimiter's CRLF to the CRLF before the next delimiter
    const part = body.subarray(start + 2, next - 2);
    const headerEnd = part.indexOf("\r\n\r\n");
    if (headerEnd !== -1) {
      const headers = part.subarray(0, headerEnd).toString("utf8");
      const disposition = /content-disposition:[^\r\n]*/i.exec(headers)?.[0] ?? "";
      parts.push({
        name: /\bname="([^"]*)"/i.exec(disposition)?.[1] ?? "",
        filename: /\bfilename="([^"]*)"/i.exec(disposition)?.[1] ?? null,
        contentType: /content-type:\s*([^\r\n;]+)/i.exec(headers)?.[1]?.trim() ?? null,
        data: part.subarray(headerEnd + 4),
      });
    }
    position = next;
  }
  return parts;
}

/** Runs a SQL script with psql and returns what it printed. Values reach the script only as quoted psql variables. */
function runPsql(url, variables, script) {
  return new Promise((resolvePromise) => {
    const args = [url, "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose"];
    for (const [key, value] of Object.entries(variables)) args.push("-v", `${key}=${value}`);
    args.push("-f", "-");
    const child = spawn("psql", args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("close", (code) => resolvePromise({ code, stdout: stdout.trim(), stderr }));
    child.stdin.end(script);
  });
}

/** SQLSTATE and message of a failed statement, read from psql's verbose error output. */
function sqlError(stderr) {
  const match = /ERROR:\s+([0-9A-Z]{5}):\s+(.*)/.exec(stderr);
  return { state: match?.[1] ?? "XX000", message: match?.[2]?.trim() ?? stderr.trim() };
}

/** The request body, or null when it is longer than `limit` bytes (the rest is read and dropped). */
function readCapped(request, limit) {
  return new Promise((resolvePromise) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size <= limit) chunks.push(chunk);
    });
    request.on("end", () => resolvePromise(size <= limit ? Buffer.concat(chunks) : null));
    request.on("error", () => resolvePromise(null));
  });
}

export function createStorage({ dbUrl, dataDir, verify, cors }) {
  const readBody = readCapped;
  const filesRoot = resolve(dataDir, "storage");

  const send = (response, status, body, headers = {}) => {
    response.writeHead(status, { "content-type": "application/json", ...cors, ...headers });
    response.end(JSON.stringify(body));
  };
  // Storage reports failures as { statusCode, error, message }. A policy violation is a 400 whose body says 403.
  const fail = (response, httpStatus, statusCode, error, message) =>
    send(response, httpStatus, { statusCode: String(statusCode), error, message });

  /** Who is calling: the role and user id Row Level Security will see. */
  function caller(request) {
    const claims = verify((request.headers.authorization ?? "").replace(/^Bearer /i, ""));
    if (claims && ROLES.has(claims.role)) return { role: claims.role, sub: claims.sub ?? "" };
    return { role: "anon", sub: "" };
  }

  /** A script that acts as the caller: switches role and sets the claims auth.uid() reads. */
  const asCaller = ({ role }, statement) => `
begin;
set local role ${role};
select set_config('request.jwt.claim.sub', :'sub', true) as _a \\gset
${statement}
commit;`;

  /** The name of an object from the URL path, or null when it could leave the bucket folder. */
  function objectName(segments) {
    const decoded = segments.map((segment) => decodeURIComponent(segment));
    if (decoded.length === 0 || decoded.some((segment) => segment === "" || segment === "." || segment === "..")) return null;
    const name = decoded.join("/");
    return name.length <= 1024 ? name : null;
  }

  const filePath = (bucket, name) => {
    const path = resolve(filesRoot, bucket, name);
    return path.startsWith(join(filesRoot, bucket) + sep) ? path : null;
  };

  async function getBucket(id) {
    const result = await runPsql(dbUrl, { bucket: id }, `select coalesce((select row_to_json(b) from storage.buckets b where b.id = :'bucket'), 'null'::json);`);
    return result.code === 0 ? JSON.parse(result.stdout || "null") : null;
  }

  // ------------------------------------------------------------------ upload
  async function upload(request, response, bucketId, segments) {
    const name = objectName(segments);
    const bucket = await getBucket(bucketId);
    if (!bucket) return fail(response, 404, 404, "Bucket not found", "Bucket not found");
    if (!name) return fail(response, 400, 400, "InvalidKey", "Invalid key");
    if (request.headers["x-upsert"] === "true") {
      return fail(response, 501, 501, "Not implemented", "The local Storage fake does not support upsert.");
    }

    const body = await readBody(request, MAX_BODY_BYTES);
    if (!body) return fail(response, 413, 413, "Payload too large", "The object exceeded the maximum allowed size");

    const contentType = String(request.headers["content-type"] ?? "");
    let data = body;
    let mimetype = contentType.split(";")[0].trim() || "application/octet-stream";
    let cacheControl = request.headers["cache-control"] ?? "max-age=3600";
    const boundary = /boundary=("?)([^";]+)\1/i.exec(contentType)?.[2];
    if (contentType.startsWith("multipart/form-data") && boundary) {
      const parts = parseMultipart(body, boundary);
      const file = parts.find((part) => part.filename !== null);
      if (!file) return fail(response, 400, 400, "InvalidRequest", "No file in the request");
      data = file.data;
      mimetype = file.contentType ?? "application/octet-stream";
      const field = parts.find((part) => part.name === "cacheControl" && part.filename === null);
      if (field) cacheControl = `max-age=${field.data.toString("utf8").trim()}`;
    }

    if (bucket.file_size_limit !== null && data.length > Number(bucket.file_size_limit)) {
      return fail(response, 413, 413, "Payload too large", "The object exceeded the maximum allowed size");
    }
    if (bucket.allowed_mime_types && !bucket.allowed_mime_types.includes(mimetype)) {
      return fail(response, 415, 415, "invalid_mime_type", `mime type ${mimetype} is not supported`);
    }

    const who = caller(request);
    const metadata = {
      eTag: `"${createHash("md5").update(data).digest("hex")}"`,
      size: data.length,
      mimetype,
      cacheControl,
      lastModified: new Date().toISOString(),
      contentLength: data.length,
      httpStatusCode: 200,
    };
    const id = randomUUID();
    // No RETURNING: like Storage, an upload needs only the INSERT policy.
    const result = await runPsql(
      dbUrl,
      { sub: who.sub, bucket: bucketId, name, id, meta: JSON.stringify(metadata) },
      asCaller(
        who,
        `insert into storage.objects (id, bucket_id, name, owner, metadata)
         values (:'id'::uuid, :'bucket', :'name', nullif(:'sub', '')::uuid, :'meta'::jsonb);`,
      ),
    );
    if (result.code !== 0) {
      const error = sqlError(result.stderr);
      if (error.state === "23505") return fail(response, 409, 409, "Duplicate", "The resource already exists");
      if (error.state === "42501") return fail(response, 400, 403, "Unauthorized", error.message);
      console.error("[storage] upload failed", error);
      return fail(response, 500, 500, "Internal", error.message);
    }

    const path = filePath(bucketId, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, data);
    return send(response, 200, { Id: id, Key: `${bucketId}/${name}` });
  }

  // ---------------------------------------------------------------- download
  async function download(request, response, url, bucketId, segments) {
    const name = objectName(segments);
    const bucket = await getBucket(bucketId);
    if (!bucket || !bucket.public || !name) return fail(response, 404, 404, "not_found", "Object not found");

    const found = await runPsql(
      dbUrl,
      { bucket: bucketId, name },
      `select coalesce((select o.metadata from storage.objects o where o.bucket_id = :'bucket' and o.name = :'name'), 'null'::jsonb);`,
    );
    const metadata = found.code === 0 ? JSON.parse(found.stdout || "null") : null;
    const path = filePath(bucketId, name);
    if (!metadata || !path || !existsSync(path)) return fail(response, 404, 404, "not_found", "Object not found");

    const bytes = readFileSync(path);
    const headers = {
      "content-type": metadata.mimetype ?? "application/octet-stream",
      "content-length": String(bytes.length),
      "cache-control": metadata.cacheControl ?? "max-age=3600",
      etag: metadata.eTag ?? "",
      "last-modified": new Date(metadata.lastModified ?? statSync(path).mtime).toUTCString(),
      "x-content-type-options": "nosniff",
      ...cors,
    };
    if (url.searchParams.has("download")) {
      const filename = url.searchParams.get("download") || name.split("/").pop();
      headers["content-disposition"] = `attachment; filename=${JSON.stringify(filename)}`;
    }
    response.writeHead(200, headers);
    response.end(request.method === "HEAD" ? undefined : bytes);
  }

  // ------------------------------------------------------------------ remove
  async function remove(request, response, bucketId) {
    const bucket = await getBucket(bucketId);
    if (!bucket) return fail(response, 404, 404, "Bucket not found", "Bucket not found");
    let prefixes;
    try {
      prefixes = JSON.parse((await readBody(request, 1024 * 1024))?.toString() || "{}").prefixes;
    } catch {
      prefixes = null;
    }
    if (!Array.isArray(prefixes) || prefixes.some((prefix) => typeof prefix !== "string")) {
      return fail(response, 400, 400, "InvalidRequest", "prefixes must be a list of object names");
    }

    const who = caller(request);
    // Like Storage, deleting reads the row back, so it needs the SELECT policy as well.
    const result = await runPsql(
      dbUrl,
      { sub: who.sub, bucket: bucketId, names: JSON.stringify(prefixes) },
      asCaller(
        who,
        `with removed as (
           delete from storage.objects o
           where o.bucket_id = :'bucket' and o.name in (select json_array_elements_text(:'names'::json))
           returning o.id, o.bucket_id, o.name, o.owner, o.metadata, o.created_at, o.updated_at, o.last_accessed_at
         )
         select coalesce(json_agg(removed), '[]'::json) from removed;`,
      ),
    );
    if (result.code !== 0) {
      const error = sqlError(result.stderr);
      if (error.state === "42501") return fail(response, 400, 403, "Unauthorized", error.message);
      console.error("[storage] remove failed", error);
      return fail(response, 500, 500, "Internal", error.message);
    }
    // psql prints the select's single line last; earlier lines are from begin/set
    const removed = JSON.parse(result.stdout.split("\n").filter(Boolean).pop() || "[]");
    for (const row of removed) {
      const path = filePath(bucketId, row.name);
      if (path) rmSync(path, { force: true });
    }
    return send(response, 200, removed);
  }

  // -------------------------------------------------------------------- list
  async function list(request, response, bucketId) {
    const bucket = await getBucket(bucketId);
    if (!bucket) return fail(response, 404, 404, "Bucket not found", "Bucket not found");
    let options;
    try {
      options = JSON.parse((await readBody(request, 1024 * 1024))?.toString() || "{}");
    } catch {
      return fail(response, 400, 400, "InvalidRequest", "Invalid JSON");
    }
    const prefix = String(options.prefix ?? "").replace(/^\/+|\/+$/g, "");
    const limit = Math.min(Math.max(Number(options.limit ?? 100) || 100, 1), 1000);
    const offset = Math.max(Number(options.offset ?? 0) || 0, 0);

    const who = caller(request);
    const result = await runPsql(
      dbUrl,
      { sub: who.sub, bucket: bucketId, prefix: prefix ? `${prefix}/` : "" },
      asCaller(
        who,
        `select coalesce(json_agg(t), '[]'::json) from (
           select o.id, o.name, o.metadata, o.created_at, o.updated_at, o.last_accessed_at
           from storage.objects o
           where o.bucket_id = :'bucket' and starts_with(o.name, :'prefix')
           order by o.name
         ) t;`,
      ),
    );
    if (result.code !== 0) {
      const error = sqlError(result.stderr);
      return fail(response, 500, 500, "Internal", error.message);
    }
    const rows = JSON.parse(result.stdout.split("\n").filter(Boolean).pop() || "[]");
    // one level only: files directly under the prefix, and the folders below it
    const entries = new Map();
    for (const row of rows) {
      const rest = row.name.slice(prefix ? prefix.length + 1 : 0);
      const slash = rest.indexOf("/");
      if (slash === -1) entries.set(rest, { ...row, name: rest });
      else if (!entries.has(rest.slice(0, slash))) {
        entries.set(rest.slice(0, slash), { id: null, name: rest.slice(0, slash), metadata: null, created_at: null, updated_at: null, last_accessed_at: null });
      }
    }
    return send(response, 200, [...entries.values()].slice(offset, offset + limit));
  }

  // ------------------------------------------------------------------ router
  return {
    /** Removes every stored file; the metadata goes with the database on --reset. */
    reset() {
      rmSync(filesRoot, { recursive: true, force: true });
    },

    async handle(request, response, url) {
      const route = url.pathname.replace(/^\/storage\/v1/, "").split("/").filter(Boolean);
      const method = request.method ?? "GET";
      try {
        if (route[0] === "object") {
          if (route[1] === "public" && (method === "GET" || method === "HEAD") && route.length > 3) {
            return await download(request, response, url, route[2], route.slice(3));
          }
          if (route[1] === "list" && method === "POST" && route.length === 3) return await list(request, response, route[2]);
          if (method === "POST" && route.length > 2 && !["sign", "upload", "public", "list", "info"].includes(route[1])) {
            return await upload(request, response, route[1], route.slice(2));
          }
          if (method === "DELETE" && route.length === 2) return await remove(request, response, route[1]);
        }
      } catch (error) {
        console.error("[storage]", error);
        return fail(response, 500, 500, "Internal", String(error));
      }
      return fail(response, 501, 501, "Not implemented", `The local Storage fake does not implement ${method} ${url.pathname}`);
    },
  };
}
