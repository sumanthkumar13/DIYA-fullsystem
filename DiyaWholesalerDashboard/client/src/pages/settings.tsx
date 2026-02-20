import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  getWholesalerSettings,
  updateWholesalerSettings,
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

  useEffect(() => {
    if (!data) return;
    setOwnerName(data.ownerName ?? "");
    setPhone(data.phone ?? "");
    setBusinessName(data.businessName ?? "");
    setGstin(data.gstin ?? "");
    setAddress(data.address ?? "");
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: updateWholesalerSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wholesaler-settings"] });
      toast({ title: "Settings saved" });
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      businessName: businessName || null,
      ownerName: ownerName || null,
      phone: phone || null,
      address: address || null,
      gstin: gstin || null,
    });
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
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Input defaultValue="FMCG Distributor" />
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
                    <Label>Current Password</Label>
                    <Input type="password" />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>New Password</Label>
                      <Input type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label>Confirm New Password</Label>
                      <Input type="password" />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
                      Update Password
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
