import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  mensajeDeError,
  publicarAviso,
  quitarAviso,
  reiniciarAvisos,
  suscribirseAvisos,
  type Aviso,
} from "../lib/aviso";

beforeEach(() => reiniciarAvisos());
afterEach(() => vi.restoreAllMocks());

describe("avisos de error de la API (contrato Error {code, message})", () => {
  it("mapea NoAutenticado a null (lo maneja AuthContext, no duplica aviso)", () => {
    expect(mensajeDeError({ response: { status: 401, data: { error: { code: "NoAutenticado" } } } })).toBeNull();
  });

  it("mapea SinPermiso / NoEncontrado / ServicioNoDisponible a mensajes usables", () => {
    const sinPermiso = mensajeDeError({ response: { status: 403, data: { error: { code: "SinPermiso" } } } });
    expect(sinPermiso).toMatch(/rol|permiso/i);
    const noHallado = mensajeDeError({ response: { status: 404, data: { error: { code: "NoEncontrado" } } } });
    expect(noHallado).toMatch(/no existe/i);
    const caido = mensajeDeError({ response: { status: 503, data: { error: { code: "ServicioNoDisponible" } } } });
    expect(caido).toMatch(/disponible/i);
  });

  it("mapea timeout/red de axios a mensaje de reconexión", () => {
    expect(mensajeDeError({ code: "ECONNABORTED" })).toMatch(/conexión/i);
    expect(mensajeDeError({ code: "ERR_NETWORK" })).toMatch(/conexión/i);
  });

  it("publica un aviso, notifica a los suscriptores y permite descartarlo", () => {
    const vistas: Aviso[][] = [];
    const libera = suscribirseAvisos((l) => vistas.push(l));
    publicarAviso({ texto: "Falla de prueba", onReintentar: () => {} });
    const ultima = vistas[vistas.length - 1] as Aviso[];
    expect(ultima.length).toBe(1);
    expect(ultima[0].texto).toBe("Falla de prueba");
    expect(typeof ultima[0].onReintentar).toBe("function");
    // descartar genera una nueva notificación con la lista vacía
    quitarAviso(ultima[0].id);
    expect((vistas[vistas.length - 1] as Aviso[]).length).toBe(0);
    libera();
  });

  it("los avisos con Reintentar persisten; los otros se auto-descartan a los 8 s", () => {
    // no puede combinarse saltando avisos previos; estado ya reiniciado en beforeEach
    vi.useFakeTimers();
    const vistas: Aviso[][] = [];
    const observadores: Array<() => void> = [];
    observadores.push(suscribirseAvisos((l) => vistas.push(l)));
    publicarAviso({ texto: "con retry", onReintentar: () => {} });
    publicarAviso({ texto: "sin retry" });
    expect((vistas[vistas.length - 1] as Aviso[]).length).toBe(2);
    vi.advanceTimersByTime(8100);
    const alFinal = vistas[vistas.length - 1] as Aviso[];
    expect(alFinal.map((x) => x.texto)).toEqual(["con retry"]);
    for (const o of observadores) o();
    vi.useRealTimers();
  });
});
