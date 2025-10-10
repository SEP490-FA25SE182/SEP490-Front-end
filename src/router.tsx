// src/router.tsx
import { Routes, Route } from "react-router-dom";
import Login from "./pages/authen/Login";
import Signup from "./pages/authen/Signup";
import Homepage from "./pages/customer/Homepage";
import { BookDetail } from "./pages/customer/BookDetail";
import CartPage from "./pages/customer/CartPage";
import CheckoutPage from "./pages/customer/CheckoutPage";
import { Bookshelf } from "./pages/customer/Bookshelf";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Homepage/>} />
      <Route path="/genre/:gerneId" element={<Homepage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/book/:bookId" element={<BookDetail />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/bookshelf" element={<Bookshelf />} />
    </Routes>
  );
}
