// Pruebas del API con datos de ejemplo (test/fixtures), sin datos reales.
import assert from "node:assert/strict";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { crearApp } from "../src/app.js";
import { efectoCasillas } from "../src/simulador.js";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const config = {
  prefijo: "/api/v1",
  dirDatos: path.join(aqui, "fixtures"),
  origenes: ["http://localhost:5173"],
  jwt: { secreto: "secreto-de-prueba", expiraHoras: 8 },
  usuarios: [
    { id: 1, nombre: "Admin Prueba", email: "admin@prueba.local", password: "clave-admin-1", rol: "ADMIN" },
    { id: 2, nombre: "Analista Prueba", email: "analista@prueba.local", password: "clave-analista-1", rol: "ANALISTA" },
  ],
};

let servidor;
let base;
let tokenAdmin;
let tokenAnalista;

const correoUnico = (prefijo = "usuario") => `${prefijo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@prueba.local`;

async function pedir(ruta, { metodo = "GET", token, cuerpo } = {}) {
  const r = await fetch(base + ruta, {
    method: metodo,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(cuerpo ? { "Content-Type": "application/json" } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  return { estado: r.status, datos: await r.json() };
}

before(async () => {
  servidor = crearApp(config).listen(0);
  await new Promise((ok) => servidor.once("listening", ok));
  base = `http://127.0.0.1:${servidor.address().port}/api/v1`;
  tokenAdmin = (await pedir("/auth/login", { metodo: "POST", cuerpo: { email: "admin@prueba.local", password: "clave-admin-1" } })).datos.token;
  tokenAnalista = (await pedir("/auth/login", { metodo: "POST", cuerpo: { email: "ANALISTA@prueba.local", password: "clave-analista-1" } })).datos.token;
});

after(() => servidor.close());

describe("autenticación", () => {
  test("health es público", async () => {
    const r = await pedir("/health");
    assert.equal(r.estado, 200);
    assert.equal(r.datos.modeloVersion, "1.0.0");
  });

  test("credenciales incorrectas regresan 401 INVALID_CREDENTIALS", async () => {
    const r = await pedir("/auth/login", { metodo: "POST", cuerpo: { email: "admin@prueba.local", password: "mala" } });
    assert.equal(r.estado, 401);
    assert.equal(r.datos.error.code, "INVALID_CREDENTIALS");
  });

  test("sin token regresa 401", async () => {
    const r = await pedir("/entidades");
    assert.equal(r.estado, 401);
    assert.equal(r.datos.error.code, "UNAUTHORIZED");
  });

  test("auth/me regresa el usuario sin contraseña", async () => {
    const r = await pedir("/auth/me", { token: tokenAdmin });
    assert.equal(r.datos.rol, "ADMIN");
    assert.equal(r.datos.hash, undefined);
  });

  test("usuarios solo para ADMIN", async () => {
    assert.equal((await pedir("/usuarios", { token: tokenAnalista })).estado, 403);
    assert.ok((await pedir("/usuarios", { token: tokenAdmin })).datos.length >= 2);
  });

  test("ADMIN puede crear usuarios", async () => {
    const email = correoUnico("analista");
    const cuerpo = { nombre: "Nuevo Analista", email, password: "clave-prueba-2", rol: "ANALISTA" };
    const creado = await pedir("/usuarios", { metodo: "POST", token: tokenAdmin, cuerpo });
    assert.equal(creado.estado, 201);
    assert.equal(creado.datos.email, email);
    assert.equal(creado.datos.rol, "ANALISTA");

    const login = await pedir("/auth/login", { metodo: "POST", cuerpo: { email, password: cuerpo.password } });
    assert.equal(login.estado, 200);
    assert.equal(login.datos.usuario.email, email);
  });

  test("ANALISTA no puede crear usuarios", async () => {
    const r = await pedir("/usuarios", {
      metodo: "POST",
      token: tokenAnalista,
      cuerpo: { nombre: "Sin permiso", email: correoUnico("sin-permiso"), password: "clave-prueba-3", rol: "ANALISTA" },
    });
    assert.equal(r.estado, 403);
  });

  test("no permite crear usuarios con correo repetido", async () => {
    const email = correoUnico("duplicado");
    const cuerpo = { nombre: "Usuario Base", email, password: "clave-prueba-4", rol: "ANALISTA" };
    assert.equal((await pedir("/usuarios", { metodo: "POST", token: tokenAdmin, cuerpo })).estado, 201);
    const duplicado = await pedir("/usuarios", {
      metodo: "POST",
      token: tokenAdmin,
      cuerpo: { ...cuerpo, nombre: "Usuario Repetido", email: email.toUpperCase() },
    });
    assert.equal(duplicado.estado, 409);
    assert.equal(duplicado.datos.error.code, "USER_ALREADY_EXISTS");
  });

  test("valida los campos de alta de usuario", async () => {
    const r = await pedir("/usuarios", {
      metodo: "POST",
      token: tokenAdmin,
      cuerpo: { nombre: "A", email: "correo-invalido", password: "123", rol: "INVALIDO" },
    });
    assert.equal(r.estado, 400);
    assert.equal(r.datos.error.code, "VALIDATION_ERROR");
    assert.equal(r.datos.error.details.length, 4);
  });
});

describe("consultas", () => {
  test("riesgo por entidad y filtros", async () => {
    const r = await pedir("/riesgo?entidad=26", { token: tokenAnalista });
    assert.equal(r.datos.secciones.length, 3);
    assert.equal(r.datos.umbrales.muyAlto, 0.6183);
    const f = await pedir("/riesgo?entidad=26&municipio=49&nivel=BAJO", { token: tokenAnalista });
    assert.deepEqual(f.datos.secciones.map((s) => s.seccion), [101]);
  });

  test("entidad fuera de rango regresa 400", async () => {
    const r = await pedir("/riesgo?entidad=40", { token: tokenAnalista });
    assert.equal(r.estado, 400);
    assert.equal(r.datos.error.code, "VALIDATION_ERROR");
  });

  test("ficha, explicación y colonias", async () => {
    const f = await pedir("/secciones/26/729", { token: tokenAnalista });
    assert.equal(f.datos.municipioNombre, "San Luis Río Colorado");
    assert.equal(f.datos.prediccion.nivelRiesgo, "MUY_ALTO");
    const x = await pedir("/secciones/26/729/explicacion", { token: tokenAnalista });
    assert.equal(x.datos.factores.length, 1);
    const c = await pedir("/secciones/26/729/colonias", { token: tokenAnalista });
    assert.deepEqual(c.datos.map((x) => x.colonia), ["Ejemplo Norte", "Ejemplo Sur"]);
    assert.equal((await pedir("/secciones/26/9999", { token: tokenAnalista })).estado, 404);
  });

  test("riesgo por municipio ponderado por lista nominal", async () => {
    const r = await pedir("/riesgo/municipios?entidad=26", { token: tokenAnalista });
    const hmo = r.datos.find((m) => m.municipio === 49);
    assert.equal(hmo.secciones, 2);
    assert.equal(hmo.abstencionPred, Math.round(((0.5 * 1000 + 0.3 * 800) / 1800) * 1e4) / 1e4);
  });

  test("geo en TopoJSON y búsqueda con bbox", async () => {
    const g = await pedir("/geo/26", { token: tokenAnalista });
    assert.equal(g.datos.type, "Topology");
    assert.equal(g.datos.objects.secciones.geometries.length, 2);
    const gm = await pedir("/geo/26/49", { token: tokenAnalista });
    assert.equal(gm.datos.objects.secciones.geometries.length, 1);
    const b = await pedir("/buscar?q=729", { token: tokenAnalista });
    assert.equal(b.datos[0].tipo, "seccion");
    assert.equal(b.datos[0].bbox.length, 4);
    const m = await pedir("/buscar?q=san luis rio", { token: tokenAnalista });
    assert.equal(m.datos[0].tipo, "municipio");
    const col = await pedir("/buscar?q=norte", { token: tokenAnalista });
    assert.equal(col.datos[0].tipo, "colonia");
  });
});

describe("simulador", () => {
  test("interpolación del efecto de casillas", () => {
    const red = [0.1, 0.2, 0.3, 0.4];
    assert.equal(efectoCasillas([-0.01, -0.02, -0.03, -0.04], red, 0), 0);
    assert.ok(Math.abs(efectoCasillas([-0.01, -0.02, -0.03, -0.04], red, 0.15) + 0.015) < 1e-9);
    assert.equal(efectoCasillas([-0.01, -0.02, -0.03, -0.04], red, 0.5), -0.04);
  });

  test("crea escenario, lo cachea y prioriza", async () => {
    const cuerpo = {
      nombre: "Prueba",
      entidad: 26,
      palancas: {
        reduccionElectoresCasilla: 0.2,
        distMacMaxKm: null,
        campanaDigital: { efectoPp: 1, cobertura: 0.5 },
        focalizacion: { niveles: ["MUY_ALTO", "ALTO"], municipios: [] },
      },
    };
    const r = await pedir("/simulaciones", { metodo: "POST", token: tokenAnalista, cuerpo });
    assert.equal(r.estado, 201);
    assert.equal(r.datos.resumen.seccionesAfectadas, 1);
    // 0.77 - 0.02 (casillas) - 0.005 (campaña) = 0.745 -> 0.025 * 15000 = 375 votos
    assert.equal(r.datos.resumen.votosRecuperables, 375);
    const otra = await pedir("/simulaciones", { metodo: "POST", token: tokenAnalista, cuerpo });
    assert.equal(otra.estado, 200);
    assert.equal(otra.datos.cache, true);
    const p = await pedir(`/priorizacion?escenario=${r.datos.escenarioId}`, { token: tokenAnalista });
    assert.equal(p.datos[0].seccion, 729);
    assert.equal(p.datos[0].abstencionB, 0.745);
    const e = await pedir("/escenarios", { token: tokenAnalista });
    assert.equal(e.datos[0].creadoPor, "Analista Prueba");
  });

  test("palancas inválidas regresan 400", async () => {
    const r = await pedir("/simulaciones", {
      metodo: "POST",
      token: tokenAnalista,
      cuerpo: { entidad: 26, palancas: { reduccionElectoresCasilla: 2, focalizacion: { niveles: ["X"] } } },
    });
    assert.equal(r.estado, 400);
    assert.equal(r.datos.error.details.length, 2);
  });
});
