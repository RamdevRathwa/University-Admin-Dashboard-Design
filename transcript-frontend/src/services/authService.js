const RAW_BASE_URL = import.meta.env?.VITE_API_BASE_URL;
const API_BASE_URL = (RAW_BASE_URL ? String(RAW_BASE_URL) : "").replace(/\/+$/, "");

function parseJsonSafely(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function request(path, { method = "GET", body, token } = {}) {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = parseJsonSafely(text);

  if (!res.ok) {
    const msg = data?.title || data?.message || text || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.code = data?.code;
    err.traceId = data?.traceId;
    throw err;
  }

  return data;
}

export const authService = {
  async requestRegistrationOtp({ fullName, email, mobile }) {
    return request("/api/Auth/register/request-otp", {
      method: "POST",
      body: { fullName, email, mobile },
    });
  },

  async verifyRegistration({ fullName, email, mobile, emailOtp, mobileOtp }) {
    return request("/api/Auth/register/verify", {
      method: "POST",
      body: { fullName, email, mobile, emailOtp, mobileOtp },
    });
  },

  async requestLoginOtp(identifier) {
    return request("/api/Auth/login/request-otp", {
      method: "POST",
      body: { identifier },
    });
  },

  async verifyLogin({ identifier, otp }) {
    return request("/api/Auth/login/verify", {
      method: "POST",
      body: { identifier, otp },
    });
  },

  async me(token) {
    return request("/api/Auth/me", { token });
  },
};
