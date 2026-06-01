"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";
import { toast } from "sonner";
import { Landmark, Plus, ChevronRight, Calendar } from "lucide-react";

interface Court {
  id: string; name: string; code: string; level: string; location: string; parentCourtId?: string | null;
  subCourts?: Court[];
}

interface Session {
  id: string; name: string; startDate: string; endDate: string; status: string; sessionType: string;
  _count?: { hearings: number };
  presidingJudge?: { id: string; firstName: string; lastName: string } | null;
}

const LEVEL_LABELS: Record<string, string> = {
  SUPREME: "Supreme Court", COURT_OF_APPEAL: "Court of Appeal", HIGH_COURT: "High Court",
  CHIEF_MAGISTRATE: "Chief Magistrate", MAGISTRATE_GRADE_I: "Magistrate Grade I",
  MAGISTRATE_GRADE_II: "Magistrate Grade II", LC_III: "LC III", LC_II: "LC II", LC_I: "LC I",
};

export default function CourtsPage() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionForm, setSessionForm] = useState({ name: "", startDate: "", endDate: "", sessionType: "CRIMINAL_SESSION", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/courts").then(r => r.json()).then(d => {
      if (d.success) setCourts(d.data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedCourt) return;
    setSessionsLoading(true);
    fetch(`/api/courts/${selectedCourt.id}/sessions`).then(r => r.json()).then(d => {
      if (d.success) setSessions(d.data);
      setSessionsLoading(false);
    });
  }, [selectedCourt]);

  async function createSession() {
    if (!selectedCourt || !sessionForm.name || !sessionForm.startDate) return;
    setSaving(true);
    const res = await fetch(`/api/courts/${selectedCourt.id}/sessions`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sessionForm),
    });
    const data = await res.json();
    if (data.success) {
      toast.success("Session created");
      setShowSessionForm(false);
      setSessionForm({ name: "", startDate: "", endDate: "", sessionType: "CRIMINAL_SESSION", notes: "" });
      // Refresh sessions
      const r = await fetch(`/api/courts/${selectedCourt.id}/sessions`);
      const d = await r.json();
      if (d.success) setSessions(d.data);
    }
    setSaving(false);
  }

  // Build hierarchy tree
  const topCourts = courts.filter(c => !c.parentCourtId);
  const children = (parentId: string) => courts.filter(c => c.parentCourtId === parentId);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Courts" description="Manage court hierarchy and sessions" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Court hierarchy */}
        <Card className="border-card-border">
          <CardHeader>
            <h3 className="font-semibold text-main">Court Hierarchy</h3>
            <p className="text-xs text-muted">{courts.length} courts</p>
          </CardHeader>
          <CardContent className="space-y-1 p-2">
            {loading ? [1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />) : topCourts.map(court => (
              <div key={court.id}>
                <button
                  onClick={() => setSelectedCourt(court)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg p-3 text-left transition-colors",
                    selectedCourt?.id === court.id ? "bg-primary-50 text-primary-700" : "hover:bg-app text-secondary"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", selectedCourt?.id === court.id ? "bg-primary-100" : "bg-app-hover")}>
                      <Landmark className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{court.name}</p>
                      <p className="text-xs text-muted-more">{court.code} · {LEVEL_LABELS[court.level] || court.level}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 opacity-30" />
                </button>
                {children(court.id).map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedCourt(sub)}
                    className={cn(
                      "ml-8 flex w-[calc(100%-2rem)] items-center justify-between rounded-lg p-2.5 text-left transition-colors",
                      selectedCourt?.id === sub.id ? "bg-primary-50 text-primary-700" : "hover:bg-app text-secondary"
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium">{sub.name}</p>
                      <p className="text-xs text-muted-more">{sub.code}</p>
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Sessions */}
        <Card className="border-card-border lg:col-span-2">
          {selectedCourt ? (
            <>
              <CardHeader>
                <div className="flex items-start justify-between w-full">
                  <div>
                    <h3 className="font-semibold text-main">{selectedCourt.name}</h3>
                    <p className="text-xs text-muted">{selectedCourt.code} · {selectedCourt.location}</p>
                  </div>
                  <Button size="sm" onClick={() => setShowSessionForm(true)}><Plus className="h-3 w-3" /> Session</Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Session form */}
                {showSessionForm && (
                  <div className="mb-4 rounded-lg border border-primary-200 bg-primary-50/30 p-4 space-y-3">
                    <Input id="sName" label="Session Name *" placeholder="e.g., Criminal Session Q1 2025" value={sessionForm.name} onChange={e => setSessionForm(f => ({ ...f, name: e.target.value }))} />
                    <div className="grid grid-cols-2 gap-3">
                      <Input id="sStart" label="Start Date *" type="date" value={sessionForm.startDate} onChange={e => setSessionForm(f => ({ ...f, startDate: e.target.value }))} />
                      <Input id="sEnd" label="End Date" type="date" value={sessionForm.endDate} onChange={e => setSessionForm(f => ({ ...f, endDate: e.target.value }))} />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setShowSessionForm(false)}>Cancel</Button>
                      <Button size="sm" onClick={createSession} loading={saving}>Create Session</Button>
                    </div>
                  </div>
                )}

                {sessionsLoading ? (
                  <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
                ) : sessions.length === 0 ? (
                  <div className="py-8 text-center text-muted-more">No sessions yet</div>
                ) : (
                  <div className="space-y-3">
                    {sessions.map(s => (
                      <div key={s.id} className="flex items-center justify-between rounded-lg border border-card-border p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                            <Calendar className="h-4 w-4 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-main">{s.name}</p>
                            <p className="text-xs text-muted">
                              {new Date(s.startDate).toLocaleDateString()} – {new Date(s.endDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={s.status === "ACTIVE" ? "success" : s.status === "SCHEDULED" ? "info" : "secondary"}>{s.status}</Badge>
                          <p className="text-xs text-muted-more">{s._count?.hearings || 0} hearings</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center py-16">
              <div className="text-center">
                <Landmark className="mx-auto h-10 w-10 text-muted-more" />
                <p className="mt-3 text-sm text-muted">Select a court to view sessions</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
