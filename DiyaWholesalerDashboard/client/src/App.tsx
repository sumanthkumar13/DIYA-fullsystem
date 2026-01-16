import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Layout } from "@/components/layout/Layout";
import Dashboard from "@/pages/dashboard";
import Orders from "@/pages/orders";
import OrderDetail from "@/pages/order-detail";
import Retailers from "@/pages/retailers";
import RetailerProfile from "@/pages/retailer-profile";
import Khatabook from "@/pages/khatabook";
import MyBusiness from "@/pages/business";
import Analytics from "@/pages/analytics";
import SettingsPage from "@/pages/settings";
import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import SignupFlow from "@/pages/signup";
import OnboardingChecklist from "@/pages/onboarding";
import NotFound from "@/pages/not-found";
import AddProductPage from "@/pages/product-new";
import CategoriesPage from "@/pages/categories";
import CategoryDetailPage from "./pages/CategoryDetailPage";
import ConnectionRequestsPage from "@/pages/connection-requests";


function AppLayout({ children }: { children: React.ReactNode }) {
  return <Layout>{children}</Layout>;
}

function Router() {
  return (
    <Switch>
      {/* Default Landing Page */}
      <Route path="/">
        <LandingPage />
      </Route>

      {/* Public Routes */}
      <Route path="/landing" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupFlow} />
      <Route path="/onboarding" component={OnboardingChecklist} />

      <Route path="/products/new">
        <AppLayout>
          <AddProductPage />
        </AppLayout>
      </Route>

      {/* App Routes (Wrapped in Layout) */}
      <Route path="/dashboard">
        <AppLayout>
          <Dashboard />
        </AppLayout>
      </Route>
      <Route path="/connection-requests">
        <AppLayout>
          <ConnectionRequestsPage />
        </AppLayout>
      </Route>

      <Route path="/categories">
        <AppLayout>
          <CategoriesPage />
        </AppLayout>
      </Route>

      <Route path="/categories/:categoryId" component={CategoryDetailPage} />

      <Route path="/orders">
        <AppLayout>
          <Orders />
        </AppLayout>
      </Route>

      <Route path="/orders/:id">
        {(params) => (
          <AppLayout>
            <OrderDetail />
          </AppLayout>
        )}
      </Route>

      <Route path="/retailers">
        <AppLayout>
          <Retailers />
        </AppLayout>
      </Route>

      <Route path="/retailers/:id">
        {(params) => (
          <AppLayout>
            <RetailerProfile />
          </AppLayout>
        )}
      </Route>

      <Route path="/khatabook">
        <AppLayout>
          <Khatabook />
        </AppLayout>
      </Route>

      <Route path="/business">
        <AppLayout>
          <MyBusiness />
        </AppLayout>
      </Route>

      <Route path="/analytics">
        <AppLayout>
          <Analytics />
        </AppLayout>
      </Route>

      <Route path="/settings">
        <AppLayout>
          <SettingsPage />
        </AppLayout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
