import { Routes, Route } from "react-router-dom";
import Login from "./pages/authen/Login";
import Signup from "./pages/authen/Signup";
import Homepage from "./pages/customer/Homepage";
import { BookDetail } from "./pages/customer/BookDetail";
import CartPage from "./pages/customer/CartPage";
import CheckoutPage from "./pages/customer/CheckoutPage";
import BookshelfPage from "./pages/customer/BookshelfPage";
import ProfilePage from "./pages/customer/ProfilePage";
import WalletPage from "./pages/customer/WalletPage";
import TransactionPage from "./pages/customer/TransactionPage";
import PaymentStatusPage from "./pages/customer/PaymentStatusPage";
import BlogPage from "./pages/customer/BlogPage";

import AuthorIncome from "./pages/author/AuthorIncome";
import AuthorBookList from "./pages/author/AuthorBookList";

import CustomerLayout from "./layouts/CustomerLayout";

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
      <Route path="/profile" element={<CustomerLayout><ProfilePage /></CustomerLayout>} />
      <Route path="/bookshelf" element={<CustomerLayout><BookshelfPage /></CustomerLayout>} />
      <Route path="/wallet" element={<CustomerLayout><WalletPage /></CustomerLayout>} />
      <Route path="/transactions" element={<CustomerLayout><TransactionPage /></CustomerLayout>} />
      <Route path="/payment-status" element={<PaymentStatusPage />} />
      <Route path="/blog" element={<BlogPage />} />

      <Route path="/author/authorincome" element={<AuthorIncome />} />
      <Route path="/author/authorbooklist" element={<AuthorBookList />} />
    </Routes>
  );
}
