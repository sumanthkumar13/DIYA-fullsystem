import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import  api  from "@/lib/axios";


export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await api.post("/auth/login", {
        identifier: phone,
        password,
      });

      // 🔴 IMPORTANT: token is inside res.data.data
      const authData = res.data.data;

      localStorage.setItem("token", authData.token);
      localStorage.setItem("user", JSON.stringify(authData));

      toast({
        title: "Welcome back!",
        description: "Successfully logged in to your account.",
        className: "bg-green-50 border-green-200 text-green-800",
      });

      // Navigate only AFTER token is saved
      setLocation("/dashboard");

    } catch (error: any) {
      toast({
        title: "Login failed",
        description:
          error?.response?.data?.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white shadow-sm border mb-4 text-4xl">
          🪔
        </div>
        <h1 className="text-3xl font-display font-bold text-gray-900">Diya</h1>
        <p className="text-gray-500 mt-2">Bring Diya to Your Business</p>
      </div>

      <Card className="w-full max-w-md border-gray-200 shadow-xl">
        <CardHeader className="pb-2 text-center">
          <CardTitle className="text-2xl font-bold">
            Sign in to your account
          </CardTitle>
          <p className="text-sm text-gray-500">
            Enter your mobile number to continue
          </p>
        </CardHeader>

        <CardContent className="p-6 pt-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Mobile Number
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 border-r pr-2 text-sm">
                  +91
                </span>
                <Input
                  type="tel"
                  placeholder="9876543210"
                  className="pl-14 h-11"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="h-11 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/signup">
              <Button variant="link" className="text-primary font-semibold">
                Create Account <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
