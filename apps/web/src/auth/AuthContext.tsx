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

const STORAGE_KEY = "sipa_ine_sesion";

export type RolUsuario = "ADMIN" | "ANALISTA";

export interface UsuarioSesion {
  id: number;
  nombre: string;
  email: string;
  rol: RolUsuario;
}

interface AuthContextValue {
  usuario: UsuarioSesion | null;
  cargando: boolean;
  iniciarSesion: (email: string, password: string) => Promise<void>;
  cerrarSesion: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function leerSesionLocal(): UsuarioSesion | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UsuarioSesion;
  } catch {
    return null;
  }
}

function guardarSesion(usuario: UsuarioSesion | null) {
  if (usuario) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(usuario));
  else sessionStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(() => leerSesionLocal());
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem("sipa_ine_token");
    if (!token || USAR_MOCKS) {
      setCargando(false);
      return;
    }
    http
      .get<UsuarioSesion>("/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => {
        setUsuario(data);
        guardarSesion(data);
      })
      .catch(() => {
        sessionStorage.removeItem("sipa_ine_token");
        setUsuario(null);
        guardarSesion(null);
      })
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    const id = http.interceptors.request.use((config) => {
      const token = sessionStorage.getItem("sipa_ine_token");
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
    const errId = http.interceptors.response.use(
      (r) => r,
      (error) => {
        if (error.response?.status === 401) {
          sessionStorage.removeItem("sipa_ine_token");
          setUsuario(null);
          guardarSesion(null);
        }
        return Promise.reject(error);
      },
    );
    return () => {
      http.interceptors.request.eject(id);
      http.interceptors.response.eject(errId);
    };
  }, []);

  const iniciarSesion = useCallback(async (email: string, password: string) => {
    if (USAR_MOCKS) {
      await new Promise((r) => setTimeout(r, 300));
      const demo: UsuarioSesion = {
        id: 2,
        nombre: "Analista demo",
        email: email.trim().toLowerCase(),
        rol: "ANALISTA",
      };
      sessionStorage.setItem("sipa_ine_token", "mock-jwt-demo");
      setUsuario(demo);
      guardarSesion(demo);
      return;
    }
    const { data } = await http.post<{ token: string; usuario: UsuarioSesion }>("/auth/login", {
      email,
      password,
    });
    sessionStorage.setItem("sipa_ine_token", data.token);
    setUsuario(data.usuario);
    guardarSesion(data.usuario);
  }, []);

  const cerrarSesion = useCallback(() => {
    sessionStorage.removeItem("sipa_ine_token");
    setUsuario(null);
    guardarSesion(null);
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
