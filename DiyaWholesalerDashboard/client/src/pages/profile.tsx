import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import { getInitials, getUserDisplayName } from "@/lib/greeting";
import avatarImage from "@assets/generated_images/professional_business_avatar_for_a_wholesaler.png";
import { useLocation } from "wouter";

function pickFirstString(...values: unknown[]) {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const displayName = getUserDisplayName(user) || "Account";
  const initials = getInitials(displayName);
  const avatarUrl = (user as any)?.avatarUrl as string | undefined;

  const email = useMemo(
    () => pickFirstString((user as any)?.email, (user as any)?.user?.email, (user as any)?.profile?.email),
    [user]
  );
  const role = useMemo(
    () => pickFirstString((user as any)?.role, (user as any)?.user?.role, (user as any)?.profile?.role),
    [user]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Profile</h1>
          <p className="text-sm text-gray-500">Your account details for Diya Wholesalers.</p>
        </div>
        <Button variant="outline" onClick={() => setLocation("/settings")}>
          Manage settings
        </Button>
      </div>

      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-orange-50 to-orange-100 border-b border-orange-100" />
        <CardContent className="relative px-6 pb-6">
          <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-10">
            <Avatar className="h-20 w-20 border-4 border-white shadow-md rounded-xl">
              <AvatarImage src={avatarUrl || avatarImage} alt="Profile" />
              <AvatarFallback className="rounded-xl bg-gray-800 text-white text-lg font-bold">{initials}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
                {role ? (
                  <Badge variant="secondary" className="bg-gray-50 text-gray-700">
                    {role}
                  </Badge>
                ) : null}
              </div>
              <p className="text-sm text-gray-500 mt-1">Diya Wholesalers Dashboard</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-white border-gray-200 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle>Account information</CardTitle>
            <CardDescription>These details come from your login token.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full name</Label>
                <div className="h-10 px-3 rounded-md border border-gray-200 bg-gray-50 flex items-center text-sm text-gray-900">
                  {displayName}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <div className="h-10 px-3 rounded-md border border-gray-200 bg-gray-50 flex items-center text-sm text-gray-900">
                  {email || "—"}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <div className="h-10 px-3 rounded-md border border-gray-200 bg-gray-50 flex items-center text-sm text-gray-900">
                  {role || "—"}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Token status</Label>
                <div className="h-10 px-3 rounded-md border border-gray-200 bg-gray-50 flex items-center text-sm text-gray-900">
                  {user?.token ? "Signed in" : "Signed out"}
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm text-gray-500">
                Want to update business/profile details or change password?
              </div>
              <Button className="bg-primary hover:bg-primary/90 text-white" onClick={() => setLocation("/settings")}>
                Go to Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle>Quick links</CardTitle>
            <CardDescription>Common account actions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => setLocation("/dashboard")}>
              Dashboard
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => setLocation("/settings")}>
              Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

