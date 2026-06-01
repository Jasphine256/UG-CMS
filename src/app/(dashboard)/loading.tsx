import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-48"/>
        <Skeleton className="h-4 w-64"/>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1,2,3,4].map(i=><Skeleton key={i} className="h-24"/>)}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-80"/>
        <Skeleton className="h-80"/>
      </div>
    </div>
  );
}
