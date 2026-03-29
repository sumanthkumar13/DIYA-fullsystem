import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  getWholesalerSettings,
  updateWholesalerSettings,
  changeWholesalerPassword,
} from "@/services/wholesalerSettings";
import {
  User,
  Building,
  Bell,
  Lock,
  Save,
  Upload,
  Link2,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WHOLESALER_BUSINESS_TYPES } from "@/lib/businessTypes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import avatarImage from "@assets/generated_images/professional_business_avatar_for_a_wholesaler.png";
import { tallyPing } from "@/services/tally";

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["wholesaler-settings"],
    queryFn: getWholesalerSettings,
  });

  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [gstin, setGstin] = useState("");
  const [address, setAddress] = useState("");
  const [businessType, setBusinessType] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setOwnerName(data.ownerName ?? "");
    setPhone(data.phone ?? "");
    setBusinessName(data.businessName ?? "");
    setGstin(data.gstin ?? "");
    setAddress(data.address ?? "");
    setBusinessType(data.businessType ?? "");
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: updateWholesalerSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wholesaler-settings"] });
      toast({ title: "Settings saved" });
    },
  });

  const handleSave = () => {
    const payload: Parameters<typeof updateWholesalerSettings>[0] = {
      businessName: businessName || null,
      ownerName: ownerName || null,
      phone: phone || null,
      address: address || null,
      gstin: gstin || null,
    };
    const trimmedType = businessType.trim();
    if (trimmedType) {
      payload.businessType = trimmedType;
    }
    saveMutation.mutate(payload);
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast({
        title: "Current password required",
        description: "Enter your current password.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "New password and confirmation must be the same.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "New password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }
    setPasswordSaving(true);
    try {
      await changeWholesalerPassword({
        currentPassword,
        newPassword,
      });
      toast({ title: "Password updated", description: "You can use your new password on next login." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      const data = err?.response?.data;
      const msg =
        (typeof data?.message === "string" && data.message) ||
        (typeof data === "string" ? data : null) ||
        "Could not update password. Check your current password.";
      toast({ title: "Update failed", description: msg, variant: "destructive" });
    } finally {
      setPasswordSaving(false);
    }
  };

  const disabled = isLoading;

  const [tallyChecking, setTallyChecking] = useState(false);
  const [tallyResult, setTallyResult] = useState<{ connected: boolean; companyName?: string } | null>(null);

  const handleCheckTally = async () => {
    setTallyChecking(true);
    setTallyResult(null);
    try {
      const res = await tallyPing();
      setTallyResult(res);
    } catch {
      setTallyResult({ connected: false });
    } finally {
      setTallyChecking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Manage your account, business profile, and preferences.</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar Navigation for Settings */}
          <div className="w-full md:w-64 shrink-0">
            <TabsList className="flex flex-col h-auto w-full bg-transparent p-0 space-y-1">
              <TabsTrigger 
                value="profile" 
                className="w-full justify-start px-4 py-3 h-auto rounded-lg border border-transparent data-[state=active]:bg-white data-[state=active]:border-gray-200 data-[state=active]:shadow-sm"
              >
                <User className="h-4 w-4 mr-3" /> Profile
              </TabsTrigger>
              <TabsTrigger 
                value="business" 
                className="w-full justify-start px-4 py-3 h-auto rounded-lg border border-transparent data-[state=active]:bg-white data-[state=active]:border-gray-200 data-[state=active]:shadow-sm"
              >
                <Building className="h-4 w-4 mr-3" /> Business Info
              </TabsTrigger>
              <TabsTrigger 
                value="notifications" 
                className="w-full justify-start px-4 py-3 h-auto rounded-lg border border-transparent data-[state=active]:bg-white data-[state=active]:border-gray-200 data-[state=active]:shadow-sm"
              >
                <Bell className="h-4 w-4 mr-3" /> Notifications
              </TabsTrigger>
              <TabsTrigger 
                value="security" 
                className="w-full justify-start px-4 py-3 h-auto rounded-lg border border-transparent data-[state=active]:bg-white data-[state=active]:border-gray-200 data-[state=active]:shadow-sm"
              >
                <Lock className="h-4 w-4 mr-3" /> Security
              </TabsTrigger>
              <TabsTrigger 
                value="tally" 
                className="w-full justify-start px-4 py-3 h-auto rounded-lg border border-transparent data-[state=active]:bg-white data-[state=active]:border-gray-200 data-[state=active]:shadow-sm"
              >
                <Link2 className="h-4 w-4 mr-3" /> Tally Integration
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Content Area */}
          <div className="flex-1 space-y-6">
            
            {/* PROFILE SETTINGS */}
            <TabsContent value="profile" className="mt-0 space-y-6">
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Update your photo and personal details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-6">
                    <Avatar className="h-24 w-24 border-4 border-gray-50">
                      <AvatarImage src={avatarImage} />
                      <AvatarFallback>VK</AvatarFallback>
                    </Avatar>
                    <Button variant="outline" className="gap-2">
                      <Upload className="h-4 w-4" /> Change Photo
                    </Button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        disabled={disabled}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <Input value={data?.email ?? ""} disabled className="bg-gray-50" />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={disabled}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Input defaultValue="Owner" disabled className="bg-gray-50" />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button
                      className="bg-primary hover:bg-primary/90 text-white gap-2"
                      onClick={handleSave}
                      disabled={disabled || saveMutation.isPending}
                    >
                      <Save className="h-4 w-4" /> Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* BUSINESS SETTINGS */}
            <TabsContent value="business" className="mt-0 space-y-6">
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle>Business Details</CardTitle>
                  <CardDescription>Manage your wholesale business information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Business Name</Label>
                    <Input
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      disabled={disabled}
                    />
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>GSTIN</Label>
                      <Input
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value)}
                        disabled={disabled}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Business type</Label>
                      <Select
                        value={businessType || undefined}
                        onValueChange={setBusinessType}
                        disabled={disabled}
                      >
                        <SelectTrigger className="w-full">
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
                      <p className="text-xs text-gray-500">
                        Shown for your records. Legacy accounts can set this once here.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      disabled={disabled}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>UPI ID (for payments)</Label>
                    <Input defaultValue="diya.business@okicici" />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      className="bg-primary hover:bg-primary/90 text-white gap-2"
                      onClick={handleSave}
                      disabled={disabled || saveMutation.isPending}
                    >
                      <Save className="h-4 w-4" /> Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* NOTIFICATIONS */}
            <TabsContent value="notifications" className="mt-0 space-y-6">
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>Choose how you want to be notified.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">New Orders</Label>
                      <p className="text-sm text-gray-500">Receive alerts when retailers place orders.</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Payment Received</Label>
                      <p className="text-sm text-gray-500">Get notified when payments are made via UPI.</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Low Stock Alerts</Label>
                      <p className="text-sm text-gray-500">Notify when product stock goes below threshold.</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Daily Reports</Label>
                      <p className="text-sm text-gray-500">Receive a daily summary email at 8 PM.</p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* SECURITY */}
            <TabsContent value="security" className="mt-0 space-y-6">
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>Protect your account and data.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      disabled={disabled || passwordSaving}
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={disabled || passwordSaving}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={disabled || passwordSaving}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      className="bg-primary hover:bg-primary/90 text-white gap-2"
                      onClick={handleChangePassword}
                      disabled={disabled || passwordSaving}
                    >
                      {passwordSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Updating…
                        </>
                      ) : (
                        "Update Password"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TALLY INTEGRATION */}
            <TabsContent value="tally" className="mt-0 space-y-6">
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle>Tally Integration</CardTitle>
                  <CardDescription>Verify Tally is running and detect the open company before exporting.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCheckTally}
                    disabled={tallyChecking}
                    className="gap-2"
                  >
                    {tallyChecking ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Checking…
                      </>
                    ) : (
                      "Check Tally Connection"
                    )}
                  </Button>
                  {tallyResult !== null && (
                    <div
                      className={`rounded-lg border p-4 flex items-start gap-3 ${
                        tallyResult.connected
                          ? "bg-green-50 border-green-200 text-green-800"
                          : "bg-red-50 border-red-200 text-red-800"
                      }`}
                    >
                      {tallyResult.connected ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                          <p className="text-sm font-medium">
                            Connected to: {tallyResult.companyName || "Tally"}
                          </p>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
                          <p className="text-sm font-medium">
                            Tally not detected. Ensure Tally is open and HTTP Server is enabled.
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

          </div>
        </div>
      </Tabs>
    </div>
  );
}
