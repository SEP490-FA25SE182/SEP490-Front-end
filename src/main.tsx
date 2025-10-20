import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { CartProvider } from "./context/CartContext";
import { FavoritesProvider } from '@/context/FavoriteContext';
import { PaymentProvider } from "@/context/PaymentContext";
import { AuthProvider } from "./context/AuthContext";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
      <FavoritesProvider>
        <CartProvider>
          <PaymentProvider>
          <App />
          </PaymentProvider>
          <Toaster />
        </CartProvider>
      </FavoritesProvider>
      </AuthProvider>
    </QueryClientProvider>
  </BrowserRouter>
);
