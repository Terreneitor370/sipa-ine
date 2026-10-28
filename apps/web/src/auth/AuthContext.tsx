import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { USAR_MOCKS, http } from "../api/client";
import { adaptarSesion, sesionExpirada, type SesionContrato } from "../lib/adaptadores";

const STORAGE_KEY = "sipa_ine_sesion";
const TOKEN_KEY = "sipa_ine_token";

export type RolUsuario = "ADMIN" | "ANALISTA";

export interface UsuarioSesion {
  id: number;
  nombre: string;
  email: string;
  rol: RolUsuario;
}

/** SesionGuardada: usuario del contrato + expiración (expiraEn es fecha ISO). */
interface SesionGuardada {
  usuario: UsuarioSesion;
  expiraEn: string;
}

interface AuthContextValue {
  usuario: UsuarioSesion | null;
  cargando: boolean;
  iniciarSesion: (email: string, password: string) => Promise<void>;
  cerrarSesion: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function leerSesionLocal(): SesionGuardada | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const sesion = JSON.parse(raw) as SesionGuardada;
    if (!sesion?.usuario) return null;
    if (sesion.expiraEn && sesionExpirada(sesion.expiraEn)) {
      // El token ya expiró: se limpia y se pide reingreso (contrato Sesion.expiraEn)
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return sesion;
  } catch {
    return null;
  }
}

function guardarSesion(sesion: SesionGuardada | null) {
  if (sesion) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sesion));
  else sessionStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(() => leerSesionLocal()?.usuario ?? null);
  const [cargando, setCargando] = useState(true);

  const limpiar = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    guardarSesion(null);
    setUsuario(null);
  }, []);

  // Validación del token contra /auth/me (solo modo real).
  useEffect(() => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token || USAR_MOCKS) {
      setCargando(false);
      return;
    }
    http
      .get<SesionContrato["usuario"]>("/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => {
        const previa = leerSesionLocal();
        const nueva = previa ?? { usuario: data, expiraEn: "" };
        setUsuario(data);
        guardarSesion({ usuario: data, expiraEn: nueva.expiraEn });
      })
      .catch(() => limpiar())
      .finally(() => setCargando(false));
  }, [limpiar]);

  useEffect(() => {
    const id = http.interceptors.request.use((config) => {
      const token = sessionStorage.getItem(TOKEN_KEY);
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
    const errId = http.interceptors.response.use(
      (r) => r,
      (error) => {
        if (error.response?.status === 401) limpiar();
        return Promise.reject(error);
      },
    );
    return () => {
      http.interceptors.request.eject(id);
      http.interceptors.response.eject(errId);
    };
  }, [limpiar]);

  // Vigilancia de expiración: cuando expiraEn pasa, se cierra sesión sola.
  useEffect(() => {
    if (!usuario) return;
    const revisar = () => {
      const sesion = leerSesionLocal();
      if (!sesion) {
        limpiar();
        return;
      }
      if (sesion.expiraEn && sesionExpirada(sesion.expiraEn)) limpiar();
    };
    revisar();
    const t = setInterval(revisar, 30_000);
    return () => clearInterval(t);
  }, [usuario, limpiar]);

  const iniciarSesion = useCallback(async (email: string, password: string) => {
    if (USAR_MOCKS) {
      await new Promise((r) => setTimeout(r, 300));
      const demo: SesionGuardada = {
        usuario: {
          id: 2,
          nombre: "Analista demo",
          email: email.trim().toLowerCase(),
          rol: "ANALISTA",
        },
        // Sesión demo de 8 horas (equivale a expiraEn del contrato)
        expiraEn: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      };
      sessionStorage.setItem(TOKEN_KEY, "mock-jwt-demo");
      setUsuario(demo.usuario);
      guardarSesion(demo);
      return;
    }
    const { data } = await http.post<SesionContrato>("/auth/login", { email, password });
    const { token, usuario: usuarioContrato } = adaptarSesion(data);
    sessionStorage.setItem(TOKEN_KEY, token);
    const sesion: SesionGuardada = { usuario: usuarioContrato as UsuarioSesion, expiraEn: data.expiraEn };
    setUsuario(sesion.usuario);
    guardarSesion(sesion);
  }, []);

  const cerrarSesion = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    guardarSesion(null);
    setUsuario(null);
  }, []);

  const value = useMemo(
    () => ({ usuario, cargando, iniciarSesion, cerrarSesion }),
    [usuario, cargando, iniciarSesion, cerrarSesion],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
