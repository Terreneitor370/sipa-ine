import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { MapaPage } from "./pages/MapaPage";
import { SeccionPage } from "./pages/SeccionPage";

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<MapaPage />} />
        <Route path="/seccion/:id" element={<SeccionPage />} />
      </Routes>
    </Layout>
  );
}
