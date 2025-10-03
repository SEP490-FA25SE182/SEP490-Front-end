// src/router.tsx
import { Routes, Route } from "react-router-dom";
import Login from "./pages/authen/Login";
import Signup from "./pages/authen/Signup";
import Homepage from "./pages/customer/Homepage";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Homepage/>} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
    </Routes>
  );
}
