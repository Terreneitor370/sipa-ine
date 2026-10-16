import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { Sidebar } from "./Sidebar";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-fondo">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="min-h-0 flex-1 overflow-auto bg-fondo">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
