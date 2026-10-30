import { crearApp } from "./app.js";
import { config } from "./config.js";

if (config.usuarios.length === 0) {
  console.error(
    "No hay usuarios configurados. Defina ADMIN_EMAIL y ADMIN_PASSWORD (y opcionalmente " +
      "ANALISTA_EMAIL y ANALISTA_PASSWORD) en el archivo .env. Vea apps/api/README.md.",
  );
  process.exit(1);
}
if (config.jwt.temporal) {
  console.warn("JWT_SECRET no está definido: se usa uno temporal y las sesiones se pierden al reiniciar.");
}

const app = crearApp(config);
app.listen(config.puerto, () => {
  console.log(`API SIPA-INE en http://localhost:${config.puerto}${config.prefijo}`);
  console.log(`Datos: ${config.dirDatos}`);
});
