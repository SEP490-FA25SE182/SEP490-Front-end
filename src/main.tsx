import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { Toaster } from "@/components/ui/toaster";

import { CartProvider } from "./context/CartContext";
import { FavoritesProvider } from '@/context/FavoriteContext';

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <BrowserRouter>
    <FavoritesProvider>
      <CartProvider>
        <App />
        <Toaster />
      </CartProvider>
    </FavoritesProvider>
  </BrowserRouter>
);
