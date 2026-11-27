import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const AuthContext = createContext(null);

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("userInfo") || "null");
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [token, setToken] = useState(
    () => localStorage.getItem("token")
  );

  const isAuthenticated = Boolean(token && user);

  const setSession = useCallback((sessionToken, sessionUser) => {
    if (!sessionToken || !sessionUser) {
      throw new Error("A valid authentication session is required.");
    }

    localStorage.setItem("token", sessionToken);
    localStorage.setItem("userInfo", JSON.stringify(sessionUser));

    setToken(sessionToken);
    setUser(sessionUser);

    window.dispatchEvent(new Event("lutech:auth-changed"));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("userInfo");

    setToken(null);
    setUser(null);

    window.dispatchEvent(new Event("lutech:auth-changed"));
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((currentUser) => {
      if (!currentUser) return null;

      const updatedUser = {
        ...currentUser,
        ...updates,
      };

      localStorage.setItem(
        "userInfo",
        JSON.stringify(updatedUser)
      );

      return updatedUser;
    });
  }, []);

  const hasPermission = useCallback(
    (permission) => {
      if (user?.role !== "admin") return false;

      if (user.adminRole === "super_admin") return true;

      return Array.isArray(user.permissions) &&
        user.permissions.includes(permission);
    },
    [user]
  );

  useEffect(() => {
    const syncSession = () => {
      setToken(localStorage.getItem("token"));
      setUser(readStoredUser());
    };

    window.addEventListener("storage", syncSession);
    window.addEventListener("lutech:auth-changed", syncSession);

    return () => {
      window.removeEventListener("storage", syncSession);
      window.removeEventListener(
        "lutech:auth-changed",
        syncSession
      );
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated,
      setSession,
      logout,
      updateUser,
      hasPermission,
    }),
    [
      user,
      token,
      isAuthenticated,
      setSession,
      logout,
      updateUser,
      hasPermission,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}