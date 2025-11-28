import { Routes, Route } from "react-router-dom";

import Login from "./pages/authen/Login";
import Signup from "./pages/authen/Signup";
import ForgotPassword from "./pages/authen/ForgotPassword";

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
import AuthorEditBook from "./pages/author/AuthorEditBook";
import AuthorChapterList from "./pages/author/AuthorChapterList";
import AuthorPageList from "./pages/author/AuthorPageList";
import TextPageCreate from "./pages/author/TextPageCreate";
import ImageCreate from "./pages/author/ImageCreate";
import AuthorPageDetail from "./pages/author/AuthorPageDetail";
import ImagePageCreate from "./pages/author/ImagePageCreate";
import TextPageEdit from "./pages/author/TextPageEdit";
import ImagePageEdit from "./pages/author/ImagePageEdit";
import AuthorModelView from "./pages/author/AuthorModelView";

import AdminDashboardPage from "./pages/admin/AdminDashboard";

import CustomerLayout from "./layouts/CustomerLayout";
import UserManagementPage from "./pages/admin/UserManagement";
import OrderManagementPage from "./pages/admin/OrderManagement";

import AuthorManagementPage from "./pages/admin/AuthorManagement";
import ModeratorBookList from "./pages/moderator/ModeratorBookList";
import ModeratorChapterList from "./pages/moderator/ModeratorChapterList";
import ModeratorPageList from "./pages/moderator/ModeratorPageList";
import ModeratorPageDetail from "./pages/moderator/ModeratorPageDetail";
import ModeratorPage from "./pages/moderator/ModeratorPage";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgotpassword" element={<ForgotPassword />} />

      <Route path="/" element={<Homepage />} />
      <Route path="/genre/:gerneId" element={<Homepage />} />
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
      <Route path="/author/authoreditbook/:bookId" element={<AuthorEditBook />} />
      <Route path="/author/books/:bookId/chapters" element={<AuthorChapterList />} />
      <Route path="/author/chapters/:chapterId/pages" element={<AuthorPageList />} />
      <Route path="/author/pages/:pageId/edit-text" element={<TextPageCreate />} />
      <Route path="/author/pages/:pageId/edit-image" element={<ImagePageCreate />} />
      <Route path="/author/pages/:pageId/text-edit" element={<TextPageEdit />} />
      <Route path="/author/pages/:pageId/image-edit" element={<ImagePageEdit />} />
      <Route path="/author/chapters/:chapterId/pages/create-image" element={<ImageCreate />} />
      <Route path="/author/page/:pageId" element={<AuthorPageDetail />} />
      <Route path="/author/model-view/:markerId" element={<AuthorModelView />} />




      <Route
        path="/moderator/authors/:authorId/books"
        element={<ModeratorBookList />}
      />

      <Route
        path="/moderator/books/:bookId/chapters"
        element={<ModeratorChapterList />}
      />

      <Route
        path="/moderator/chapters/:chapterId/pages"
        element={<ModeratorPageList />}
      />

      <Route
        path="/moderator/pages/:pageId"
        element={<ModeratorPageDetail />}
      />



      <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
      <Route path="/admin/users" element={<UserManagementPage />} />
      <Route path="/admin/orders" element={<OrderManagementPage />} />
      <Route path="/admin/authors" element={<AuthorManagementPage />} />

      <Route path="/moderator" element={<ModeratorPage />} />
    </Routes>
  );
}
