import api from "@/lib/axios";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { WHOLESALER_BUSINESS_TYPES } from "@/lib/businessTypes";
import { cn } from "@/lib/utils";

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

  type Step1Field = "fullName" | "email" | "mobile" | "otp" | "password" | "agreedLegal";
  const [touchedStep1, setTouchedStep1] = useState<Record<Step1Field, boolean>>({
    fullName: false,
    email: false,
    mobile: false,
    otp: false,
    password: false,
    agreedLegal: false,
  });

  const nameError = (() => {
    const v = fullName.trim();
    if (!v) return "Please enter your full name.";
    if (!/^[A-Za-z ]+$/.test(v)) return "Name can contain only alphabets and spaces.";
    return "";
  })();

  const emailError = (() => {
    const v = email.trim();
    if (!v) return "Please enter your email address.";
    // Practical email check (not overly strict)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Please enter a valid email (e.g., abc@domain.com).";
    return "";
  })();

  const phoneDigits = mobile.replace(/\D/g, "");
  const mobileError = (() => {
    if (!phoneDigits) return "Please enter your mobile number.";
    if (phoneDigits.length !== 10) return "Enter a valid 10-digit phone number.";
    return "";
  })();

  const passwordError = (() => {
    const v = password;
    if (!v) return "Please set a password.";
    if (v.length < 8) return "Password must be at least 8 characters long.";
    if (!/[A-Z]/.test(v)) return "Password must include at least one uppercase letter (A–Z).";
    if (!/[a-z]/.test(v)) return "Password must include at least one lowercase letter (a–z).";
    if (!/[0-9]/.test(v)) return "Password must include at least one number (0–9).";
    if (!/[^A-Za-z0-9]/.test(v)) return "Password must include at least one special character (e.g., !@#).";
    return "";
  })();

  const otpError = (() => {
    const v = otp.trim();
    if (!otpSent) return "";
    if (!v) return "Please enter the OTP sent to your mobile.";
    if (!/^\d{6}$/.test(v)) return "OTP must be a 6-digit number.";
    return "";
  })();

  const step1Valid =
    !nameError && !emailError && !mobileError && !passwordError && (!otpSent || !otpError) && agreedLegal;

  const markStep1Touched = (...fields: Step1Field[]) => {
    setTouchedStep1((prev) => {
      const next = { ...prev };
      fields.forEach((f) => (next[f] = true));
      return next;
    });
  };

  // Step 3: Business Details
  const [businessName, setBusinessName] = useState("");
  const [gstin, setGstin] = useState("");
  const [pincode, setPincode] = useState("");
  const [state, setState] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [districtHint, setDistrictHint] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [pinApiError, setPinApiError] = useState<string | null>(null);
  const [postOfficeSuggestions, setPostOfficeSuggestions] = useState<string[]>([]);
  const [postOfficeOpen, setPostOfficeOpen] = useState(false);
  const [selectedPostOffice, setSelectedPostOffice] = useState<string>("");

  const pinCacheRef = (globalThis as any).__diyaPinCache || new Map<string, any>();
  (globalThis as any).__diyaPinCache = pinCacheRef;

  type Step3Field = "businessName" | "gstin" | "pincode" | "cityTown" | "state";
  const [touchedStep3, setTouchedStep3] = useState<Record<Step3Field, boolean>>({
    businessName: false,
    gstin: false,
    pincode: false,
    cityTown: false,
    state: false,
  });

  const businessNameTrim = businessName.trim();
  const businessNameError = (() => {
    if (!businessNameTrim) return "Business name is required.";
    if (businessNameTrim.length < 3 || businessNameTrim.length > 100) return "Business name must be 3–100 characters.";
    // Allow alphabets, numbers, spaces, and common symbols (& . , -)
    if (!/^[A-Za-z0-9&.,\- ]+$/.test(businessNameTrim)) {
      return "Use only letters, numbers, spaces, and symbols: & . , -";
    }
    // Prevent only numbers/symbols; require at least one alphabet
    if (!/[A-Za-z]/.test(businessNameTrim)) return "Business name must include at least one letter.";
    return "";
  })();

  const gstinTrim = gstin.trim().toUpperCase();
  const gstinError = (() => {
    if (!gstinTrim) return "";
    // Indian GSTIN: 15 chars => 2 digits + 5 letters + 4 digits + 1 letter + 1 (1-9/A-Z) + Z + 1 (0-9/A-Z)
    const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
    if (!GSTIN_RE.test(gstinTrim)) return "Please enter a valid GSTIN (15 characters).";
    return "";
  })();

  const pincodeDigits = pincode.replace(/\D/g, "");
  const pincodeError = (() => {
    if (!pincodeDigits) return "Pincode is required.";
    if (!/^\d{6}$/.test(pincodeDigits)) return "Pincode must be exactly 6 digits.";
    return "";
  })();

  const territoryTrim = selectedPostOffice.trim();
  const cityTownError = (() => {
    if (pincodeDigits.length !== 6 || pinApiError || pinLoading) return "";
    if (!territoryTrim) return "Select City / Town from the list.";
    return "";
  })();

  const stateTrim = state.trim();
  const stateError = (() => {
    if (!stateTrim) return "State is required.";
    return "";
  })();

  const step3Valid =
    !businessNameError &&
    !gstinError &&
    !pincodeError &&
    pincodeDigits.length === 6 &&
    !pinLoading &&
    !pinApiError &&
    !cityTownError &&
    !stateError &&
    !!territoryTrim;

  const markStep3Touched = (...fields: Step3Field[]) => {
    setTouchedStep3((prev) => {
      const next = { ...prev };
      fields.forEach((f) => (next[f] = true));
      return next;
    });
  };

  type IndiaPostResponseRow = {
    Status?: string;
    PostOffice?: Array<{
      Name?: string;
      District?: string;
      State?: string;
    }>;
  };

  useEffect(() => {
    const pin = pincodeDigits;
    if (pin.length !== 6) {
      setPinApiError(null);
      setPinLoading(false);
      setPostOfficeSuggestions([]);
      setSelectedPostOffice("");
      setDistrictHint("");
      setState("");
      return;
    }

    let cancelled = false;

    async function load() {
      // Avoid redundant calls with simple cache
      if (pinCacheRef.has(pin)) {
        const cached = pinCacheRef.get(pin) as IndiaPostResponseRow[] | null;
        if (cancelled) return;
        if (!cached || !Array.isArray(cached) || cached.length === 0) {
          setPinApiError("Invalid pincode or no location data found.");
          setPostOfficeSuggestions([]);
          setSelectedPostOffice("");
          setDistrictHint("");
          setState("");
          return;
        }
        const row = cached[0];
        const po0 = row?.PostOffice?.[0];
        if (!po0?.District || !po0?.State) {
          setPinApiError("No location data found for this pincode.");
          setPostOfficeSuggestions([]);
          setSelectedPostOffice("");
          setDistrictHint("");
          setState("");
          return;
        }
        setPinApiError(null);
        setDistrictHint(String(po0.District).trim());
        setState(String(po0.State).trim());
        setSelectedPostOffice("");
        const names = (row?.PostOffice || [])
          .map((p) => (typeof p?.Name === "string" ? p.Name.trim() : ""))
          .filter(Boolean);
        setPostOfficeSuggestions(Array.from(new Set(names)));
        return;
      }

      try {
        setPinLoading(true);
        setPinApiError(null);
        setSelectedPostOffice("");
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { method: "GET" });
        const data = (await res.json()) as IndiaPostResponseRow[];
        pinCacheRef.set(pin, data);
        if (cancelled) return;

        const row = Array.isArray(data) ? data[0] : null;
        if (!row || row.Status !== "Success" || !row.PostOffice || row.PostOffice.length === 0) {
          setPinApiError("Invalid pincode or no location data found.");
          setPostOfficeSuggestions([]);
          setSelectedPostOffice("");
          setDistrictHint("");
          setState("");
          return;
        }
        const po0 = row.PostOffice[0];
        const district = (po0?.District || "").trim();
        const stateName = (po0?.State || "").trim();
        if (!district || !stateName) {
          setPinApiError("No location data found for this pincode.");
          setPostOfficeSuggestions([]);
          setSelectedPostOffice("");
          setDistrictHint("");
          setState("");
          return;
        }

        setDistrictHint(district);
        setState(stateName);
        setPinApiError(null);

        const names = row.PostOffice
          .map((p) => (typeof p?.Name === "string" ? p.Name.trim() : ""))
          .filter(Boolean);
        setPostOfficeSuggestions(Array.from(new Set(names)));
      } catch {
        if (!cancelled) {
          pinCacheRef.set(pin, null);
          setPinApiError("Could not fetch location for this pincode.");
          setPostOfficeSuggestions([]);
          setSelectedPostOffice("");
          setDistrictHint("");
          setState("");
        }
      } finally {
        if (!cancelled) setPinLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pincodeDigits]);

  // Payment setup removed from signup flow.

  const nextStep = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep(step + 1);
    }, 600);
  };

  const prevStep = () => setStep(step - 1);

  const sendOtp = async () => {
    markStep1Touched("mobile");
    if (mobileError) {
      toast({
        title: "Invalid Mobile Number",
        description: mobileError,
        variant: "destructive",
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
        phone: phoneDigits,
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
        phone: phoneDigits,
        otp: otp.trim(),
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
    const territory = selectedPostOffice.trim();
    if (!territory) {
      toast({
        title: "City / Town required",
        description: "Choose a post office for your pincode.",
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
      mobile: phoneDigits,
      password,
      businessType,
      businessName: businessNameTrim,
      gstin: gstinTrim,
      pincode: pincodeDigits,
      region: territory,
      city: territory,
      state: stateTrim,
      fullAddress,
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
      setLocation("/login");

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
                <Input
                  value={fullName}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFullName(v);
                    if (touchedStep1.fullName) markStep1Touched("fullName");
                  }}
                  onBlur={() => markStep1Touched("fullName")}
                  placeholder="Enter your name"
                  className="h-11"
                />
                {touchedStep1.fullName && nameError && <p className="text-xs text-red-600">{nameError}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email Address</label>
                <Input
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (touchedStep1.email) markStep1Touched("email");
                  }}
                  onBlur={() => markStep1Touched("email")}
                  type="email"
                  placeholder="abc@domain.com"
                  className="h-11"
                />
                {touchedStep1.email && emailError && <p className="text-xs text-red-600">{emailError}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Mobile Number</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium border-r border-gray-200 pr-2 text-sm">+91</span>
                    <Input
                      value={phoneDigits}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setMobile(digits);
                        if (touchedStep1.mobile) markStep1Touched("mobile");
                      }}
                      onBlur={() => markStep1Touched("mobile")}
                      inputMode="numeric"
                      pattern="\d*"
                      type="tel"
                      placeholder="9876543210"
                      className="pl-14 h-11"
                      maxLength={10}
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={sendOtp}
                    className="h-11 whitespace-nowrap"
                    disabled={sendOtpLoading || resendSeconds > 0 || !!mobileError}
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
                {touchedStep1.mobile && mobileError && <p className="text-xs text-red-600">{mobileError}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Enter OTP</label>
                <Input
                  value={otp}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setOtp(digits);
                    if (touchedStep1.otp) markStep1Touched("otp");
                  }}
                  onBlur={() => markStep1Touched("otp")}
                  placeholder={otpSent ? "• • • • • •" : "Send OTP to continue"}
                  className={`h-11 text-center text-lg tracking-widest ${!otpSent ? "opacity-60" : ""}`}
                  maxLength={6}
                  disabled={!otpSent}
                />
                {otpSent && touchedStep1.otp && otpError && <p className="text-xs text-red-600">{otpError}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Set Password</label>
                <div className="relative">
                  <Input
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (touchedStep1.password) markStep1Touched("password");
                    }}
                    onBlur={() => markStep1Touched("password")}
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
                {otpSent && touchedStep1.password && passwordError && (
                  <p className="text-xs text-red-600">{passwordError}</p>
                )}
                {otpSent && !passwordError && password.trim().length > 0 && (
                  <p className="text-xs text-gray-500">
                    Use 8+ characters with uppercase, lowercase, number, and special character.
                  </p>
                )}
              </div>
            </div>
            <label className="flex items-start gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-gray-300"
                checked={agreedLegal}
                onChange={(e) => {
                  setAgreedLegal(e.target.checked);
                  markStep1Touched("agreedLegal");
                }}
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
                markStep1Touched("fullName", "email", "mobile", "otp", "password", "agreedLegal");
                if (!otpSent) {
                  toast({
                    title: "Send OTP first",
                    description: "Please request OTP to continue.",
                    variant: "destructive",
                  });
                  return;
                }
                if (nameError || emailError || mobileError || passwordError || otpError || !agreedLegal) {
                  toast({
                    title: "Check your details",
                    description: "Please fix the highlighted fields to continue.",
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
              disabled={!otpSent || !step1Valid}
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
                <Input
                  value={businessName}
                  onChange={(e) => {
                    setBusinessName(e.target.value);
                    if (touchedStep3.businessName) markStep3Touched("businessName");
                  }}
                  onBlur={() => markStep3Touched("businessName")}
                  placeholder="e.g. Sri Lakshmi Traders"
                  className="h-11"
                />
                {touchedStep3.businessName && businessNameError && (
                  <p className="text-xs text-red-600">{businessNameError}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">GSTIN (Optional)</label>
                <Input
                  value={gstinTrim}
                  onChange={(e) => {
                    setGstin(e.target.value.toUpperCase());
                    if (touchedStep3.gstin) markStep3Touched("gstin");
                  }}
                  onBlur={() => markStep3Touched("gstin")}
                  placeholder="22AAAAA0000A1Z5"
                  className="h-11 uppercase"
                  maxLength={15}
                />
                {touchedStep3.gstin && gstinError && <p className="text-xs text-red-600">{gstinError}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Pincode</label>
                <div className="relative">
                  <Input
                    value={pincodeDigits}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setPincode(digits);
                      if (touchedStep3.pincode) markStep3Touched("pincode");
                    }}
                    onBlur={() => markStep3Touched("pincode")}
                    inputMode="numeric"
                    pattern="\d*"
                    placeholder="500081"
                    className="h-11 pr-10"
                    maxLength={6}
                  />
                  {pinLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                  )}
                </div>
                {touchedStep3.pincode && pincodeError && <p className="text-xs text-red-600">{pincodeError}</p>}
                {!pincodeError && pinApiError && <p className="text-xs text-red-600">{pinApiError}</p>}
                {pinLoading && pincodeDigits.length === 6 && !pinApiError && (
                  <p className="text-xs text-gray-500">Fetching location…</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">City / Town</label>
                  <Popover open={postOfficeOpen} onOpenChange={setPostOfficeOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={postOfficeOpen}
                        className={cn(
                          "w-full justify-between h-11 font-normal bg-gray-50 border-gray-200 hover:bg-gray-50",
                          !selectedPostOffice && "text-muted-foreground"
                        )}
                        disabled={
                          pinLoading ||
                          pincodeDigits.length !== 6 ||
                          !!pinApiError ||
                          postOfficeSuggestions.length === 0
                        }
                        onClick={() => markStep3Touched("cityTown")}
                      >
                        <span className="truncate text-left">
                          {selectedPostOffice || (districtHint ? `Tap to select (area: ${districtHint})` : "Enter pincode first")}
                        </span>
                        <span className="text-gray-400 shrink-0">⌄</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[280px]" align="start">
                      <Command>
                        <CommandInput placeholder="Search post office…" />
                        <CommandList>
                          <CommandEmpty>No locations found.</CommandEmpty>
                          <CommandGroup>
                            {postOfficeSuggestions.map((name) => (
                              <CommandItem
                                key={name}
                                value={name}
                                onSelect={(v) => {
                                  const chosen = (v || name).trim();
                                  setSelectedPostOffice(chosen);
                                  setPostOfficeOpen(false);
                                  markStep3Touched("cityTown");
                                }}
                              >
                                {name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {touchedStep3.cityTown && cityTownError && (
                    <p className="text-xs text-red-600">{cityTownError}</p>
                  )}
                  {districtHint && !pinApiError && pincodeDigits.length === 6 && (
                    <p className="text-xs text-gray-500">
                      District: {districtHint}. Select the post office that matches your location.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">State</label>
                  <Input
                    value={state}
                    readOnly
                    tabIndex={-1}
                    placeholder="Autofilled from pincode"
                    className="h-11 bg-gray-50 text-gray-900 cursor-default"
                    onBlur={() => markStep3Touched("state")}
                  />
                  {touchedStep3.state && stateError && <p className="text-xs text-red-600">{stateError}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Full Address</label>
                <Input value={fullAddress} onChange={(e) => setFullAddress(e.target.value)} placeholder="Shop No, Street, Area" className="h-11" />
              </div>
            </div>
            <Button
              onClick={() => {
                markStep3Touched("businessName", "gstin", "pincode", "cityTown", "state");
                if (step3Valid) submitRegistration();
              }}
              disabled={!step3Valid}
              className="w-full h-12 bg-primary hover:bg-primary/90"
            >
              Create Account
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          {step > 1 && step < 4 ? (
            <Button variant="ghost" size="sm" onClick={prevStep} className="text-gray-500 hover:text-gray-900 -ml-2">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          ) : <div />}

          {step < 4 && (
            <div className="text-sm font-medium text-gray-400">
              Step {step} of 3
            </div>
          )}
        </div>

        <Card className="border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden">
          {step < 4 && (
            <div className="h-1 bg-gray-100 w-full">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${(step / 3) * 100}%` }}
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
