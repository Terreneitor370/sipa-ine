import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raizApi = path.resolve(aqui, "..");
const raizRepo = path.resolve(raizApi, "..", "..");

for (const archivo of [path.join(raizApi, ".env"), path.join(raizRepo, ".env")]) {
  if (existsSync(archivo)) dotenv.config({ path: archivo, quiet: true });
}

const numero = (v, d) => (v != null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : d);

const cfg = {
  host: process.env.MYSQL_HOST ?? "localhost",
  port: numero(process.env.MYSQL_PORT, 3306),
  database: process.env.MYSQL_DATABASE ?? "sipa_ine",
  user: process.env.MYSQL_USER ?? "sipa",
  password: process.env.MYSQL_PASSWORD ?? "cambiar",
};

const pausa = (ms) => new Promise((ok) => setTimeout(ok, ms));

async function esperarMysql(intentos = 30, esperaMs = 1500) {
  let ultimoError;
  for (let i = 1; i <= intentos; i++) {
    try {
      const conn = await mysql.createConnection({
        host: cfg.host,
        port: cfg.port,
        user: cfg.user,
        password: cfg.password,
      });
      await conn.query("SELECT 1");
      await conn.end();
      return;
    } catch (err) {
      ultimoError = err;
      if (i < intentos) await pausa(esperaMs);
    }
  }
  throw ultimoError;
}

async function asegurarBase() {
  const conn = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    multipleStatements: true,
  });
  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${cfg.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
    );
  } finally {
    await conn.end();
  }
}

async function conexionBase() {
  return mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    multipleStatements: true,
  });
}

async function listarSql(relativa) {
  const carpeta = path.join(raizRepo, relativa);
  const entries = await readdir(carpeta, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".sql"))
    .map((e) => ({ nombre: e.name, ruta: path.join(carpeta, e.name) }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

async function aplicarLotes({ directorio, tablaControl }) {
  const archivos = await listarSql(directorio);
  if (!archivos.length) {
    console.log(`No hay archivos SQL en ${directorio}`);
    return;
  }

  const conn = await conexionBase();
  try {
    await conn.query(
      `CREATE TABLE IF NOT EXISTS \`${tablaControl}\` (
        nombre VARCHAR(255) NOT NULL PRIMARY KEY,
        aplicadoEn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB`,
    );

    const [rows] = await conn.query(`SELECT nombre FROM \`${tablaControl}\``);
    const aplicados = new Set(rows.map((r) => r.nombre));

    for (const archivo of archivos) {
      if (aplicados.has(archivo.nombre)) {
        console.log(`- omitido ${archivo.nombre}`);
        continue;
      }
      const sql = await readFile(archivo.ruta, "utf8");
      if (!sql.trim()) {
        await conn.query(`INSERT INTO \`${tablaControl}\` (nombre) VALUES (?)`, [archivo.nombre]);
        console.log(`- marcado como aplicado ${archivo.nombre} (vacío)`);
        continue;
      }
      await conn.query(sql);
      await conn.query(`INSERT INTO \`${tablaControl}\` (nombre) VALUES (?)`, [archivo.nombre]);
      console.log(`- aplicado ${archivo.nombre}`);
    }
  } finally {
    await conn.end();
  }
}

async function migrar() {
  await esperarMysql();
  await asegurarBase();
  await aplicarLotes({ directorio: "db/migrations", tablaControl: "_migrations" });
}

async function seed() {
  await esperarMysql();
  await asegurarBase();
  await aplicarLotes({ directorio: "db/seeds", tablaControl: "_seeds" });
}

async function main() {
  const accion = process.argv[2] ?? "setup";
  if (!["migrate", "seed", "setup"].includes(accion)) {
    console.error("Uso: node src/db-cli.js [migrate|seed|setup]");
    process.exit(1);
  }

  if (accion === "migrate") {
    await migrar();
    return;
  }
  if (accion === "seed") {
    await seed();
    return;
  }

  await migrar();
  await seed();
}

main().catch((err) => {
  console.error("Error ejecutando tareas de base de datos:", err.message);
  process.exit(1);
});
