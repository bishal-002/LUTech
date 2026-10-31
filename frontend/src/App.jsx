
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetails from "./pages/ProductDetails";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Cart from "./pages/Cart";
import AdminLogin from "./pages/AdminLogin";
import AdminProducts from "./pages/AdminProducts";
import ProductForm from "./pages/ProductForm";
import VerifyOTP from "./pages/VerifyOTP";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import AdminRoute from "./components/AdminRoute";
import AdminUsers from "./pages/AdminUsers";
import SellerDashboard from "./pages/SellerDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/seller/dashboard" element={<SellerDashboard />} />

        <Route path="/admin/login" element={<AdminLogin />} />

        <Route element={<AdminRoute />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/products/add" element={<ProductForm />} />
          <Route path="/admin/products/edit/:id" element={<ProductForm />} />
          <Route path="/admin/users" element={<AdminUsers />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
