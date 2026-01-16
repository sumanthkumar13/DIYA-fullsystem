import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  ArrowRight, 
  CheckCircle2, 
  LayoutDashboard, 
  Truck, 
  Users, 
  Smartphone, 
  CreditCard, 
  BarChart3,
  Menu,
  X,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import heroImage from "@assets/generated_images/minimal_b2b_wholesale_business_illustration.png";
import orderingMockup from "@assets/generated_images/retailer_app_ordering_screen_mockup.png";
import paymentMockup from "@assets/generated_images/retailer_app_payment_screen_mockup.png";

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* Navigation */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b",
        isScrolled ? "bg-white/95 backdrop-blur-md border-gray-200 py-3 shadow-sm" : "bg-transparent border-transparent py-5"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🪔</span>
            <span className="text-2xl font-display font-bold text-gray-900 tracking-tight">Diya</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">Features</a>
            <a href="#solution" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">Solutions</a>
            <a href="#retailer-app" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">Retailer App</a>
            <Link href="/login">
              <Button variant="ghost" className="text-gray-900 hover:text-primary font-medium">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-orange-200 transition-all hover:scale-105">
                Get Started
              </Button>
            </Link>
          </div>

          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-200 p-4 shadow-lg flex flex-col gap-4 animate-in slide-in-from-top-5">
            <a href="#features" className="text-sm font-medium text-gray-600 py-2">Features</a>
            <a href="#solution" className="text-sm font-medium text-gray-600 py-2">Solutions</a>
            <a href="#retailer-app" className="text-sm font-medium text-gray-600 py-2">Retailer App</a>
            <Link href="/login">
              <Button variant="outline" className="w-full justify-center">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button className="w-full justify-center bg-primary text-white">Get Started</Button>
            </Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 via-white to-blue-50/30 -z-10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100 px-4 py-1.5 text-sm font-medium rounded-full border-orange-200">
                🚀 New: Diya Retailer App is here
              </Badge>
              <h1 className="text-5xl lg:text-7xl font-display font-bold text-gray-900 leading-[1.1] tracking-tight">
                Bring <span className="text-primary relative inline-block">
                  Diya
                  <span className="absolute inset-0 blur-xl bg-orange-400/30 -z-10"></span>
                </span> to Your Business
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed max-w-lg">
                India’s most intuitive digital platform for wholesalers to manage orders, payments, transport, and retailers — all in one place.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Link href="/signup">
                  <Button size="lg" className="h-14 px-8 text-lg bg-primary hover:bg-primary/90 text-white shadow-xl shadow-orange-200/50 transition-all hover:scale-105 group">
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-gray-300 hover:bg-gray-50 hover:text-gray-900">
                  Watch Demo
                </Button>
              </div>
              <div className="flex items-center gap-6 pt-4 text-sm text-gray-500 font-medium">
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> No Setup Fees</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> Setup in 2 mins</span>
              </div>
            </div>
            <div className="relative animate-in fade-in zoom-in duration-1000 delay-200">
              <div className="absolute inset-0 bg-gradient-to-tr from-orange-200/20 to-blue-200/20 rounded-full blur-3xl -z-10 transform translate-x-10 translate-y-10" />
              <img 
                src={heroImage} 
                alt="Diya Dashboard Illustration" 
                className="w-full h-auto rounded-2xl shadow-2xl border border-white/50 backdrop-blur-sm transform hover:scale-[1.02] transition-transform duration-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories Scroller */}
      <section className="py-12 border-y border-gray-100 bg-gray-50/50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <h3 className="text-lg font-semibold text-gray-900">Who We Serve</h3>
        </div>
        <div className="flex gap-6 animate-scroll overflow-x-auto no-scrollbar px-4 sm:px-6 lg:px-8 pb-4 -mx-4 sm:-mx-6 lg:-mx-8">
           {[
             "Plumbing & Sanitary", "Electrical & Hardware", "Construction Material", 
             "Pumps & Borewell", "FMCG Distributor", "General Kirana", 
             "Medical & Pharma", "Garments & Textiles", "Agri Products"
           ].map((cat, i) => (
             <div key={i} className="flex-none w-64 p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 cursor-default">
                <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center text-primary mb-3">
                   <LayoutDashboard className="h-5 w-5" />
                </div>
                <p className="font-semibold text-gray-900">{cat}</p>
             </div>
           ))}
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-24 bg-gray-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">The Wholesale Reality</h2>
            <p className="text-gray-400 text-lg">Running a wholesale business is hard. Manual processes are slowing you down.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "Missed Orders", desc: "Lost on WhatsApp chats & calls", icon: X },
              { title: "Credit Confusion", desc: "Who owes what? No clear tracking", icon: CreditCard },
              { title: "Retailer Delays", desc: "Chasing payments endlessly", icon: Users },
            ].map((item, i) => (
              <div key={i} className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
                <item.icon className="h-8 w-8 text-orange-500 mb-4" />
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section id="solution" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <Badge variant="outline" className="mb-4 border-primary/20 text-primary bg-primary/5">The Diya Solution</Badge>
            <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">A Complete Business OS</h2>
            <p className="text-xl text-gray-600">Everything you need to modernize your distribution business.</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-12">
            <SolutionCard 
              title="Smart Orders"
              desc="Clean workflows from request to delivery. No more missed WhatsApp messages."
              icon={LayoutDashboard}
              color="text-blue-600"
              bg="bg-blue-50"
            />
            <SolutionCard 
              title="Payments & Ledger"
              desc="UPI integration with auto-reconciliation. Know exactly who owes what."
              icon={CreditCard}
              color="text-green-600"
              bg="bg-green-50"
            />
            <SolutionCard 
              title="Transport & Delivery"
              desc="Manage delivery routes and track shipments in real-time."
              icon={Truck}
              color="text-orange-600"
              bg="bg-orange-50"
            />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16">
            <h2 className="text-3xl font-display font-bold text-gray-900 mb-4">Power-packed Features</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              "Order Lifecycle Mgmt", "Khatabook Auto-Ledger", "UPI Payment Gateway", "Delivery Route Control",
              "Retailer Insights", "Location Analytics", "Catalog Import (Excel)", "Staff Management"
            ].map((feat, i) => (
              <div key={i} className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
                <CheckCircle2 className="h-6 w-6 text-primary mb-3" />
                <h4 className="font-semibold text-gray-900">{feat}</h4>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Retailer App Section */}
      <section id="retailer-app" className="py-24 bg-gray-900 text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
               <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-sm font-medium border border-orange-500/30">
                 <Smartphone className="h-4 w-4" /> DiyaRetailer App
               </div>
               <h2 className="text-4xl lg:text-5xl font-display font-bold leading-tight">
                 Your Retailers Get Their Own App
               </h2>
               <p className="text-xl text-gray-400 leading-relaxed">
                 A powerful, simple mobile app that lets your retailers place orders, track payments, and stay synced with your business — 24/7.
               </p>
               
               <ul className="space-y-4">
                 {[
                   "Browse your full catalog", "Add to cart instantly", "Track order status", "Pay via UPI", "Download invoices"
                 ].map((item, i) => (
                   <li key={i} className="flex items-center gap-3 text-gray-300">
                     <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                       <CheckCircle2 className="h-4 w-4" />
                     </div>
                     {item}
                   </li>
                 ))}
               </ul>

               <div className="pt-4">
                 <p className="text-sm text-gray-500 font-medium mb-4 uppercase tracking-wider">Ask your retailers to download</p>
                 <div className="flex flex-wrap gap-4">
                   <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100 h-14 px-6 gap-3 rounded-full">
                      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current"><path d="M3.609 1.814L13.792 12 3.61 22.186c-.184-.065-.347-.176-.461-.332-.047-.064-.085-.134-.11-.208l-.014-.042C3.01 21.554 3 21.504 3 21.45V2.55c0-.054.01-.104.025-.153.025-.074.063-.144.11-.208.114-.156.277-.267.461-.332l.013-.043zM15.317 13.525l4.21 4.21-1.858 1.06c-.52.297-1.162.297-1.682 0l-.67-.382-4.21-4.21 4.21-4.21.67-.382c.52-.297 1.162-.297 1.682 0l1.858 1.06-4.21 4.21zM14.554 11.237l-5.53-5.53L4.72 2.097c.412-.32 1.004-.307 1.47.13l8.364 9.01zm-5.53 1.526l5.53-5.53 8.364 9.01c-.466.437-1.058.45-1.47.13l-4.304-3.61z"/></svg>
                      Get on Google Play
                   </Button>
                   <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 h-14 px-6 gap-3 rounded-full">
                      Coming to App Store
                   </Button>
                 </div>
               </div>
            </div>
            
            <div className="relative flex justify-center lg:justify-end items-center gap-6">
               <img 
                 src={orderingMockup} 
                 alt="Ordering Screen" 
                 className="w-[260px] rounded-[2.5rem] border-8 border-gray-800 shadow-2xl transform rotate-[-6deg] hover:rotate-0 transition-transform duration-500 z-10"
               />
               <img 
                 src={paymentMockup} 
                 alt="Payment Screen" 
                 className="w-[260px] rounded-[2.5rem] border-8 border-gray-800 shadow-2xl transform translate-y-12 rotate-[6deg] hover:rotate-0 transition-transform duration-500"
               />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🪔</span>
            <span className="text-xl font-display font-bold text-gray-900">Diya</span>
          </div>
          <div className="flex gap-8 text-sm text-gray-500">
            <a href="#" className="hover:text-primary transition-colors">About</a>
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Contact</a>
          </div>
          <p className="text-sm text-gray-400">© 2025 Diya Technologies. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function SolutionCard({ title, desc, icon: Icon, color, bg }: any) {
  return (
    <div className="group p-8 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-xl hover:shadow-gray-200/50 transition-all hover:-translate-y-1">
      <div className={cn("h-14 w-14 rounded-xl flex items-center justify-center mb-6 transition-colors group-hover:scale-110 duration-300", bg, color)}>
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{desc}</p>
    </div>
  );
}
//hel