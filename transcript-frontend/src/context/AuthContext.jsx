/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from "react";
import { authService } from "../services/authService";

const AuthContext = createContext(null);

const LOCAL_KEYS = ["authToken", "userRole", "userData", "rememberAuth"];
const SESSION_KEYS = ["authToken", "userRole", "userData"];

const clearAuthStorage = () => {
  LOCAL_KEYS.forEach((k) => localStorage.removeItem(k));
  SESSION_KEYS.forEach((k) => sessionStorage.removeItem(k));
};

const readAuthFromStorage = () => {
  const rememberAuth = localStorage.getItem("rememberAuth") === "true";
  const storage = rememberAuth ? localStorage : sessionStorage;

  const token = storage.getItem("authToken");
  const role = storage.getItem("userRole");
  const userData = storage.getItem("userData");

  let user = null;
  if (userData) {
    try {
      user = JSON.parse(userData);
    } catch {
      user = null;
    }
  }

  return { rememberAuth, token, role, user };
};

const initAuthState = () => {
  try {
    const { token, role, user } = readAuthFromStorage();
    if (token && role) return { isAuthenticated: true, userRole: role, user };
    clearAuthStorage();
    return { isAuthenticated: false, userRole: null, user: null };
  } catch {
    return { isAuthenticated: false, userRole: null, user: null };
  }
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export const AuthProvider = ({ children }) => {
  const initial = initAuthState();

  const [isAuthenticated, setIsAuthenticated] = useState(initial.isAuthenticated);
  const [userRole, setUserRole] = useState(initial.userRole);
  const [user, setUser] = useState(initial.user);
  const [loading] = useState(false);

  const writeAuthToStorage = ({ token, role, userData, rememberAuth }) => {
    clearAuthStorage();
    const storage = rememberAuth ? localStorage : sessionStorage;
    storage.setItem("authToken", token);
    storage.setItem("userRole", role);
    storage.setItem("userData", JSON.stringify(userData));
    if (rememberAuth) localStorage.setItem("rememberAuth", "true");
  };

  const persistCurrentUser = (nextUser) => {
    const { rememberAuth, token, role } = readAuthFromStorage();
    if (!token || !role || !nextUser) return;
    writeAuthToStorage({
      token,
      role,
      userData: nextUser,
      rememberAuth,
    });
    setUser(nextUser);
  };

  const requestRegistrationOtp = async (identity) => {
    try {
      const response = await authService.requestRegistrationOtp(identity);
      return { success: true, message: response?.message || "OTP sent to email and mobile" };
    } catch (error) {
      return { success: false, message: error?.message || "Failed to send OTPs" };
    }
  };

  const requestLoginOtp = async (identifier) => {
    try {
      const response = await authService.requestLoginOtp(identifier);
      return { success: true, message: response?.message || "OTP sent" };
    } catch (error) {
      return { success: false, message: error?.message || "Failed to send OTP" };
    }
  };

  const loginWithOtp = async (identifier, otp, rememberAuth = false, roleOverride = null) => {
    try {
      const response = await authService.verifyLogin({ identifier, otp });
      const effectiveRole = response?.user?.role || "Student";
      writeAuthToStorage({
        token: response?.token,
        role: effectiveRole,
        userData: response.user,
        rememberAuth,
      });

      setIsAuthenticated(true);
      setUserRole(effectiveRole);
      setUser(response.user);
      return { success: true, role: effectiveRole };
    } catch (error) {
      return { success: false, message: error?.message || "OTP verification failed" };
    }
  };

  const completeRegistration = async (data, rememberAuth = false) => {
    try {
      const response = await authService.verifyRegistration(data);

      writeAuthToStorage({
        token: response?.token,
        role: response?.user?.role || "Student",
        userData: response.user,
        rememberAuth,
      });

      setIsAuthenticated(true);
      setUserRole(response?.user?.role || "Student");
      setUser(response.user);
      return { success: true };
    } catch (error) {
      return { success: false, message: error?.message || "Registration failed" };
    }
  };

  const logout = () => {
    clearAuthStorage();
    setIsAuthenticated(false);
    setUserRole(null);
    setUser(null);
  };

  const refreshCurrentUser = async () => {
    const { rememberAuth, token } = readAuthFromStorage();
    if (!token) return null;
    const me = await authService.me(token);
    persistCurrentUser(me);
    if (rememberAuth) localStorage.setItem("rememberAuth", "true");
    return me;
  };

  const value = {
    isAuthenticated,
    userRole,
    user,
    loading,
    requestRegistrationOtp,
    requestLoginOtp,
    loginWithOtp,
    completeRegistration,
    refreshCurrentUser,
    setCurrentUser: persistCurrentUser,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
