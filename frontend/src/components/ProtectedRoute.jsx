
import { Navigate, Outlet } from "react-router-dom";

function ProtectedRoute({ allowedRoles }) {
  const token = localStorage.getItem("token");

  let userInfo;

  try {
    userInfo = JSON.parse(localStorage.getItem("userInfo") || "null");
  } catch {
    userInfo = null;
  }

  if (!token || !userInfo) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(userInfo.role)) {
    if (userInfo.role === "admin") {
      return <Navigate to="/admin/dashboard" replace />;
    }

    if (userInfo.role === "seller") {
      return <Navigate to="/seller/dashboard" replace />;
    }

    return <Navigate to="/" replace />;
  }

  if (
    userInfo.role === "seller" &&
    userInfo.sellerStatus !== "approved"
  ) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
