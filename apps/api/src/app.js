// API de SIPA-INE (contrato: docs/openapi.yaml). Sirve el pronóstico 2027 que
// exporta ml/src/export/exportar_api.py; no requiere MySQL para la demo.
import compression from "compression";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { Autenticacion } from "./auth.js";
import { Datos } from "./datos.js";
import { ErrorApi, entero, manejadorErrores, noEncontrado, validacion } from "./errores.js";
import { NIVELES, simular, validarPalancas } from "./simulador.js";

const sinAcentos = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

export function crearApp(config, { datos = new Datos(config.dirDatos) } = {}) {
  const app = express();
  const auth = new Autenticacion(config);
  const escenarios = []; // escenarios guardados en memoria (se pierden al reiniciar)
  let siguienteId = 1;

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: config.origenes, allowedHeaders: ["Content-Type", "Authorization"] }));
  app.use(compression());
  app.use(express.json({ limit: "100kb" }));

  const r = express.Router();

  // ---------- Sistema y autenticación (públicos) ----------
  r.get("/health", (_req, res) => {
    const ok = datos.disponible();
    res.json({
      api: "ok",
      db: "no-aplica",
      mlService: ok ? "ok" : "sin-datos",
      modeloVersion: ok ? datos.modelo().version : null,
    });
  });

  const limiteLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: (_req, res) =>
      res.status(429).json({ error: { code: "TOO_MANY_ATTEMPTS", message: "Demasiados intentos; espere 15 minutos" } }),
  });

  r.post("/auth/login", limiteLogin, async (req, res) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      throw validacion("Parámetros inválidos", [{ campo: "email/password", mensaje: "Son obligatorios" }]);
    }
    res.json(await auth.login(email, password));
  });

  // ---------- Todo lo demás requiere sesión ----------
  r.use(auth.requerir());
  r.use((_req, _res, next) =>
    datos.disponible()
      ? next()
      : next(new ErrorApi(503, "ML_UNAVAILABLE", "No hay datos del modelo; ejecute ml/src/export/exportar_api.py")),
  );

  r.get("/auth/me", (req, res) => res.json(req.usuario));

  r.get("/usuarios", Autenticacion.rol("ADMIN"), (_req, res) => res.json(auth.usuarios.map((u) => auth.publico(u))));

  const entidadValida = (v) => {
    const e = entero(v, "entidad", { min: 1, max: 32 });
    if (!datos.existeEntidad(e)) throw noEncontrado(`No hay datos de la entidad ${e}`);
    return e;
  };

  const riesgoDe = (e, s) => ({
    entidad: e,
    seccion: s.seccion,
    municipio: s.municipio,
    tipoSeccion: s.tipoSeccion,
    listaNominal: s.listaNominal,
    abstencionPred: s.abstencionPred,
    p10: s.p10,
    p90: s.p90,
    nivelRiesgo: s.nivelRiesgo,
  });

  // ---------- Catálogos ----------
  r.get("/entidades", (_req, res) => res.json(datos.entidades()));

  r.get("/entidades/:entidad/municipios", (req, res) => {
    const e = entidadValida(req.params.entidad);
    res.json(datos.municipios(e));
  });

  // ---------- Riesgo ----------
  r.get("/riesgo", (req, res) => {
    const e = entidadValida(req.query.entidad);
    const m = entero(req.query.municipio, "municipio", { min: 1, opcional: true });
    const niveles = req.query.nivel ? String(req.query.nivel).split(",").map((x) => x.trim()) : null;
    if (niveles?.some((n) => !NIVELES.includes(n))) {
      throw validacion("Parámetros inválidos", [{ campo: "nivel", mensaje: `Valores permitidos: ${NIVELES.join(", ")}` }]);
    }
    const modelo = datos.modelo();
    const secciones = datos
      .secciones(e)
      .lista.filter((s) => (m == null || s.municipio === m) && (!niveles || niveles.includes(s.nivelRiesgo)))
      .map((s) => riesgoDe(e, s));
    res.json({
      escenario: "inercial",
      modeloVersion: modelo.version,
      eleccionObjetivo: modelo.eleccionObjetivo,
      umbrales: modelo.umbrales,
      secciones,
    });
  });

  r.get("/riesgo/municipios", (req, res) => {
    const lista = req.query.entidad ? [entidadValida(req.query.entidad)] : datos.entidades().map((x) => x.entidad);
    const u = datos.modelo().umbrales;
    const salida = [];
    for (const e of lista) {
      const grupos = new Map();
      for (const s of datos.secciones(e).lista) {
        const g = grupos.get(s.municipio) ?? { n: 0, ln: 0, suma: 0, porNivel: { MUY_ALTO: 0, ALTO: 0, MEDIO: 0, BAJO: 0 } };
        g.n += 1;
        g.ln += s.listaNominal;
        g.suma += s.abstencionPred * s.listaNominal;
        g.porNivel[s.nivelRiesgo] += 1;
        grupos.set(s.municipio, g);
      }
      for (const [m, g] of grupos) {
        const a = g.ln ? g.suma / g.ln : 0;
        salida.push({
          entidad: e,
          municipio: m,
          nombre: datos.nombreMunicipio(e, m),
          secciones: g.n,
          listaNominal: g.ln,
          abstencionPred: Math.round(a * 1e4) / 1e4,
          nivelRiesgo: a >= u.muyAlto ? "MUY_ALTO" : a >= u.alto ? "ALTO" : a >= u.medio ? "MEDIO" : "BAJO",
          porNivel: g.porNivel,
        });
      }
    }
    res.json(salida);
  });

  // ---------- Secciones ----------
  const seccionDe = (req) => {
    const e = entidadValida(req.params.entidad);
    const s = entero(req.params.seccion, "seccion", { min: 1 });
    const fila = datos.seccion(e, s);
    if (!fila) throw noEncontrado(`No existe la sección ${s} en la entidad ${e}`);
    return { e, fila };
  };

  r.get("/secciones/:entidad/:seccion", (req, res) => {
    const { e, fila } = seccionDe(req);
    const modelo = datos.modelo();
    res.json({
      entidad: e,
      seccion: fila.seccion,
      municipio: fila.municipio,
      municipioNombre: datos.nombreMunicipio(e, fila.municipio),
      distritoFederal: fila.distritoFederal,
      tipoSeccion: fila.tipoSeccion,
      modeloVersion: modelo.version,
      historial: fila.historial,
      indicadores: { ...fila.indicadores, distMacKm: fila.indicadores?.distMacKm ?? datos.distanciaMac(e, fila.seccion) },
      prediccion: {
        escenario: "inercial",
        eleccionObjetivo: modelo.eleccionObjetivo,
        abstencionPred: fila.abstencionPred,
        p10: fila.p10,
        p90: fila.p90,
        nivelRiesgo: fila.nivelRiesgo,
      },
    });
  });

  r.get("/secciones/:entidad/:seccion/explicacion", (req, res) => {
    const { e, fila } = seccionDe(req);
    const modelo = datos.modelo();
    res.json({
      entidad: e,
      seccion: fila.seccion,
      // Punto de partida de SHAP expresado en abstención absoluta
      valorBase: Math.round((modelo.valorBase + modelo.supuestoNivelNacional2027) * 1e4) / 1e4,
      abstencionPred: fila.abstencionPred,
      factores: fila.factores,
    });
  });

  r.get("/secciones/:entidad/:seccion/colonias", (req, res) => {
    const { e, fila } = seccionDe(req);
    const colonias = datos
      .colonias(e)
      .filter((c) => c.seccion === fila.seccion)
      .map((c) => ({ colonia: c.colonia, pctArea: c.pctArea }))
      .sort((a, b) => (b.pctArea ?? 0) - (a.pctArea ?? 0));
    res.json(colonias);
  });

  // ---------- Cartografía ----------
  const geoVacio = { type: "Topology", objects: { secciones: { type: "GeometryCollection", geometries: [] } }, arcs: [] };

  r.get("/geo/nacional", (_req, res) => {
    throw noEncontrado("La cartografía nacional se sirve desde el frontend (public/geo/mexico-estados.json)");
  });

  // Extensión del contrato: todas las secciones de la entidad (lo usa el frontend).
  r.get("/geo/:entidad", (req, res) => {
    const e = entidadValida(req.params.entidad);
    const g = datos.geo(e);
    res.set("Cache-Control", "private, max-age=604800");
    res.json(g ? g.topo : geoVacio);
  });

  r.get("/geo/:entidad/:municipio", (req, res) => {
    const e = entidadValida(req.params.entidad);
    const m = entero(req.params.municipio, "municipio", { min: 1 });
    const g = datos.geo(e);
    if (!g) throw noEncontrado(`No hay cartografía de la entidad ${e}`);
    const delMunicipio = new Set(datos.secciones(e).lista.filter((s) => s.municipio === m).map((s) => s.seccion));
    const obj = g.topo.objects.secciones;
    res.set("Cache-Control", "private, max-age=604800");
    res.json({
      ...g.topo,
      objects: { secciones: { ...obj, geometries: obj.geometries.filter((x) => delMunicipio.has(x.properties.seccion)) } },
    });
  });

  // ---------- Búsqueda ----------
  r.get("/buscar", (req, res) => {
    const q = sinAcentos(req.query.q);
    if (q.length < 2 && !/^\d+$/.test(q)) {
      throw validacion("Parámetros inválidos", [{ campo: "q", mensaje: "Mínimo 2 caracteres" }]);
    }
    const limite = entero(req.query.limite, "limite", { min: 1, max: 50, opcional: true }) ?? 10;
    const entidades = req.query.entidad ? [entidadValida(req.query.entidad)] : datos.entidades().map((x) => x.entidad);
    const nombreEnt = new Map(datos.entidades().map((x) => [x.entidad, x.nombre]));
    const salida = [];

    const cajaDe = (e, secciones) => {
      const g = datos.geo(e);
      if (!g) return undefined;
      const cajas = secciones.map((s) => g.bbox.get(s)).filter(Boolean);
      if (!cajas.length) return undefined;
      return [
        Math.min(...cajas.map((c) => c[0])),
        Math.min(...cajas.map((c) => c[1])),
        Math.max(...cajas.map((c) => c[2])),
        Math.max(...cajas.map((c) => c[3])),
      ];
    };

    if (/^\d+$/.test(q)) {
      const s = Number(q);
      for (const e of entidades) {
        const fila = datos.seccion(e, s);
        if (fila) {
          salida.push({
            tipo: "seccion",
            etiqueta: `Sección ${s}, ${datos.nombreMunicipio(e, fila.municipio)}, ${nombreEnt.get(e)}`,
            entidad: e,
            municipio: fila.municipio,
            seccion: s,
            bbox: cajaDe(e, [s]),
          });
        }
        if (salida.length >= limite) break;
      }
    } else {
      for (const e of entidades) {
        // Una colonia puede abarcar varias secciones: se agrupa en un solo resultado
        const grupos = new Map();
        for (const c of datos.colonias(e)) {
          if (!sinAcentos(c.colonia).includes(q)) continue;
          const llave = `${c.colonia}|${c.municipio}`;
          const g = grupos.get(llave) ?? { c, secciones: [], cajas: [] };
          g.secciones.push(c.seccion);
          if (c.bbox) g.cajas.push(c.bbox);
          grupos.set(llave, g);
        }
        for (const { c, secciones, cajas } of grupos.values()) {
          if (salida.length >= limite) break;
          salida.push({
            tipo: "colonia",
            etiqueta: `${c.colonia}, ${datos.nombreMunicipio(e, c.municipio)}`,
            entidad: e,
            municipio: c.municipio,
            seccion: secciones[0],
            secciones,
            bbox: cajas.length
              ? [
                  Math.min(...cajas.map((b) => b[0])),
                  Math.min(...cajas.map((b) => b[1])),
                  Math.max(...cajas.map((b) => b[2])),
                  Math.max(...cajas.map((b) => b[3])),
                ]
              : cajaDe(e, secciones),
          });
        }
        for (const m of datos.municipios(e)) {
          if (salida.length >= limite) break;
          if (sinAcentos(m.nombre).includes(q)) {
            const secs = datos.secciones(e).lista.filter((s) => s.municipio === m.municipio).map((s) => s.seccion);
            salida.push({
              tipo: "municipio",
              etiqueta: `${m.nombre}, ${nombreEnt.get(e)}`,
              entidad: e,
              municipio: m.municipio,
              secciones: secs.slice(0, 1),
              bbox: cajaDe(e, secs),
            });
          }
        }
        if (salida.length >= limite) break;
      }
    }
    res.json(salida.slice(0, limite));
  });

  // ---------- Modelo ----------
  r.get("/modelo", (_req, res) => res.json(datos.modelo()));

  // ---------- Simulador, escenarios y priorización ----------
  r.post("/simulaciones", (req, res) => {
    const cuerpo = req.body ?? {};
    const e = entidadValida(cuerpo.entidad);
    const palancas = validarPalancas(cuerpo.palancas);
    const llave = JSON.stringify({ e, palancas });
    const previo = escenarios.find((x) => x.llave === llave);
    const modelo = datos.modelo();
    if (previo) {
      return res.status(200).json({ escenarioId: previo.escenarioId, modeloVersion: modelo.version, cache: true, resumen: previo.resumen });
    }
    const secciones = datos.secciones(e).lista.map((s) => ({ ...s, entidad: e }));
    const { filas, resumen } = simular(secciones, palancas, modelo);
    const esc = {
      escenarioId: siguienteId++,
      llave,
      nombre: String(cuerpo.nombre ?? "").trim().slice(0, 120) || "Escenario sin nombre",
      entidad: e,
      creadoPor: req.usuario.nombre,
      creadoEn: new Date().toISOString(),
      palancas,
      filas,
      resumen,
    };
    escenarios.unshift(esc);
    if (escenarios.length > 50) escenarios.pop();
    res.status(201).json({ escenarioId: esc.escenarioId, modeloVersion: modelo.version, cache: false, resumen });
  });

  r.get("/escenarios", (_req, res) =>
    res.json(
      escenarios.map((x) => ({
        escenarioId: x.escenarioId,
        nombre: x.nombre,
        entidad: x.entidad,
        creadoPor: x.creadoPor,
        creadoEn: x.creadoEn,
        votosRecuperables: x.resumen.votosRecuperables,
        palancas: x.palancas,
      })),
    ),
  );

  r.get("/priorizacion", (req, res) => {
    const id = entero(req.query.escenario, "escenario", { min: 1 });
    const top = entero(req.query.top, "top", { min: 1, max: 500, opcional: true }) ?? 50;
    const e = entero(req.query.entidad, "entidad", { min: 1, max: 32, opcional: true });
    const esc = escenarios.find((x) => x.escenarioId === id);
    if (!esc) throw noEncontrado(`No existe el escenario ${id}`);
    const filas = esc.filas
      .filter((f) => e == null || f.entidad === e)
      .sort((a, b) => b.votosRecuperables - a.votosRecuperables)
      .slice(0, top)
      .map(({ nivelRiesgo, nivelRiesgoB, ...f }) => f);
    res.json(filas);
  });

  app.use(config.prefijo, r);
  app.use((_req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: "Ruta no encontrada" } }));
  app.use(manejadorErrores);
  return app;
}
