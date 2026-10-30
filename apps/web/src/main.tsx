import React from "react";
import ReactDOM from "react-dom/client";
import { Root } from "./Root";
import "leaflet/dist/leaflet.css";
import "./index.css";

const contenedor = document.getElementById("root");
if (!contenedor) throw new Error("No se encontró el contenedor #root");

ReactDOM.createRoot(contenedor).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
