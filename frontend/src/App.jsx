
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";

// Public / Customer Pages
import Home from "./pages/public/Home";
import Products from "./pages/public/Products";
import ProductDetails from "./pages/public/ProductDetails";
import Login from "./pages/public/Login";
import Register from "./pages/public/Register";
import VerifyOTP from "./pages/public/VerifyOTP";
import AdminLogin from "./pages/public/AdminLogin";
import NotFound from "./pages/public/NotFound";

// Customer Pages
import Cart from "./pages/customer/Cart";
import Profile from "./pages/customer/Profile";
import CustomerOrders from "./pages/customer/CustomerOrders";
import BecomeSeller from "./pages/customer/BecomeSeller";

// Seller Pages
import SellerHome from "./pages/seller/SellerHome";
import SellerDashboard from "./pages/seller/SellerDashboard";
import SellerProducts from "./pages/seller/SellerProducts";
import SellerProductForm from "./pages/seller/SellerProductForm";
import SellerOrders from "./pages/seller/SellerOrders";
import SellerStoreProfile from "./pages/seller/SellerStoreProfile";
import SellerLayout from "./components/seller/SellerLayout";

// Route Protection
import AdminRoute from "./components/AdminRoute";
import ProtectedRoute from "./components/ProtectedRoute";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import ProductForm from "./pages/admin/ProductForm";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminOrders from "./pages/admin/AdminOrders";

function getUserInfo() {
  try {
    return JSON.parse(localStorage.getItem("userInfo") || "null");
  } catch {
    return null;
  }
}

function getRoleDestination(user) {
  if (user?.role === "admin") return "/admin/dashboard";

  if (user?.role === "seller") {
    return user.sellerStatus === "approved"
      ? "/seller/home"
      : "/seller/pending";
  }

  return "/";
}

// Prevent sellers and admins from visiting customer marketplace pages.
function CustomerOnlyRoute() {
  const token = localStorage.getItem("token");
  const user = getUserInfo();

  if (token && user?.role === "seller") {
    return <Navigate to={getRoleDestination(user)} replace />;
  }

  if (token && user?.role === "admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Outlet />;
}

// Only unapproved sellers can see this page.
function SellerPendingRoute() {
  const token = localStorage.getItem("token");
  const user = getUserInfo();
  const isRejected = user?.sellerStatus === "rejected";

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "seller") {
    return <Navigate to={getRoleDestination(user)} replace />;
  }

  if (user.sellerStatus === "approved") {
    return <Navigate to="/seller/home" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#C9F3E8] p-5">
      <div className="w-full max-w-lg rounded-2xl bg-[#103633] p-8 text-center shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1B4B43] text-3xl text-[#83CDB5]">
          ◷
        </div>

        <h1 className="mt-6 text-2xl font-bold text-white">
          {isRejected
            ? "Seller Application Not Approved"
            : "Seller Application Pending"}
        </h1>

        <p className="mt-3 text-sm leading-6 text-[#B5C9C1]">
          {isRejected
            ? "Your seller application was not approved. Please contact the administrator for further information."
            : "Your seller account is waiting for administrator approval. You will be able to access your seller workspace once your application is approved."}
        </p>

        <button
          type="button"
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("userInfo");
            window.location.href = "/login";
          }}
          className="mt-7 rounded-xl bg-[#83CDB5] px-6 py-3 text-sm font-bold text-[#123B35] hover:bg-[#A1DEC9]"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Customer marketplace routes */}
        <Route element={<CustomerOnlyRoute />}>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/product/:id" element={<ProductDetails />} />

          {/* Customer account routes */}
          <Route element={<ProtectedRoute allowedRoles={["customer"]} />}>
            <Route path="/cart" element={<Cart />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/my-orders" element={<CustomerOrders />} />
            <Route path="/become-seller" element={<BecomeSeller />} />
          </Route>
        </Route>

        {/* Authentication routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Seller pending approval */}
        <Route path="/seller/pending" element={<SellerPendingRoute />} />

        {/* Approved seller workspace */}
        <Route element={<ProtectedRoute allowedRoles={["seller"]} />}>
          <Route path="/seller" element={<SellerLayout />}>
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<SellerHome />} />
            <Route path="dashboard" element={<SellerDashboard />} />
            <Route path="products" element={<SellerProducts />} />
            <Route path="products/add" element={<SellerProductForm />} />
            <Route path="products/edit/:id" element={<SellerProductForm />} />
            <Route path="orders" element={<SellerOrders />} />
            <Route path="store-profile" element={<SellerStoreProfile />} />
          </Route>
        </Route>

        {/* Admin routes */}
        <Route element={<AdminRoute />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/products/add" element={<ProductForm />} />
          <Route path="/admin/products/edit/:id" element={<ProductForm />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
        </Route>

        {/* Not found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
