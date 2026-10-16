import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { MapaPage } from "./pages/MapaPage";
import { SeccionPage } from "./pages/SeccionPage";
import { SimuladorPage } from "./pages/SimuladorPage";
import { PriorizacionPage } from "./pages/PriorizacionPage";
import { ModeloPage } from "./pages/ModeloPage";

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<MapaPage />} />
        <Route path="/seccion/:id" element={<SeccionPage />} />
        <Route path="/simulador" element={<SimuladorPage />} />
        <Route path="/priorizacion" element={<PriorizacionPage />} />
        <Route path="/modelo" element={<ModeloPage />} />
      </Routes>
    </Layout>
  );
}
