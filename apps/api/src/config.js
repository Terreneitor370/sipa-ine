// Configuración del API. Todo sale de variables de entorno (.env en la raíz
// del repo o en apps/api). Ninguna credencial se escribe en el código.
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raizApi = path.resolve(aqui, "..");
const raizRepo = path.resolve(raizApi, "..", "..");

for (const archivo of [path.join(raizApi, ".env"), path.join(raizRepo, ".env")]) {
  if (existsSync(archivo)) dotenv.config({ path: archivo, quiet: true });
}

const entero = (v, d) => (v != null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : d);

let jwtSecreto = process.env.JWT_SECRET;
let secretoTemporal = false;
if (!jwtSecreto) {
  // Solo para desarrollo: cada reinicio invalida las sesiones.
  jwtSecreto = randomBytes(32).toString("hex");
  secretoTemporal = true;
}

export const config = {
  puerto: entero(process.env.API_PORT, 4000),
  prefijo: "/api/v1",
  dirDatos: path.resolve(raizRepo, process.env.DATA_DIR ?? "data/processed"),
  origenes: (process.env.CORS_ORIGINS ?? "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  jwt: { secreto: jwtSecreto, expiraHoras: entero(process.env.JWT_EXPIRES_HOURS, 8), temporal: secretoTemporal },
  usuarios: [
    {
      id: 1,
      nombre: process.env.ADMIN_NAME ?? "Administrador",
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      rol: "ADMIN",
    },
    {
      id: 2,
      nombre: process.env.ANALISTA_NAME ?? "Analista",
      email: process.env.ANALISTA_EMAIL,
      password: process.env.ANALISTA_PASSWORD,
      rol: "ANALISTA",
    },
  ].filter((u) => u.email && u.password),
};
