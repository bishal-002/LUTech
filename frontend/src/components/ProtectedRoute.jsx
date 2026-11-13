
import { Navigate, Outlet } from "react-router-dom";

function getUserInfo() {
  try {
    return JSON.parse(localStorage.getItem("userInfo") || "null");
  } catch {
    return null;
  }
}

function ProtectedRoute({ allowedRoles }) {
  const token = localStorage.getItem("token");
  const userInfo = getUserInfo();

  if (!token || !userInfo) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(userInfo.role)) {
    if (userInfo.role === "admin") {
      return <Navigate to="/admin/dashboard" replace />;
    }

    if (userInfo.role === "seller") {
      return (
        <Navigate
          to={
            userInfo.sellerStatus === "approved"
              ? "/seller/home"
              : "/seller/pending"
          }
          replace
        />
      );
    }

    return <Navigate to="/" replace />;
  }

  if (
    userInfo.role === "seller" &&
    userInfo.sellerStatus !== "approved"
  ) {
    return <Navigate to="/seller/pending" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
