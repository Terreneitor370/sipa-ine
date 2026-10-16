import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { MapaPage } from "./pages/MapaPage";

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<MapaPage />} />
      </Routes>
    </Layout>
  );
}
