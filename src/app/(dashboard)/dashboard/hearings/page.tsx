"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";
import { toast } from "sonner";
import { Plus, Calendar, Clock, MapPin, Pause, FileText } from "lucide-react";

interface Hearing {
  id: string; hearingType: string; hearingDate: string; outcome?: string; notes?: string;
  isAdjourned: boolean; adjournmentReason?: string; nextHearingDate?: string;
  case: { id: string; caseNumber: string; title: string; caseType: string };
  court: { id: string; name: string };
  courtSession?: { id: string; name: string } | null;
}

const HEARING_TYPES = [
  { value: "", label: "All Types" },
  { value: "FIRST_MENTION", label: "First Mention" }, { value: "PLEA_TAKING", label: "Plea Taking" },
  { value: "BAIL_HEARING", label: "Bail Hearing" }, { value: "CASE_MANAGEMENT_CONFERENCE", label: "CMC" },
  { value: "TRIAL", label: "Trial" }, { value: "SENTENCING", label: "Sentencing" },
  { value: "JUDGMENT", label: "Judgment" }, { value: "APPEAL_HEARING", label: "Appeal Hearing" },
];

export default function HearingsPage() {
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);
  const [adjournHearing, setAdjournHearing] = useState<Hearing | null>(null);
  const [outcomeHearing, setOutcomeHearing] = useState<Hearing | null>(null);
  const [courts, setCourts] = useState<{ value: string; label: string }[]>([]);
  const [sessions, setSessions] = useState<{ value: string; label: string }[]>([]);

  const [form, setForm] = useState({ caseId: "", hearingType: "FIRST_MENTION", hearingDate: "", courtId: "", courtSessionId: "", notes: "" });
  const [adjForm, setAdjForm] = useState({ nextHearingDate: "", reason: "" });
  const [outcomeForm, setOutcomeForm] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchHearings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "30" });
    if (date) params.set("date", date);
    const res = await fetch(`/api/hearings?${params}`);
    const data = await res.json();
    if (data.success) setHearings(data.data);
    setLoading(false);
  }, [date]);

  useEffect(() => { fetchHearings(); }, [fetchHearings]);
  useEffect(() => {
    fetch("/api/courts").then(r => r.json()).then(d => {
      if (d.success) setCourts(d.data.map((c: { id: string; name: string }) => ({ value: c.id, label: c.name })));
    });
    fetch("/api/sessions?status=SCHEDULED").then(r => r.json()).then(d => {
      if (d.success) setSessions(d.data.map((s: { id: string; name: string }) => ({ value: s.id, label: s.name })));
    });
  }, []);

  async function scheduleHearing() {
    if (!form.caseId || !form.hearingDate || !form.courtId) { toast.error("Fill required fields"); return; }
    setSaving(true);
    const res = await fetch("/api/hearings/create", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.success) { toast.success("Hearing scheduled"); setShowSchedule(false); fetchHearings(); }
    else toast.error(data.error);
    setSaving(false);
  }

  async function handleAdjourn() {
    if (!adjournHearing) return;
    setSaving(true);
    const res = await fetch(`/api/hearings/${adjournHearing.id}/adjourn`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(adjForm),
    });
    const data = await res.json();
    if (data.success) { toast.success("Hearing adjourned"); setAdjournHearing(null); fetchHearings(); }
    setSaving(false);
  }

  async function recordOutcome() {
    if (!outcomeHearing) return;
    setSaving(true);
    const res = await fetch(`/api/hearings/${outcomeHearing.id}/outcome`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome: outcomeForm }),
    });
    const data = await res.json();
    if (data.success) { toast.success("Outcome recorded"); setOutcomeHearing(null); fetchHearings(); }
    setSaving(false);
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Hearings" description="Court hearing calendar and scheduling">
        <Button onClick={() => setShowSchedule(true)}><Plus className="h-4 w-4" /> Schedule Hearing</Button>
      </PageHeader>

      {/* Date filter */}
      <div className="mb-4 flex items-center gap-3">
        <Input id="filterDate" type="date" value={date} onChange={e => setDate(e.target.value)} className="max-w-[200px]" />
        {date && <Button variant="ghost" size="sm" onClick={() => setDate("")}>Clear</Button>}
      </div>

      {/* Hearings list */}
      <Card className="border-card-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : hearings.length === 0 ? (
            <div className="py-16 text-center">
              <Calendar className="mx-auto h-10 w-10 text-muted-more" />
              <p className="mt-3 text-muted">{date ? "No hearings on this date" : "No hearings scheduled"}</p>
            </div>
          ) : (
            <div className="divide-y divide-surface-100">
              {hearings.map(h => (
                <div key={h.id} className={cn("flex items-center gap-4 px-6 py-4 transition-colors hover:bg-app", h.isAdjourned && "opacity-60")}>
                  <div className="shrink-0 w-20 text-center">
                    <p className="text-lg font-bold text-main">{new Date(h.hearingDate).getDate()}</p>
                    <p className="text-xs text-muted">{new Date(h.hearingDate).toLocaleDateString("en", { month: "short", year: "numeric" })}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-main truncate">{h.case.caseNumber}</p>
                      <Badge variant="secondary" size="sm">{h.hearingType.replace(/_/g, " ")}</Badge>
                      {h.isAdjourned && <Badge variant="warning" size="sm">Adjourned</Badge>}
                    </div>
                    <p className="text-sm text-secondary truncate">{h.case.title}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-more">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {h.court.name}</span>
                      {h.courtSession && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {h.courtSession.name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!h.outcome && !h.isAdjourned && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setAdjournHearing(h)}><Pause className="h-3 w-3" /> Adjourn</Button>
                        <Button size="sm" variant="default" onClick={() => { setOutcomeHearing(h); setOutcomeForm(""); }}><FileText className="h-3 w-3" /> Outcome</Button>
                      </>
                    )}
                    {h.outcome && <p className="text-sm text-secondary max-w-[200px] truncate">{h.outcome}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Hearing Dialog */}
      {showSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowSchedule(false)}>
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-main">Schedule Hearing</h3>
            <div className="mt-4 space-y-3">
              <Input id="hCaseId" label="Case ID *" placeholder="Enter case ID" value={form.caseId} onChange={e => setForm(f => ({ ...f, caseId: e.target.value }))} />
              <Select id="hType" label="Hearing Type" options={HEARING_TYPES.filter(o => o.value !== "")} value={form.hearingType} onChange={e => setForm(f => ({ ...f, hearingType: e.target.value }))} />
              <Input id="hDate" label="Hearing Date *" type="date" value={form.hearingDate} onChange={e => setForm(f => ({ ...f, hearingDate: e.target.value }))} />
              <Select id="hCourt" label="Court *" options={[{ value: "", label: "Select..." }, ...courts]} value={form.courtId} onChange={e => setForm(f => ({ ...f, courtId: e.target.value }))} />
              <Select id="hSession" label="Court Session" options={[{ value: "", label: "None" }, ...sessions]} value={form.courtSessionId} onChange={e => setForm(f => ({ ...f, courtSessionId: e.target.value }))} />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowSchedule(false)}>Cancel</Button>
              <Button onClick={scheduleHearing} loading={saving}>Schedule</Button>
            </div>
          </div>
        </div>
      )}

      {/* Adjourn Dialog */}
      {adjournHearing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setAdjournHearing(null)}>
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-main">Adjourn Hearing</h3>
            <p className="text-sm text-muted">{adjournHearing.case.caseNumber}</p>
            <div className="mt-4 space-y-3">
              <Input id="adjDate" label="Next Hearing Date *" type="date" value={adjForm.nextHearingDate} onChange={e => setAdjForm(f => ({ ...f, nextHearingDate: e.target.value }))} />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-secondary">Reason</label>
                <textarea className="flex w-full rounded-lg border border-input-border px-3 py-2 text-sm" rows={2} value={adjForm.reason} onChange={e => setAdjForm(f => ({ ...f, reason: e.target.value }))} />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setAdjournHearing(null)}>Cancel</Button>
              <Button onClick={handleAdjourn} loading={saving}>Adjourn</Button>
            </div>
          </div>
        </div>
      )}

      {/* Outcome Dialog */}
      {outcomeHearing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOutcomeHearing(null)}>
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-main">Record Outcome</h3>
            <p className="text-sm text-muted">{outcomeHearing.case.caseNumber}</p>
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-secondary">Outcome</label>
              <textarea className="flex w-full rounded-lg border border-input-border px-3 py-2 text-sm" rows={3} value={outcomeForm} onChange={e => setOutcomeForm(e.target.value)} placeholder="e.g., Accused remanded until next hearing. Witness testimony recorded." />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setOutcomeHearing(null)}>Cancel</Button>
              <Button onClick={recordOutcome} loading={saving}>Record Outcome</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
