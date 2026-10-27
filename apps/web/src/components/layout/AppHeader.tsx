import { Button } from "../ui/Button";
import { useAuth } from "../../auth/AuthContext";

export function AppHeader() {
  const { usuario, cerrarSesion } = useAuth();
  if (!usuario) return null;

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-linea bg-white px-3">
      <p className="text-[11px] uppercase tracking-wide text-ink-2">
        Instituto Nacional Electoral · Planeación territorial
      </p>
      <div className="flex items-center gap-2 text-[12px]">
        <span className="text-ink-2">
          {usuario.nombre}{" "}
          <span className="text-[10px] uppercase">({usuario.rol.toLowerCase()})</span>
        </span>
        <Button variante="secundario" type="button" onClick={cerrarSesion}>
          Cerrar sesión
        </Button>
      </div>
    </header>
  );
}
