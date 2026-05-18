import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardActivity } from "@/hooks/useDashboard";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Clock, Package, Users } from "lucide-react";

export default function ActivityPage() {
  const { data: activity, isLoading, isError } = useDashboardActivity();

  return (
    <div className="space-y-6 pb-2">
      <div className="space-y-1">
        <h1 className="text-2xl font-display font-bold text-gray-900">Activity</h1>
        <p className="text-sm text-gray-500">All recent activity across orders, payments, and retailers.</p>
      </div>

      <Card className="border-none shadow-sm bg-white">
        <CardHeader className="border-b border-gray-100 pb-3">
          <CardTitle className="text-base font-semibold flex items-center justify-between">
            Recent Activity
            <Badge variant="secondary" className="text-xs font-normal">
              Live
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y divide-gray-50">
            {isLoading && (
              <div className="p-6 text-center text-sm text-gray-500">Loading activity…</div>
            )}
            {isError && !isLoading && (
              <div className="p-6 text-center text-sm text-red-600">
                Could not load activity. Please refresh and try again.
              </div>
            )}
            {!isLoading && !isError && !activity?.length && (
              <div className="p-6 text-center text-sm text-gray-500">No activity yet.</div>
            )}
            {!isLoading &&
              !isError &&
              activity?.map((item: any, index: number) => (
                <ActivityRow
                  key={index}
                  title={item.title}
                  subtitle={item.subtitle}
                  time={item.timeAgo}
                  icon={resolveIcon(item.type)}
                  iconBg={resolveColor(item.type)}
                />
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ActivityRow({ title, subtitle, time, icon: Icon, iconBg }: any) {
  return (
    <div className="p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors">
      <div className={cn("h-9 w-9 rounded-full flex items-center justify-center shrink-0 mt-0.5", iconBg)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5 break-words">{subtitle}</p>
      </div>
      <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">{time}</span>
    </div>
  );
}

function resolveIcon(type: string) {
  switch (type) {
    case "ORDER":
      return Package;
    case "PAYMENT":
      return CheckCircle2;
    case "OVERDUE":
      return AlertCircle;
    case "RETAILER":
      return Users;
    default:
      return Clock;
  }
}

function resolveColor(type: string) {
  switch (type) {
    case "ORDER":
      return "bg-blue-100 text-blue-600";
    case "PAYMENT":
      return "bg-green-100 text-green-600";
    case "OVERDUE":
      return "bg-red-100 text-red-600";
    case "RETAILER":
      return "bg-purple-100 text-purple-600";
    case "TREND":
      return "bg-indigo-100 text-indigo-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
}
