import { NavLink } from "react-router-dom";
import { IconoLibro, IconoLista, IconoMapa, IconoSimulador } from "../ui/Icons";

const MODULOS = [
  { a: "/", texto: "Mapa de Riesgo", Icono: IconoMapa },
  { a: "/simulador", texto: "Simulador", Icono: IconoSimulador },
  { a: "/priorizacion", texto: "Priorización", Icono: IconoLista },
  { a: "/modelo", texto: "Modelo", Icono: IconoLibro },
];

export function Sidebar({
  abierto,
  onCerrar,
}: {
  abierto?: boolean;
  onCerrar?: () => void;
}) {
  return (
    <>
      {/* Fondo clicable en móvil cuando el cajón está abierto */}
      {abierto && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={onCerrar}
          className="fixed inset-0 z-[900] cursor-default bg-[#1a2a4a]/40 md:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-[1000] flex w-[220px] shrink-0 flex-col bg-panel text-white transition-transform duration-150 md:static md:translate-x-0 ${
          abierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-[15px] font-bold tracking-tight text-white">SIPA-INE</p>
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
              onClick={onCerrar}
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
    </>
  );
}
