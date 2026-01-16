import { useState } from "react";
import { 
  User, 
  Building, 
  Bell, 
  Lock, 
  CreditCard, 
  HelpCircle,
  Save,
  Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import avatarImage from "@assets/generated_images/professional_business_avatar_for_a_wholesaler.png";

export default function SettingsPage() {
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
                      <Input defaultValue="Vijay Kumar" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <Input defaultValue="vijay.kumar@diya.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input defaultValue="+91 98765 43210" />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Input defaultValue="Owner" disabled className="bg-gray-50" />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
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
                    <Input defaultValue="Diya Wholesalers" />
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>GSTIN</Label>
                      <Input defaultValue="36ABCDE1234F1Z5" />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Input defaultValue="FMCG Distributor" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input defaultValue="Plot No. 45, Industrial Area, Hyderabad" />
                  </div>

                  <div className="space-y-2">
                    <Label>UPI ID (for payments)</Label>
                    <Input defaultValue="diya.business@okicici" />
                  </div>

                  <div className="flex justify-end">
                    <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
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

          </div>
        </div>
      </Tabs>
    </div>
  );
}
