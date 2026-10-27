import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { Sidebar } from "./Sidebar";
import { AppHeader } from "./AppHeader";
import { useState } from "react";

export function Layout({ children }: { children: ReactNode }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  return (
    <div className="flex h-screen overflow-hidden bg-fondo">
      <Sidebar abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader onAbrirMenu={() => setMenuAbierto(true)} />
        <main className="min-h-0 flex-1 overflow-auto bg-fondo">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
