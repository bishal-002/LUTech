
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";

// Public / Customer Pages
import Home from "./pages/public/Home";
import Products from "./pages/public/Products";
import ProductDetails from "./pages/public/ProductDetails";
import Login from "./pages/public/Login";
import Register from "./pages/public/Register";
import VerifyOTP from "./pages/public/VerifyOTP";
import AdminLogin from "./pages/public/AdminLogin";
import AdminTwoFactor from "./pages/public/AdminTwoFactor";
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
import SellerVerificationStatus from "./pages/seller/SellerVerificationStatus";

// Route Protection
import AdminRoute from "./components/AdminRoute";
import ProtectedRoute from "./components/ProtectedRoute";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSellerApplications from "./pages/admin/AdminSellerApplications";
import AdminProductModeration from "./pages/admin/AdminProductModeration";
import AdminCatalog from "./pages/admin/AdminCatalog";
import AdminDisputes from "./pages/admin/AdminDisputes";
import AdminPayouts from "./pages/admin/AdminPayouts";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminTeam from "./pages/admin/AdminTeam";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs";

// Get logged-in user information
function getUserInfo() {
  try {
    return JSON.parse(localStorage.getItem("userInfo") || "null");
  } catch {
    return null;
  }
}

// Redirect users according to their roles
function getRoleDestination(user) {
  if (user?.role === "admin") {
    return "/admin/dashboard";
  }

  if (user?.role === "seller") {
    return user.sellerStatus === "approved"
      ? "/seller/home"
      : "/seller/pending";
  }

  return "/";
}

// Prevent sellers and admins from accessing the customer marketplace
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

// Only approved sellers can access the seller workspace
function ApprovedSellerRoute() {
  const token = localStorage.getItem("token");
  const user = getUserInfo();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "seller") {
    return <Navigate to={getRoleDestination(user)} replace />;
  }

  if (user.sellerStatus !== "approved") {
    return <Navigate to="/seller/pending" replace />;
  }

  return <Outlet />;
}

// Pending / rejected seller application page
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
          className="mt-7 rounded-xl bg-[#83CDB5] px-6 py-3 text-sm font-bold text-[#123B35] transition hover:bg-[#A1DEC9]"
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
        {/* CUSTOMER MARKETPLACE */}
        <Route element={<CustomerOnlyRoute />}>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/product/:id" element={<ProductDetails />} />

          {/* CUSTOMER ACCOUNT */}
          <Route element={<ProtectedRoute allowedRoles={["customer"]} />}>
            <Route path="/cart" element={<Cart />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/my-orders" element={<CustomerOrders />} />
            <Route path="/become-seller" element={<BecomeSeller />} />
          </Route>
        </Route>

        {/* AUTHENTICATION */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/2fa" element={<AdminTwoFactor />} />

        {/* SELLER APPLICATION STATUS */}
        <Route path="/seller/pending" element={<SellerPendingRoute />} />
        {/* Seller KYC: available to customer and seller applicants */}
        <Route element={<ProtectedRoute allowedRoles={["customer", "seller"]} />} >
          <Route path="/seller/verification-status" element={<SellerVerificationStatus />} />
        </Route>

        {/* APPROVED SELLER WORKSPACE */}
        <Route element={<ProtectedRoute allowedRoles={["seller"]} />}>
          <Route element={<ApprovedSellerRoute />}>
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
        </Route>


        {/* ADMIN WORKSPACE */}
        <Route element={<AdminRoute />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/seller-applications" element={<AdminSellerApplications />} />
          <Route path="/admin/product-moderation" element={<AdminProductModeration />} />
          <Route path="/admin/catalog" element={<AdminCatalog />} />
          <Route path="/admin/disputes" element={<AdminDisputes />} />
          <Route path="/admin/payouts" element={<AdminPayouts />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/team" element={<AdminTeam />} />
          <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
        </Route>


        {/* NOT FOUND */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
