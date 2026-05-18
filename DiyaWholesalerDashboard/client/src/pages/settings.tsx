import { useMemo, useRef, useState, useEffect } from "react";
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
  Eye,
  EyeOff,
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
import { useAuth } from "@/context/AuthContext";
import { mergeAuthProfile } from "@/lib/accountProfile";
import api from "@/lib/api";
import { uploadImageUnsignedToCloudinary, validateImageFile } from "@/lib/cloudinary";
import { getGstinValidationError, normalizeGstin } from "@/lib/gstin";

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, setUser } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["wholesaler-settings"],
    queryFn: getWholesalerSettings,
  });

  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [gstin, setGstin] = useState("");
  const [gstinTouched, setGstinTouched] = useState(false);
  const [address, setAddress] = useState("");
  const [businessType, setBusinessType] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!data) return;
    setOwnerName(data.ownerName ?? "");
    setPhone(data.phone ?? "");
    setBusinessName(data.businessName ?? "");
    setEmail(data.email ?? "");
    setGstin(data.gstin ?? "");
    setAddress(data.address ?? "");
    setBusinessType(data.businessType ?? "");

    setUser((prev) =>
      mergeAuthProfile(prev as Record<string, unknown> | null, {
        email: data.email,
        phone: data.phone,
        name: data.ownerName,
      }) as typeof prev,
    );
  }, [data, setUser]);

  const gstinNormalized = normalizeGstin(gstin);
  const gstinError = getGstinValidationError(gstin);

  const saveMutation = useMutation({
    mutationFn: updateWholesalerSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wholesaler-settings"] });
      setUser((prev) =>
        mergeAuthProfile(prev as Record<string, unknown> | null, {
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          name: ownerName.trim() || undefined,
        }) as typeof prev,
      );
      toast({ title: "Settings saved" });
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Could not save settings. Please try again.";
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    },
  });

  const handleSave = () => {
    const trimmedEmail = email.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email (e.g., abc@domain.com).",
        variant: "destructive",
      });
      return;
    }
    if (gstinError) {
      setGstinTouched(true);
      return;
    }
    const payload: Parameters<typeof updateWholesalerSettings>[0] = {
      businessName: businessName || null,
      ownerName: ownerName || null,
      phone: phone || null,
      address: address || null,
      gstin: gstinNormalized || null,
    };
    // Only send email when user explicitly set it (avoid wiping).
    if (trimmedEmail) payload.email = trimmedEmail;
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

  const currentAvatarUrl = (user as any)?.avatarUrl as string | undefined;
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState<number>(0);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const avatarDisplayUrl = avatarPreviewUrl || currentAvatarUrl || avatarImage;

  const avatarInitials = useMemo(() => {
    const base = ownerName || data?.ownerName || data?.businessName || "Account";
    const parts = String(base).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "A";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [ownerName, data?.ownerName, data?.businessName]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    };
  }, [avatarPreviewUrl]);

  const handleSelectAvatar = (file: File | null) => {
    setAvatarError(null);
    if (!file) {
      setAvatarFile(null);
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
      setAvatarPreviewUrl(null);
      return;
    }

    const err = validateImageFile(file);
    if (err) {
      setAvatarError(err);
      setAvatarFile(null);
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
      setAvatarPreviewUrl(null);
      return;
    }

    setAvatarFile(file);
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    setAvatarPreviewUrl(URL.createObjectURL(file));
  };

  const uploadAvatarToCloudinary = async () => {
    if (!avatarFile) return;
    setAvatarError(null);
    setAvatarUploading(true);
    setAvatarProgress(0);

    try {
      const { secureUrl } = await uploadImageUnsignedToCloudinary({
        file: avatarFile,
        onProgress: (p) => setAvatarProgress(p),
      });

      await api.put("/users/me/avatar", { avatarUrl: secureUrl });
      setUser(user ? ({ ...(user as any), avatarUrl: secureUrl } as any) : user);
      toast({ title: "Profile photo updated" });
      setAvatarFile(null);
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
      setAvatarPreviewUrl(null);
      setAvatarProgress(0);
    } catch (e: any) {
      setAvatarError(e?.message || "Upload failed. Please try again.");
      toast({ title: "Upload failed", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setAvatarUploading(false);
    }
  };

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
                      <AvatarImage src={avatarDisplayUrl} />
                      <AvatarFallback>{avatarInitials}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => handleSelectAvatar(e.target.files?.[0] ?? null)}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={avatarUploading}
                        >
                          <Upload className="h-4 w-4" /> {avatarFile ? "Change photo" : "Select photo"}
                        </Button>
                        <Button
                          type="button"
                          className="bg-primary hover:bg-primary/90 text-white gap-2"
                          onClick={uploadAvatarToCloudinary}
                          disabled={!avatarFile || avatarUploading}
                        >
                          {avatarUploading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" /> Uploading{avatarProgress ? ` (${avatarProgress}%)` : "…"}
                            </>
                          ) : (
                            "Upload"
                          )}
                        </Button>
                      </div>
                      {avatarPreviewUrl && (
                        <p className="text-xs text-gray-500">
                          Previewing selected image. Click <span className="font-medium">Upload</span> to save.
                        </p>
                      )}
                      {avatarError && <p className="text-xs text-red-600">{avatarError}</p>}
                    </div>
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
                      <Input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={disabled}
                        placeholder="abc@domain.com"
                      />
                      {email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && (
                        <p className="text-xs text-red-600">Please enter a valid email address.</p>
                      )}
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
                        value={gstinNormalized}
                        onChange={(e) => setGstin(e.target.value.toUpperCase())}
                        onBlur={() => setGstinTouched(true)}
                        disabled={disabled}
                        placeholder="22AAAAA0000A1Z5"
                        className="uppercase"
                        maxLength={15}
                      />
                      {gstinTouched && gstinError && (
                        <p className="text-xs text-red-600">{gstinError}</p>
                      )}
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
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        disabled={disabled || passwordSaving}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0.5 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowCurrentPassword((v) => !v)}
                        disabled={disabled || passwordSaving}
                        aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          autoComplete="new-password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          disabled={disabled || passwordSaving}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0.5 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowNewPassword((v) => !v)}
                          disabled={disabled || passwordSaving}
                          aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          disabled={disabled || passwordSaving}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0.5 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowConfirmPassword((v) => !v)}
                          disabled={disabled || passwordSaving}
                          aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
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
