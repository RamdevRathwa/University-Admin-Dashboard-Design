import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import OtpInput from "../../components/OtpInput";
import universityLogo from "../../assets/university-logo.png";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { Alert } from "../../components/ui/alert";

const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(String(email || "").trim());
const isValidMobile = (mobile) => /^\d{10}$/.test(String(mobile || "").trim());

const roleHomePath = (role) => {
  const map = {
    Student: "/dashboard",
    Clerk: "/clerk/dashboard",
    HoD: "/hod",
    Dean: "/dean",
    Admin: "/admin",
  };
  return map[role] || "/dashboard";
};

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, userRole, requestLoginOtp, loginWithOtp } = useAuth();

  const [method, setMethod] = useState("email"); // 'email' | 'mobile'
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});

  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");

  useEffect(() => {
    if (isAuthenticated && userRole) navigate(roleHomePath(userRole), { replace: true });
  }, [isAuthenticated, userRole, navigate]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const validateIdentifier = () => {
    const next = {};
    const id = String(identifier || "").trim();
    if (!id) next.identifier = method === "email" ? "Email is required" : "Mobile number is required";
    else if (method === "email" && !isValidEmail(id)) next.identifier = "Enter a valid email";
    else if (method === "mobile" && !isValidMobile(id)) next.identifier = "Enter a valid 10-digit mobile number";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateOtp = () => {
    const next = {};
    if (!otp) next.otp = "OTP is required";
    else if (otp.length !== 6) next.otp = "Enter 6-digit OTP";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSendOtp = async () => {
    if (!validateIdentifier()) return;
    setLoading(true);
    const res = await requestLoginOtp(String(identifier).trim());
    setLoading(false);
    if (res?.success) {
      setOtpSent(true);
      setCountdown(60);
      setOtp("");
      setErrors({});
    } else {
      setErrors({ identifier: res?.message || "Failed to send OTP" });
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!validateIdentifier()) return;
    if (!validateOtp()) return;
    setLoading(true);
    const res = await loginWithOtp(String(identifier).trim(), otp, rememberMe);
    setLoading(false);
    if (res?.success) navigate(roleHomePath(res?.role), { replace: true });
    else setErrors({ otp: res?.message || "Invalid OTP" });
  };

  const reset = (nextMethod) => {
    setMethod(nextMethod);
    setOtpSent(false);
    setCountdown(0);
    setErrors({});
    setIdentifier("");
    setOtp("");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-[520px]">
        <CardHeader className="text-center">
          <img src={universityLogo} alt="Maharaja Sayajirao University of Baroda" className="h-[70px] mx-auto mb-4 object-contain" />
          <CardTitle>Maharaja Sayajirao University of Baroda</CardTitle>
          <CardDescription>Online Transcript Management System</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs
            value={method}
            onValueChange={(v) => reset(v)}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="mobile">Mobile</TabsTrigger>
            </TabsList>

            <TabsContent value={method}>
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identifier">{method === "email" ? "Email" : "Mobile Number"}</Label>
                  <Input
                    id="identifier"
                    value={identifier}
                    onChange={(e) => {
                      const v = e.target.value;
                      setIdentifier(method === "mobile" ? v.replace(/[^\d]/g, "").slice(0, 10) : v);
                      if (errors.identifier) setErrors((p) => ({ ...p, identifier: null }));
                    }}
                    placeholder={method === "email" ? "Enter your email" : "Enter 10-digit mobile number"}
                    disabled={otpSent}
                    aria-invalid={!!errors.identifier}
                  />
                  {errors.identifier ? <p className="text-xs text-red-600">{errors.identifier}</p> : null}
                </div>

                {!otpSent ? (
                  <Button type="button" className="w-full" disabled={loading} onClick={handleSendOtp}>
                    {loading ? "Sending OTP..." : "Send OTP"}
                  </Button>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Enter OTP</Label>
                      <OtpInput
                        value={otp}
                        onChange={(next) => {
                          setOtp(next);
                          if (errors.otp) setErrors((p) => ({ ...p, otp: null }));
                        }}
                        error={errors.otp}
                      />
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-auto px-0 text-[#1e40af] hover:bg-transparent hover:underline"
                        disabled={countdown > 0 || loading}
                        onClick={() => countdown === 0 && handleSendOtp()}
                      >
                        Resend OTP
                      </Button>
                      {countdown > 0 ? <span className="text-gray-500">Resend in {countdown}s</span> : null}
                    </div>

                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-[#1e40af] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e40af]"
                      />
                      Keep me signed in
                    </label>

                    {errors.otp ? <Alert variant="destructive">{errors.otp}</Alert> : null}

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Verifying..." : "Verify OTP"}
                    </Button>
                  </>
                )}
              </form>
            </TabsContent>
          </Tabs>

          <p className="text-sm text-gray-600 text-center">
            Don't have an account?{" "}
            <Link to="/register" className="text-[#1e40af] font-medium hover:underline">
              Register here
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
