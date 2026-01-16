import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  ShoppingBag, 
  Users, 
  MapPin, 
  Store,
  LayoutDashboard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const checklist = [
  {
    id: 1,
    title: "Add Your Products",
    desc: "Upload your catalog or add items manually.",
    icon: ShoppingBag,
    link: "/business?tab=products"
  },
  {
    id: 2,
    title: "Add Retailers",
    desc: "Invite retailers to start taking orders.",
    icon: Users,
    link: "/retailers"
  },
  {
    id: 3,
    title: "Setup Delivery Areas",
    desc: "Define where you deliver goods.",
    icon: MapPin,
    link: "/business?tab=info"
  },
  {
    id: 4,
    title: "Explore Dashboard",
    desc: "See your business overview.",
    icon: LayoutDashboard,
    link: "/"
  }
];

export default function OnboardingChecklist() {
  const [completed, setCompleted] = useState<number[]>([]);
  const [location, setLocation] = useLocation();

  const toggleComplete = (id: number) => {
    if (completed.includes(id)) {
      setCompleted(completed.filter(i => i !== id));
    } else {
      setCompleted([...completed, id]);
    }
  };

  const progress = (completed.length / checklist.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        <div className="text-center mb-10">
          <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">Welcome to Diya! 👋</h1>
          <p className="text-gray-500">Complete these steps to get your business fully online.</p>
        </div>

        <Card className="border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden mb-8">
          <div className="p-6 bg-white border-b border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-gray-900">Setup Progress</h3>
              <span className="text-sm font-medium text-primary">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          
          <div className="divide-y divide-gray-100">
            {checklist.map((item) => {
              const isDone = completed.includes(item.id);
              return (
                <div 
                  key={item.id} 
                  className={cn(
                    "p-5 flex items-center gap-4 transition-colors hover:bg-gray-50 cursor-pointer group",
                    isDone ? "bg-green-50/30" : "bg-white"
                  )}
                  onClick={() => toggleComplete(item.id)}
                >
                  <div className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center shrink-0 transition-all",
                    isDone ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400 group-hover:border-primary group-hover:text-primary"
                  )}>
                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                  </div>
                  
                  <div className="h-12 w-12 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 text-gray-600">
                    <item.icon className="h-6 w-6" />
                  </div>

                  <div className="flex-1">
                    <h4 className={cn("font-semibold", isDone ? "text-green-900 line-through opacity-70" : "text-gray-900")}>
                      {item.title}
                    </h4>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>

                  <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              );
            })}
          </div>
        </Card>

        <div className="flex justify-center">
          <Link href="/">
            <Button className="h-12 px-8 text-base bg-primary hover:bg-primary/90 shadow-lg shadow-orange-200">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
