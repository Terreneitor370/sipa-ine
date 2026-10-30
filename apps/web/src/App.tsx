import type { ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
import { RequireAuth } from "./components/auth/RequireAuth";
import { Layout } from "./components/layout/Layout";
import { MapaPage } from "./pages/MapaPage";
import { SeccionPage } from "./pages/SeccionPage";
import { SimuladorPage } from "./pages/SimuladorPage";
import { PriorizacionPage } from "./pages/PriorizacionPage";
import { ModeloPage } from "./pages/ModeloPage";
import { LoginPage } from "./pages/LoginPage";

function AppProtegida({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <Layout>{children}</Layout>
    </RequireAuth>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <AppProtegida>
            <MapaPage />
          </AppProtegida>
        }
      />
      <Route
        path="/seccion/:id"
        element={
          <AppProtegida>
            <SeccionPage />
          </AppProtegida>
        }
      />
      <Route
        path="/simulador"
        element={
          <AppProtegida>
            <SimuladorPage />
          </AppProtegida>
        }
      />
      <Route
        path="/priorizacion"
        element={
          <AppProtegida>
            <PriorizacionPage />
          </AppProtegida>
        }
      />
      <Route
        path="/modelo"
        element={
          <AppProtegida>
            <ModeloPage />
          </AppProtegida>
        }
      />
    </Routes>
  );
}
