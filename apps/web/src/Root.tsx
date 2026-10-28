import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { mensajeDeError, publicarAviso } from "./lib/aviso";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
  // Avisos de error del contrato: las pantallas dejan de estar "Cargando…" sin mensaje
  queryCache: new QueryCache({
    onError: (e, query) => {
      const texto = mensajeDeError(e);
      if (!texto) return; // 401: lo maneja AuthContext (limpia y redirige a /login)
      publicarAviso({
        texto,
        onReintentar: () => void queryClient.refetchQueries({ queryKey: query.queryKey }),
      });
    },
  }),
  mutationCache: new MutationCache({
    onError: (e) => {
      const texto = mensajeDeError(e);
      if (!texto) return;
      publicarAviso({ texto });
    },
  }),
});

export function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
