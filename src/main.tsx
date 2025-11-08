import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { CartProvider } from "./context/CartContext";
import { FavoriteProvider } from '@/context/FavoriteContext';
import { PaymentProvider } from "@/context/PaymentContext";
import { AuthProvider } from "./context/AuthContext";
import { getCurrentUserId } from "@/utils/authStorage";
import { bookService } from "@/services/BookService";

const queryClient = new QueryClient();

const uid = getCurrentUserId();
if (uid) {
  bookService.setUserId(uid);
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
      <FavoriteProvider>
        <CartProvider>
          <PaymentProvider>
          <App />
          </PaymentProvider>
          <Toaster />
        </CartProvider>
      </FavoriteProvider>
      </AuthProvider>
    </QueryClientProvider>
  </BrowserRouter>
);
