import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Building2,
  Truck,
  QrCode,
  Upload,
  Loader2,
  ShoppingBag,
  Store
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const categories = [
  "FMCG Distributor", "General Kirana", "Dry Grocery / Grains", "Stationery & Toys",
  "Medical & Pharma", "Cosmetics / Personal Care", "Snacks & Confectionery",
  "Packaged Food", "Beverage Distributor", "Household Cleaning",
  "Hardware / Electrical", "Garments / Textiles", "Agri Products", "Other"
];

export default function SignupFlow() {
  const [step, setStep] = useState(1);
  const [location, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Form States
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [deliveryModel, setDeliveryModel] = useState<"delivery" | "pickup" | null>(null);

  // Step 1: Owner Details
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");

  // Step 3: Business Details
  const [businessName, setBusinessName] = useState("");
  const [gstin, setGstin] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [fullAddress, setFullAddress] = useState("");

  // Step 5: Payment Setup
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

  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter(c => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

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
      const res = await fetch("http://localhost:8081/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: mobile })
      });

      const data = await res.json();

      toast({
        title: "OTP Sent",
        description: "Check backend logs for the OTP.",
      });
    } catch (err) {
      toast({
        title: "Failed to Send OTP",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  const verifyOtp = async () => {
    try {
      const res = await fetch("http://localhost:8081/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: mobile, otp })
      });

      const data = await res.json();

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

  const submitRegistration = async () => {
    const payload = {
      fullName,
      email,
      mobile,
      password,
      categories: selectedCategories,
      businessName,
      gstin,
      pincode,
      city,
      fullAddress,
      deliveryModel: deliveryModel?.toUpperCase(),
      upiId,
      qrCodeUrl
    };

    try {
      const res = await fetch("http://localhost:8081/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

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
                  <Button variant="outline" onClick={sendOtp} className="h-11 whitespace-nowrap">Send OTP</Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Enter OTP</label>
                <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="• • • • • •" className="h-11 text-center text-lg tracking-widest" maxLength={6} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Set Password</label>
                <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Create a strong password" className="h-11" />
              </div>
            </div>
            <Button
              onClick={async () => {
                const ok = await verifyOtp();
                if (ok) nextStep();
              }}
              className="w-full h-12 text-base bg-primary hover:bg-primary/90 shadow-lg shadow-orange-200"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : "Verify & Continue"}
            </Button>
          </div>
        );

      case 2: // Industry Selection
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-display font-bold text-gray-900">What business do you run?</h2>
              <p className="text-gray-500 mt-1">Select one or more categories that apply.</p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border",
                    selectedCategories.includes(cat)
                      ? "bg-primary text-white border-primary shadow-md shadow-orange-200 transform scale-105"
                      : "bg-white text-gray-600 border-gray-200 hover:border-primary/50 hover:bg-orange-50"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
            <Button onClick={nextStep} disabled={selectedCategories.length === 0} className="w-full h-12 mt-6 bg-primary hover:bg-primary/90">
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
                  <label className="text-sm font-medium text-gray-700">City</label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Hyderabad" className="h-11" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Full Address</label>
                <Input value={fullAddress} onChange={(e) => setFullAddress(e.target.value)} placeholder="Shop No, Street, Area" className="h-11" />
              </div>
            </div>
            <Button onClick={nextStep} className="w-full h-12 bg-primary hover:bg-primary/90">
              Continue
            </Button>
          </div>
        );

      case 4: // Delivery Model
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-display font-bold text-gray-900">How do you deliver?</h2>
              <p className="text-gray-500 mt-1">Choose your primary delivery model.</p>
            </div>

            <div className="grid gap-4">
              <div
                onClick={() => setDeliveryModel("delivery")}
                className={cn(
                  "cursor-pointer p-5 rounded-xl border-2 transition-all flex items-start gap-4 hover:shadow-md",
                  deliveryModel === "delivery"
                    ? "border-primary bg-orange-50/50"
                    : "border-gray-100 bg-white hover:border-primary/30"
                )}
              >
                <div className={cn("h-12 w-12 rounded-full flex items-center justify-center shrink-0", deliveryModel === "delivery" ? "bg-primary text-white" : "bg-gray-100 text-gray-500")}>
                  <Truck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">I deliver goods</h3>
                  <p className="text-sm text-gray-500 mt-1">I have vehicles/staff to deliver orders to retailers' shops.</p>
                </div>
              </div>

              <div
                onClick={() => setDeliveryModel("pickup")}
                className={cn(
                  "cursor-pointer p-5 rounded-xl border-2 transition-all flex items-start gap-4 hover:shadow-md",
                  deliveryModel === "pickup"
                    ? "border-primary bg-orange-50/50"
                    : "border-gray-100 bg-white hover:border-primary/30"
                )}
              >
                <div className={cn("h-12 w-12 rounded-full flex items-center justify-center shrink-0", deliveryModel === "pickup" ? "bg-primary text-white" : "bg-gray-100 text-gray-500")}>
                  <Store className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Retailers pick up</h3>
                  <p className="text-sm text-gray-500 mt-1">Retailers come to my shop/godown to pick up their orders.</p>
                </div>
              </div>
            </div>

            <Button onClick={nextStep} disabled={!deliveryModel} className="w-full h-12 mt-4 bg-primary hover:bg-primary/90">
              Continue
            </Button>
          </div>
        );

      case 5: // Payment Setup
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

      case 6: // Success
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
          {step > 1 && step < 6 ? (
            <Button variant="ghost" size="sm" onClick={prevStep} className="text-gray-500 hover:text-gray-900 -ml-2">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          ) : <div />}

          {step < 6 && (
            <div className="text-sm font-medium text-gray-400">
              Step {step} of 5
            </div>
          )}
        </div>

        <Card className="border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden">
          {step < 6 && (
            <div className="h-1 bg-gray-100 w-full">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${(step / 5) * 100}%` }}
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
