import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import OtpInput from "../../components/OtpInput";
import universityLogo from "../../assets/university-logo.png";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Alert } from "../../components/ui/alert";
import { Separator } from "../../components/ui/separator";

const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(String(email || "").trim());
const isValidMobile = (mobile) => /^\d{10}$/.test(String(mobile || "").trim());

export default function Register() {
  const navigate = useNavigate();
  const { isAuthenticated, requestRegistrationOtp, completeRegistration } = useAuth();

  const [stage, setStage] = useState("identity"); // 'identity' | 'otp'
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [countdownEmail, setCountdownEmail] = useState(0);
  const [countdownMobile, setCountdownMobile] = useState(0);

  const [errors, setErrors] = useState({});

  const [identity, setIdentity] = useState({
    fullName: "",
    email: "",
    mobile: "",
  });

  const [emailOtp, setEmailOtp] = useState("");
  const [mobileOtp, setMobileOtp] = useState("");

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (countdownEmail <= 0) return;
    const t = setTimeout(() => setCountdownEmail((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [countdownEmail]);

  useEffect(() => {
    if (countdownMobile <= 0) return;
    const t = setTimeout(() => setCountdownMobile((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [countdownMobile]);

  const validateIdentity = () => {
    const next = {};
    const fullName = String(identity.fullName || "").trim();
    const email = String(identity.email || "").trim();
    const mobile = String(identity.mobile || "").trim();

    if (!fullName) next.fullName = "Full name is required";
    if (!email) next.email = "Email is required";
    else if (!isValidEmail(email)) next.email = "Enter a valid email";
    if (!mobile) next.mobile = "Mobile number is required";
    else if (!isValidMobile(mobile)) next.mobile = "Enter a valid 10-digit mobile number";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const startOtpVerification = async (e) => {
    e.preventDefault();
    if (!validateIdentity()) return;

    setLoading(true);
    const otpRes = await requestRegistrationOtp({
      fullName: identity.fullName,
      email: String(identity.email).trim(),
      mobile: String(identity.mobile).trim(),
    });
    setLoading(false);

    if (!otpRes?.success) {
      setErrors({
        submit: otpRes?.message || "Failed to send OTP. Please try again.",
      });
      return;
    }

    setStage("otp");
    setCountdownEmail(60);
    setCountdownMobile(60);
    setEmailOtp("");
    setMobileOtp("");
    setErrors({});
  };

  const validateOtps = () => {
    const next = {};
    if (!emailOtp) next.emailOtp = "Email OTP is required";
    else if (emailOtp.length !== 6) next.emailOtp = "Enter 6-digit OTP";
    if (!mobileOtp) next.mobileOtp = "Mobile OTP is required";
    else if (mobileOtp.length !== 6) next.mobileOtp = "Enter 6-digit OTP";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const complete = async (e) => {
    e.preventDefault();
    if (!validateIdentity()) {
      setStage("identity");
      return;
    }
    if (!validateOtps()) return;

    setLoading(true);
    const res = await completeRegistration(
      {
        fullName: identity.fullName,
        email: String(identity.email).trim(),
        mobile: String(identity.mobile).trim(),
        emailOtp,
        mobileOtp,
      },
      rememberMe
    );
    setLoading(false);

    if (res?.success) navigate("/dashboard", { replace: true });
    else setErrors({ submit: res?.message || "Registration failed" });
  };

  const resendEmail = async () => {
    if (countdownEmail > 0 || loading) return;
    if (!isValidEmail(identity.email)) return;
    setLoading(true);
    const res = await requestRegistrationOtp({
      fullName: identity.fullName,
      email: String(identity.email).trim(),
      mobile: String(identity.mobile).trim(),
    });
    setLoading(false);
    if (res?.success) {
      setCountdownEmail(60);
      setErrors((p) => ({ ...p, emailOtp: null }));
    } else {
      setErrors((p) => ({ ...p, emailOtp: res?.message || "Failed to resend OTP" }));
    }
  };

  const resendMobile = async () => {
    if (countdownMobile > 0 || loading) return;
    if (!isValidMobile(identity.mobile)) return;
    setLoading(true);
    const res = await requestRegistrationOtp({
      fullName: identity.fullName,
      email: String(identity.email).trim(),
      mobile: String(identity.mobile).trim(),
    });
    setLoading(false);
    if (res?.success) {
      setCountdownMobile(60);
      setErrors((p) => ({ ...p, mobileOtp: null }));
    } else {
      setErrors((p) => ({ ...p, mobileOtp: res?.message || "Failed to resend OTP" }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 text-gray-900">
      <Card className="w-full max-w-155 border-gray-200 bg-white text-gray-900">
        <CardHeader className="text-center">
          <img src={universityLogo} alt="Maharaja Sayajirao University of Baroda" className="h-17.5 mx-auto mb-4 object-contain" />
          <CardTitle className="text-gray-900">Maharaja Sayajirao University of Baroda</CardTitle>
          <CardDescription className="text-gray-600">Online Transcript Management System</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-gray-900">Student Registration</h2>
            <p className="text-sm text-gray-600">Create your student account with email and mobile verification.</p>
          </div>

          {stage === "identity" ? (
            <form onSubmit={startOtpVerification} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-700" htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={identity.fullName}
                  onChange={(e) => {
                    setIdentity((p) => ({ ...p, fullName: e.target.value }));
                    if (errors.fullName) setErrors((p) => ({ ...p, fullName: null }));
                  }}
                  placeholder="Enter your full name"
                  aria-invalid={!!errors.fullName}
                />
                {errors.fullName ? <p className="text-xs text-red-600">{errors.fullName}</p> : null}
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700" htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={identity.email}
                  onChange={(e) => {
                    setIdentity((p) => ({ ...p, email: e.target.value }));
                    if (errors.email) setErrors((p) => ({ ...p, email: null }));
                  }}
                  placeholder="Enter your email"
                  aria-invalid={!!errors.email}
                />
                {errors.email ? <p className="text-xs text-red-600">{errors.email}</p> : null}
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700" htmlFor="mobile">Mobile Number</Label>
                <Input
                  id="mobile"
                  value={identity.mobile}
                  onChange={(e) => {
                    setIdentity((p) => ({ ...p, mobile: e.target.value.replace(/[^\d]/g, "").slice(0, 10) }));
                    if (errors.mobile) setErrors((p) => ({ ...p, mobile: null }));
                  }}
                  placeholder="Enter 10-digit mobile number"
                  aria-invalid={!!errors.mobile}
                />
                {errors.mobile ? <p className="text-xs text-red-600">{errors.mobile}</p> : null}
              </div>

              {errors.submit ? <Alert variant="destructive">{errors.submit}</Alert> : null}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending OTPs..." : "Send OTP to Email & Mobile"}
              </Button>

              <p className="text-sm text-gray-600 text-center">
                Already have an account?{" "}
                <Link to="/login" className="text-[#1e40af] font-medium hover:underline">
                  Login here
                </Link>
              </p>
            </form>
          ) : (
            <form onSubmit={complete} className="space-y-6">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-700">
                  Verifying account for <span className="font-medium">{identity.fullName || "Student"}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Email: {String(identity.email || "").trim()} | Mobile: {String(identity.mobile || "").trim()}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">Email OTP</p>
                    <p className="text-xs text-gray-500">{countdownEmail > 0 ? `Resend in ${countdownEmail}s` : "You can resend now"}</p>
                  </div>
                  <OtpInput
                    value={emailOtp}
                    onChange={(next) => {
                      setEmailOtp(next);
                      if (errors.emailOtp) setErrors((p) => ({ ...p, emailOtp: null }));
                    }}
                    error={errors.emailOtp}
                    autoFocus
                  />
                  <Button type="button" variant="ghost" className="h-auto px-0 text-[#1e40af] hover:bg-transparent hover:underline" disabled={countdownEmail > 0 || loading} onClick={resendEmail}>
                    Resend Email OTP
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">Mobile OTP</p>
                    <p className="text-xs text-gray-500">{countdownMobile > 0 ? `Resend in ${countdownMobile}s` : "You can resend now"}</p>
                  </div>
                  <OtpInput
                    value={mobileOtp}
                    onChange={(next) => {
                      setMobileOtp(next);
                      if (errors.mobileOtp) setErrors((p) => ({ ...p, mobileOtp: null }));
                    }}
                    error={errors.mobileOtp}
                    autoFocus={false}
                  />
                  <Button type="button" variant="ghost" className="h-auto px-0 text-[#1e40af] hover:bg-transparent hover:underline" disabled={countdownMobile > 0 || loading} onClick={resendMobile}>
                    Resend Mobile OTP
                  </Button>
                </div>
              </div>

              <Separator />

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#1e40af] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e40af]"
                />
                Keep me signed in
              </label>

              {errors.submit ? <Alert variant="destructive">{errors.submit}</Alert> : null}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStage("identity");
                    setErrors({});
                    setEmailOtp("");
                    setMobileOtp("");
                    setCountdownEmail(0);
                    setCountdownMobile(0);
                  }}
                >
                  Edit Details
                </Button>
                <Button type="submit" className="sm:flex-1" disabled={loading}>
                  {loading ? "Creating account..." : "Verify OTPs & Create Account"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
