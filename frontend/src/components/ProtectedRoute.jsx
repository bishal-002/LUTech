
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function getRoleDestination(user) {
  if (user?.role === "admin") {
    return "/admin/dashboard";
  }

  if (user?.role === "seller") {
    const isApproved =
      user.sellerStatus === "approved" ||
      user.verificationStatus === "approved";

    return isApproved ? "/seller/home" : "/seller/pending";
  }

  return "/";
}

function ProtectedRoute({ allowedRoles = [] }) {
  const { user, token, isAuthenticated } = useAuth();

  if (!isAuthenticated || !token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <Navigate
        to={getRoleDestination(user)}
        replace
      />
    );
  }

  // Seller approval is checked separately by the seller
  // workspace route in App.jsx. This component only checks
  // authentication and role access.
  return <Outlet />;
}

export default ProtectedRoute;
