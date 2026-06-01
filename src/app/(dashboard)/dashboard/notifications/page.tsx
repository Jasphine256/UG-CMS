"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Bell, CheckCheck, Mail, Smartphone, Clock } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Record<string,unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/notifications?limit=50");
    const d = await res.json();
    if (d.success) {
      setNotifications(d.data);
      setUnreadCount(d.data.filter((n:Record<string,unknown>)=>!n.isRead).length);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method:"PATCH" });
    fetchData();
  }

  async function markAllRead() {
    await fetch("/api/notifications/read-all", { method:"POST" });
    toast.success("All marked as read");
    fetchData();
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Notifications" description="Stay updated on case activity">
        {unreadCount > 0 && <Button variant="outline" size="sm" onClick={markAllRead}><CheckCheck className="h-4 w-4"/> Mark All Read</Button>}
      </PageHeader>

      <Card className="border-card-border">
        <CardContent className="p-0">
          {loading ? <div className="space-y-3 p-6">{[1,2,3,4].map(i=><Skeleton key={i} className="h-16 w-full"/>)}</div> : notifications.length===0 ? (
            <div className="py-16 text-center"><Bell className="mx-auto h-10 w-10 text-muted-more"/><p className="mt-3 text-muted">No notifications yet</p></div>
          ) : (
            <div className="divide-y divide-surface-100">
              {notifications.map((n:Record<string,unknown>) => (
                <div key={n.id as string} className={cn("flex items-start gap-4 px-6 py-4 transition-colors hover:bg-app cursor-pointer", !n.isRead && "bg-blue-50/30")} onClick={()=>markRead(n.id as string)}>
                  <div className={cn("shrink-0 flex h-9 w-9 items-center justify-center rounded-lg", !n.isRead ? "bg-primary-100 text-primary-600" : "bg-app-hover text-muted")}>
                    {n.channel==="EMAIL" ? <Mail className="h-4 w-4"/> : n.channel==="SMS" ? <Smartphone className="h-4 w-4"/> : <Bell className="h-4 w-4"/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn("text-sm", !n.isRead && "font-semibold text-main")}>{String(n.title)}</p>
                      {!n.isRead && <div className="h-2 w-2 rounded-full bg-primary-500"/>}
                    </div>
                    {Boolean(n.body) && <p className="text-xs text-muted mt-0.5">{String(n.body)}</p>}
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-more">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3"/> {new Date(n.sentAt as string).toLocaleString()}</span>
                      <Badge variant="secondary" size="sm">{String(n.type)}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
