// src/router.tsx
import { Routes, Route } from "react-router-dom";
import Login from "./pages/authen/Login";
import Signup from "./pages/authen/Signup";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<h1>Home Page</h1>} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
    </Routes>
  );
}
