import { Navigate, Outlet } from "react-router-dom";

function AdminRoute() {
  const token = localStorage.getItem("token");

  let userInfo;

  try {
    userInfo = JSON.parse(localStorage.getItem("userInfo"));
  } catch {
    return <Navigate to="/" replace />;
  }

  if (!token || !userInfo) {
    return <Navigate to="/admin/login" replace />;
  }

  if (userInfo.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default AdminRoute;
