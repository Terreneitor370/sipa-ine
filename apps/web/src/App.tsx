import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { MapaPage } from "./pages/MapaPage";
import { SeccionPage } from "./pages/SeccionPage";
import { SimuladorPage } from "./pages/SimuladorPage";

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<MapaPage />} />
        <Route path="/seccion/:id" element={<SeccionPage />} />
        <Route path="/simulador" element={<SimuladorPage />} />
      </Routes>
    </Layout>
  );
}
