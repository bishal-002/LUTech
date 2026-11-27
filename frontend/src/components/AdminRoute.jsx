
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function AdminRoute({ requiredPermission = null }) {
  const {
    user,
    token,
    isAuthenticated,
    hasPermission,
  } = useAuth();

  if (!isAuthenticated || !token || !user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  if (
    requiredPermission &&
    !hasPermission(requiredPermission)
  ) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}

export default AdminRoute;
