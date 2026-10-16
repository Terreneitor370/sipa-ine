import { NavLink } from "react-router-dom";
import { IconoMapa } from "../ui/Icons";

const MODULOS = [{ a: "/", texto: "Mapa de Riesgo", Icono: IconoMapa }];

export function Sidebar() {
  return (
    <aside className="flex w-[220px] shrink-0 flex-col bg-panel text-white">
      <div className="border-b border-white/10 px-4 py-3">
        <p className="text-[15px] font-bold tracking-tight">SIPA-INE</p>
        <p className="text-[10px] uppercase tracking-wide text-white/60">
          Abstencionismo · Escenarios
        </p>
      </div>
      <nav className="flex flex-col gap-0.5 p-2" aria-label="Navegación principal">
        {MODULOS.map(({ a, texto, Icono }) => (
          <NavLink
            key={a}
            to={a}
            end={a === "/"}
            className={({ isActive }) =>
              `flex h-8 items-center gap-2 rounded-sm px-2 text-[13px] ${
                isActive ? "bg-acento text-white" : "text-white/75 hover:bg-white/10"
              }`
            }
          >
            <Icono className="text-white/70" />
            {texto}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto border-t border-white/10 px-4 py-3 text-[10px] leading-4 text-white/50">
        Entorno federal 2027
        <br />
        Datos agregados · sin datos personales
      </div>
    </aside>
  );
}
