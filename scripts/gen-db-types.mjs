#!/usr/bin/env node
/**
 * Generates apps/web/lib/supabase/types.ts from the LIVE `moments` schema.
 *
 * We do not use `supabase gen types` because there is no Supabase CLI directory
 * in this repo (house convention: raw numbered SQL migrations applied with psql).
 * Introspecting the database directly keeps the types honest -- they cannot drift
 * from what PostgREST will actually serve.
 *
 * Usage: DATABASE_URL=... node scripts/gen-db-types.mjs
 */
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const CONN = process.env.DATABASE_URL;
if (!CONN) {
  console.error("DATABASE_URL is required (see .env.example)");
  process.exit(1);
}
const OUT = "apps/web/lib/supabase/types.ts";

const q = (sql) =>
  JSON.parse(
    execFileSync("psql", [CONN, "-At", "-c", `SELECT coalesce(json_agg(t), '[]') FROM (${sql}) t`], {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    }).trim(),
  );

const columns = q(`
  SELECT c.table_name, c.column_name, c.data_type, c.udt_name, c.is_nullable,
         c.column_default IS NOT NULL AS has_default,
         c.is_generated = 'ALWAYS' AS is_generated
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
   WHERE c.table_schema = 'moments' AND t.table_type = 'BASE TABLE'
   ORDER BY c.table_name, c.ordinal_position
`);

const views = q(`
  SELECT c.table_name, c.column_name, c.data_type, c.udt_name, c.is_nullable
    FROM information_schema.columns c
    JOIN information_schema.views v
      ON v.table_schema = c.table_schema AND v.table_name = c.table_name
   WHERE c.table_schema = 'moments'
   ORDER BY c.table_name, c.ordinal_position
`);

const enums = q(`
  SELECT t.typname AS name, json_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
   WHERE n.nspname = 'moments'
   GROUP BY t.typname
   ORDER BY t.typname
`);

const fks = q(`
  SELECT con.conname               AS foreign_key_name,
         src.relname               AS table_name,
         tgt.relname               AS referenced_relation,
         (SELECT json_agg(a.attname ORDER BY k.ord)
            FROM unnest(con.conkey) WITH ORDINALITY AS k(attnum, ord)
            JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k.attnum)
                                   AS columns,
         (SELECT json_agg(a.attname ORDER BY k.ord)
            FROM unnest(con.confkey) WITH ORDINALITY AS k(attnum, ord)
            JOIN pg_attribute a ON a.attrelid = con.confrelid AND a.attnum = k.attnum)
                                   AS referenced_columns,
         EXISTS (
           SELECT 1 FROM pg_index i
            WHERE i.indrelid = con.conrelid AND i.indisunique
              AND i.indnatts = array_length(con.conkey, 1)
              AND i.indkey::int2[] @> con.conkey AND con.conkey @> i.indkey::int2[]
         )                         AS is_one_to_one
    FROM pg_constraint con
    JOIN pg_class src ON src.oid = con.conrelid
    JOIN pg_class tgt ON tgt.oid = con.confrelid
    JOIN pg_namespace n ON n.oid = src.relnamespace
   WHERE con.contype = 'f' AND n.nspname = 'moments'
   ORDER BY src.relname, con.conname
`);

const fksByTable = new Map();
for (const f of fks) {
  if (!fksByTable.has(f.table_name)) fksByTable.set(f.table_name, []);
  fksByTable.get(f.table_name).push(f);
}

const enumNames = new Set(enums.map((e) => e.name));

function tsType(col) {
  const udt = col.udt_name.replace(/^_/, "");
  const isArray = col.udt_name.startsWith("_") || col.data_type === "ARRAY";
  let base;
  if (enumNames.has(udt)) base = `Database["moments"]["Enums"]["${udt}"]`;
  else if (["int2","int4","int8","numeric","float4","float8"].includes(udt)) base = "number";
  else if (udt === "bool") base = "boolean";
  else if (udt === "json" || udt === "jsonb") base = "Json";
  else base = "string";
  return isArray ? `${base}[]` : base;
}

const pascal = (s) => s.split("_").map((p) => p[0].toUpperCase() + p.slice(1)).join("");

const byTable = new Map();
for (const c of columns) {
  if (!byTable.has(c.table_name)) byTable.set(c.table_name, []);
  byTable.get(c.table_name).push(c);
}
const byView = new Map();
for (const c of views) {
  if (!byView.has(c.table_name)) byView.set(c.table_name, []);
  byView.get(c.table_name).push(c);
}

let out = `/**
 * GENERATED FILE -- do not edit by hand.
 * Regenerate with:  pnpm db:types
 * Source: the live \`moments\` schema (scripts/gen-db-types.mjs).
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  moments: {
    Tables: {
`;

for (const [table, cols] of byTable) {
  out += `      ${table}: {\n        Row: {\n`;
  for (const c of cols) {
    out += `          ${c.column_name}: ${tsType(c)}${c.is_nullable === "YES" ? " | null" : ""};\n`;
  }
  out += `        };\n        Insert: {\n`;
  for (const c of cols) {
    if (c.is_generated) continue;
    const optional = c.has_default || c.is_nullable === "YES";
    out += `          ${c.column_name}${optional ? "?" : ""}: ${tsType(c)}${c.is_nullable === "YES" ? " | null" : ""};\n`;
  }
  out += `        };\n        Update: {\n`;
  for (const c of cols) {
    if (c.is_generated) continue;
    out += `          ${c.column_name}?: ${tsType(c)}${c.is_nullable === "YES" ? " | null" : ""};\n`;
  }
  // Relationships is REQUIRED by postgrest-js's GenericTable. Without it every
  // table resolves to `never` and all query typing silently collapses.
  // Emitting the real FKs also makes embedded selects -- organizations(...) --
  // type correctly.
  out += `        };\n        Relationships: [\n`;
  for (const f of fksByTable.get(table) ?? []) {
    out += `          {\n`;
    out += `            foreignKeyName: ${JSON.stringify(f.foreign_key_name)};\n`;
    out += `            columns: [${f.columns.map((c) => JSON.stringify(c)).join(", ")}];\n`;
    out += `            isOneToOne: ${f.is_one_to_one};\n`;
    out += `            referencedRelation: ${JSON.stringify(f.referenced_relation)};\n`;
    out += `            referencedColumns: [${f.referenced_columns.map((c) => JSON.stringify(c)).join(", ")}];\n`;
    out += `          },\n`;
  }
  out += `        ];\n      };\n`;
}

out += `    };\n    Views: {\n`;
for (const [view, cols] of byView) {
  out += `      ${view}: {\n        Row: {\n`;
  for (const c of cols) {
    out += `          ${c.column_name}: ${tsType(c)}${c.is_nullable === "YES" ? " | null" : ""};\n`;
  }
  out += `        };\n        Relationships: [];\n      };\n`;
}

out += `    };\n    Functions: Record<string, never>;\n    CompositeTypes: Record<string, never>;\n    Enums: {\n`;
for (const e of enums) {
  out += `      ${e.name}: ${e.labels.map((l) => JSON.stringify(l)).join(" | ")};\n`;
}
out += `    };\n  };\n}\n\n`;

out += `// Convenience aliases for the tables the app touches most.\n`;
out += `type T = Database["moments"]["Tables"];\n`;
for (const table of byTable.keys()) {
  out += `export type ${pascal(table)}Row = T["${table}"]["Row"];\n`;
}
out += `export type MomentsEnums = Database["moments"]["Enums"];\n`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, out);
console.log(`Wrote ${OUT}: ${byTable.size} tables, ${byView.size} views, ${enums.length} enums`);
