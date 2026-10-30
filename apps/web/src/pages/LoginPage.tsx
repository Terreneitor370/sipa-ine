import { FormEvent, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { useAuth } from "../auth/AuthContext";
import { USAR_MOCKS } from "../api/client";

export function LoginPage() {
  const { usuario, iniciarSesion } = useAuth();
  const location = useLocation();
  const destino = (location.state as { from?: string } | null)?.from ?? "/";

  const [email, setEmail] = useState("analista@sipa-ine.mx");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={destino} replace />;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await iniciarSesion(email, password);
    } catch {
      setError("Correo o contraseña incorrectos.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-fondo p-4">
      <div className="w-full max-w-sm border border-linea bg-white p-4 rounded-sm">
        <p className="text-[15px] font-bold text-ine-marino">SIPA-INE</p>
        <p className="mt-0.5 text-[11px] uppercase tracking-wide text-ink-2">
          Inicio de sesión
        </p>
        <form className="mt-4 space-y-3" onSubmit={enviar}>
          <div>
            <label className="text-[11px] uppercase text-ink-2" htmlFor="email">
              Correo
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-0.5 h-8 w-full rounded-sm border border-linea px-2 text-[13px] text-ink focus:border-acento focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase text-ink-2" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-0.5 h-8 w-full rounded-sm border border-linea px-2 text-[13px] text-ink focus:border-acento focus:outline-none"
            />
          </div>
          {error ? <p className="text-[12px] text-riesgo-muy-alto">{error}</p> : null}
          <Button type="submit" className="w-full justify-center" disabled={enviando}>
            {enviando ? "Entrando…" : "Entrar"}
          </Button>
        </form>
        {USAR_MOCKS ? (
          <p className="mt-3 text-[11px] text-ink-2">
            Modo demo: use cualquier contraseña con el correo de analista.
          </p>
        ) : null}
      </div>
    </div>
  );
}
