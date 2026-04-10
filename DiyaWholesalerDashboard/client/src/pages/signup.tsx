import api from "@/lib/axios";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  CheckCircle2,
  QrCode,
  Upload,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WHOLESALER_REGIONS } from "@/lib/regions";
import { WHOLESALER_BUSINESS_TYPES } from "@/lib/businessTypes";

export default function SignupFlow() {
  const [step, setStep] = useState(1);
  const [location, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [businessType, setBusinessType] = useState("");

  // Step 1: Owner Details
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendOtpLoading, setSendOtpLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [agreedLegal, setAgreedLegal] = useState(false);

  // Step 3: Business Details
  const [businessName, setBusinessName] = useState("");
  const [gstin, setGstin] = useState("");
  const [pincode, setPincode] = useState("");
  const [region, setRegion] = useState("");
  const [state, setState] = useState("");
  const [fullAddress, setFullAddress] = useState("");

  // Step 4: Payment Setup
  const [upiId, setUpiId] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState(null); // future file upload

  const nextStep = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep(step + 1);
    }, 600);
  };

  const prevStep = () => setStep(step - 1);

  const sendOtp = async () => {
    if (mobile.length !== 10) {
      toast({
        title: "Invalid Mobile Number",
        description: "Enter a valid 10-digit phone number.",
        variant: "destructive"
      });
      return;
    }

    try {
      if (sendOtpLoading || resendSeconds > 0) return;
      setSendOtpLoading(true);
      // const res = await fetch("http://localhost:8081/api/auth/send-otp", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ phone: mobile })
      // });

      // const data = await res.json();

              const res = await api.post("/auth/send-otp", {
          phone: mobile
        });

        const data = res.data;
        if (data?.otp) setOtp(data.otp);
        setOtpSent(true);
        setResendSeconds(30);

      toast({
        title: "OTP Sent",
        description: "OTP filled below for verification.",
      });
    } catch (err) {
      toast({
        title: "Failed to Send OTP",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setSendOtpLoading(false);
    }
  };

  const verifyOtp = async () => {
    try {
      // const res = await fetch("http://localhost:8081/api/auth/verify-otp", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ phone: mobile, otp })
      // });

      // const data = await res.json();

      const res = await api.post("/auth/verify-otp", {
  phone: mobile,
  otp
});

const data = res.data;

      if (!data.success) {
        toast({
          title: "Invalid OTP",
          description: "Please try again.",
          variant: "destructive"
        });
        return false;
      }

      return true;

    } catch (err) {
      toast({
        title: "OTP Verification Failed",
        description: "Try again later.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Resend countdown
  useEffect(() => {
    if (resendSeconds <= 0) return;
    const id = window.setInterval(() => {
      setResendSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendSeconds]);

  const submitRegistration = async () => {
    if (!region) {
      toast({
        title: "Region required",
        description: "Please go back to Business Details and select your region.",
        variant: "destructive",
      });
      return;
    }
    if (!businessType) {
      toast({
        title: "Business type required",
        description: "Please go back and select your business type.",
        variant: "destructive",
      });
      return;
    }
    const payload = {
      fullName,
      email,
      mobile,
      password,
      businessType,
      businessName,
      gstin,
      pincode,
      region,
      state,
      fullAddress,
      upiId,
      qrCodeUrl
    };

    try {
      // const res = await fetch("http://localhost:8081/api/auth/register", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(payload)
      // });

      // const data = await res.json();

      const res = await api.post("/auth/register", payload);
const data = res.data;

      if (!data.success) {
        toast({
          title: "Signup Failed",
          description: data.message,
          variant: "destructive"
        });
        return;
      }

      toast({ title: "Success", description: "Account created successfully!" });
      setLocation("/onboarding");

    } catch (err) {
      toast({
        title: "Server Error",
        description: "Try again later.",
        variant: "destructive"
      });
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1: // Welcome & Owner Details
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-display font-bold text-gray-900">Create your account</h2>
              <p className="text-gray-500 mt-1">Digitize orders, payments, and retailers effortlessly.</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Full Name</label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter your name" className="h-11" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email Address</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="john@example.com" className="h-11" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Mobile Number</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium border-r border-gray-200 pr-2 text-sm">+91</span>
                    <Input value={mobile} onChange={(e) => setMobile(e.target.value)} type="tel" placeholder="98765 43210" className="pl-14 h-11" />
                  </div>
                  <Button
                    variant="outline"
                    onClick={sendOtp}
                    className="h-11 whitespace-nowrap"
                    disabled={sendOtpLoading || resendSeconds > 0}
                  >
                    {sendOtpLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Sending…
                      </>
                    ) : resendSeconds > 0 ? (
                      `Resend in 00:${String(resendSeconds).padStart(2, "0")}`
                    ) : (
                      "Send OTP"
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Enter OTP</label>
                <Input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder={otpSent ? "• • • • • •" : "Send OTP to continue"}
                  className={`h-11 text-center text-lg tracking-widest ${!otpSent ? "opacity-60" : ""}`}
                  maxLength={6}
                  disabled={!otpSent}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Set Password</label>
                <div className="relative">
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? "text" : "password"}
                    placeholder={otpSent ? "Create a strong password" : "Send OTP to continue"}
                    className={`h-11 pr-10 ${!otpSent ? "opacity-60" : ""}`}
                    disabled={!otpSent}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    disabled={!otpSent}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            <label className="flex items-start gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-gray-300"
                checked={agreedLegal}
                onChange={(e) => setAgreedLegal(e.target.checked)}
              />
              <span>
                I agree to Diya&apos;s{" "}
                <a className="text-primary font-semibold hover:underline" href="/terms" target="_blank" rel="noreferrer">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a className="text-primary font-semibold hover:underline" href="/privacy" target="_blank" rel="noreferrer">
                  Privacy Policy
                </a>
                .
              </span>
            </label>
            <Button
              onClick={async () => {
                if (!otpSent) {
                  toast({
                    title: "Send OTP first",
                    description: "Please request OTP to continue.",
                    variant: "destructive",
                  });
                  return;
                }
                if (!agreedLegal) {
                  toast({
                    title: "Agreement required",
                    description: "Please accept Terms & Privacy Policy to continue.",
                    variant: "destructive",
                  });
                  return;
                }
                const ok = await verifyOtp();
                if (ok) nextStep();
              }}
              disabled={!otpSent || !agreedLegal || otp.trim().length !== 6 || password.trim().length < 6}
              className="w-full h-12 text-base bg-primary hover:bg-primary/90 shadow-lg shadow-orange-200"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : "Verify & Continue"}
            </Button>
          </div>
        );


      case 2: // Business type
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-display font-bold text-gray-900">What business do you run?</h2>
              <p className="text-gray-500 mt-1">Select the option that best describes your business.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Business type</label>
              <Select value={businessType || undefined} onValueChange={setBusinessType}>
                <SelectTrigger className="h-11 w-full">
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent>
                  {WHOLESALER_BUSINESS_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={nextStep}
              disabled={!businessType}
              className="w-full h-12 mt-6 bg-primary hover:bg-primary/90"
            >
              Continue
            </Button>
          </div>
        );

      case 3: // Business Details
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-display font-bold text-gray-900">Business Details</h2>
              <p className="text-gray-500 mt-1">Tell us about your distribution business.</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Business Name</label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Sri Lakshmi Traders" className="h-11" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">GSTIN (Optional)</label>
                <Input value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="22AAAAA0000A1Z5" className="h-11 uppercase" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Pincode</label>
                  <Input value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="500081" className="h-11" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Select Region</label>
                  <Select value={region || undefined} onValueChange={setRegion}>
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue placeholder="Choose your operating region" />
                    </SelectTrigger>
                    <SelectContent>
                      {WHOLESALER_REGIONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">State</label>
                <Input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Telangana"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Full Address</label>
                <Input value={fullAddress} onChange={(e) => setFullAddress(e.target.value)} placeholder="Shop No, Street, Area" className="h-11" />
              </div>
            </div>
            <Button
              onClick={nextStep}
              disabled={!region || !state.trim()}
              className="w-full h-12 bg-primary hover:bg-primary/90"
            >
              Continue
            </Button>
          </div>
        );

      case 4: // Payment Setup
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-display font-bold text-gray-900">Payment Setup</h2>
              <p className="text-gray-500 mt-1">Enable instant retailer payments via UPI.</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center space-y-4">
              <div className="h-24 w-24 bg-gray-50 rounded-xl mx-auto flex items-center justify-center border-2 border-dashed border-gray-300">
                <QrCode className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Upload UPI QR Code</h3>
                <p className="text-xs text-gray-500 mt-1">Take a photo or upload your PhonePe/GPay QR</p>
              </div>
              <Button variant="outline" className="w-full">
                <Upload className="h-4 w-4 mr-2" /> Upload QR Image
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">UPI ID (VPA)</label>
              <Input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="business@okhdfcbank" className="h-11" />
            </div>

            <Button
              onClick={submitRegistration}
              className="w-full h-12 bg-primary hover:bg-primary/90"
            >
              Continue
            </Button>
            <Button variant="ghost" onClick={submitRegistration} className="w-full text-gray-500">
              Skip for now
            </Button>
          </div>
        );

      case 5: // Success
        return (
          <div className="space-y-8 text-center animate-in fade-in zoom-in duration-500 py-8">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-20 duration-1000" />
              <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center relative z-10 text-green-600 mx-auto">
                <CheckCircle2 className="h-12 w-12" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-display font-bold text-gray-900">You're All Set! 🎉</h2>
              <p className="text-gray-500 max-w-xs mx-auto">Your Diya Business account is ready. Start receiving orders today.</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 max-w-xs mx-auto border border-gray-200">
              <p className="text-sm font-medium text-gray-900 mb-2">Invite Retailers</p>
              <div className="flex items-center justify-center h-32 bg-white rounded-lg border border-gray-200 mb-2">
                <QrCode className="h-16 w-16 text-gray-800" />
              </div>
              <p className="text-xs text-gray-500">Scan to download Retailer App</p>
            </div>

            <Link href="/onboarding">
              <Button className="w-full h-14 text-lg bg-primary hover:bg-primary/90 shadow-xl shadow-orange-200">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          {step > 1 && step < 5 ? (
            <Button variant="ghost" size="sm" onClick={prevStep} className="text-gray-500 hover:text-gray-900 -ml-2">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          ) : <div />}

          {step < 5 && (
            <div className="text-sm font-medium text-gray-400">
              Step {step} of 4
            </div>
          )}
        </div>

        <Card className="border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden">
          {step < 5 && (
            <div className="h-1 bg-gray-100 w-full">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${(step / 4) * 100}%` }}
              />
            </div>
          )}
          <CardContent className="p-6 sm:p-8">
            {renderStep()}
          </CardContent>
        </Card>

        {step === 1 && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{" "}
              <Link href="/login">
                <a className="font-semibold text-primary hover:underline">Sign In</a>
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
