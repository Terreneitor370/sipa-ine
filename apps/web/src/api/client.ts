import axios from "axios";

/** Con mocks por defecto: solo se desactivan con VITE_USE_MOCKS=false */
export const USAR_MOCKS = import.meta.env.VITE_USE_MOCKS !== "false";
const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1";

export const http = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});
