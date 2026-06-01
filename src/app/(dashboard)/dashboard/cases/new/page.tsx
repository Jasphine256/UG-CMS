"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

const CASE_TYPES = [
  { value: "CRIMINAL", label: "Criminal" },
  { value: "CIVIL", label: "Civil" },
  { value: "FAMILY", label: "Family" },
  { value: "LAND", label: "Land" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "ANTI_CORRUPTION", label: "Anti-Corruption" },
];

const PARTY_TYPES = [
  { value: "COMPLAINANT", label: "Complainant" },
  { value: "VICTIM", label: "Victim" },
  { value: "ACCUSED", label: "Accused" },
  { value: "DEFENDANT", label: "Defendant" },
  { value: "WITNESS", label: "Witness" },
  { value: "APPLICANT", label: "Applicant" },
  { value: "RESPONDENT", label: "Respondent" },
];

export default function NewCasePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [courts, setCourts] = useState<{ value: string; label: string }[]>([]);

  const [form, setForm] = useState({
    title: "", description: "", caseType: "", courtId: "", isSensitive: false,
    caseFee: "",
    // Criminal
    offenceType: "", offenceDescription: "", penalCodeSection: "", isBailable: "",
    // Civil
    claimAmount: "", causeOfAction: "", natureOfDispute: "",
  });

  const [parties, setParties] = useState<{ partyType: string; firstName: string; lastName: string; phoneNumber: string; nationalId: string }[]>([
    { partyType: "COMPLAINANT", firstName: "", lastName: "", phoneNumber: "", nationalId: "" },
  ]);

  useEffect(() => {
    fetch("/api/courts").then(r => r.json()).then(d => {
      if (d.success) setCourts(d.data.map((c: { id: string; name: string }) => ({ value: c.id, label: c.name })));
    }).catch(() => {});
  }, []);

  function update(field: string, value: unknown) { setForm(prev => ({ ...prev, [field]: value })); }
  function updateParty(idx: number, field: string, value: string) {
    setParties(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  }
  function addParty() { setParties(prev => [...prev, { partyType: "ACCUSED", firstName: "", lastName: "", phoneNumber: "", nationalId: "" }]); }
  function removeParty(idx: number) { setParties(prev => prev.filter((_, i) => i !== idx)); }

  async function handleSubmit() {
    if (!form.title || !form.caseType || !form.courtId) { toast.error("Please fill all required fields"); return; }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title, description: form.description, caseType: form.caseType, courtId: form.courtId,
        isSensitive: form.isSensitive, caseFee: form.caseFee ? parseFloat(form.caseFee) : undefined,
        parties: parties.filter(p => p.firstName && p.lastName),
      };
      if (form.caseType === "CRIMINAL") Object.assign(payload, { offenceType: form.offenceType, offenceDescription: form.offenceDescription, penalCodeSection: form.penalCodeSection, isBailable: form.isBailable === "true" });
      if (form.caseType === "CIVIL") Object.assign(payload, { claimAmount: form.claimAmount ? parseFloat(form.claimAmount) : undefined, causeOfAction: form.causeOfAction, natureOfDispute: form.natureOfDispute });

      const res = await fetch("/api/cases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) { toast.success(`Case ${data.data.caseNumber} created`); router.push(`/dashboard/cases/${data.data.id}`); }
      else toast.error(data.error || "Failed to create case");
    } catch { toast.error("Failed to create case"); }
    finally { setLoading(false); }
  }

  const steps = ["Case Details", "Parties", "Review & Submit"];

  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <PageHeader title="New Case" description="Register a new case in the system" />

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2">
        {steps.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-all",
              step > i + 1 ? "bg-emerald-500 text-white" : step === i + 1 ? "bg-primary-600 text-white shadow-lg shadow-primary-200" : "bg-app-hover text-muted",
            )}>
              {step > i + 1 ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn("text-sm", step === i + 1 ? "font-medium text-main" : "text-muted")}>{label}</span>
            {i < 2 && <div className={cn("h-px w-6", step > i + 1 ? "bg-emerald-500" : "bg-app-hover")} />}
          </div>
        ))}
      </div>

      {/* Step 1: Case Details */}
      {step === 1 && (
        <Card className="border-card-border animate-slide-in-right">
          <CardHeader>
            <h3 className="font-semibold">Case Details</h3>
            <p className="text-xs text-muted">Basic information about the case</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input id="title" label="Case Title *" placeholder="e.g., Uganda vs Mukasa & Another" value={form.title} onChange={e => update("title", e.target.value)} />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-secondary">Description</label>
              <textarea className="flex w-full rounded-lg border border-input-border bg-card px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" rows={3} placeholder="Describe the nature of the case..." value={form.description} onChange={e => update("description", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select id="caseType" label="Case Type *" options={[{ value: "", label: "Select..." }, ...CASE_TYPES]} value={form.caseType} onChange={e => update("caseType", e.target.value)} />
              <Select id="courtId" label="Court *" options={[{ value: "", label: "Select..." }, ...courts]} value={form.courtId} onChange={e => update("courtId", e.target.value)} />
            </div>
            <Input id="caseFee" label="Case Fee (UGX)" type="number" value={form.caseFee} onChange={e => update("caseFee", e.target.value)} />

            {/* Criminal-specific fields */}
            {form.caseType === "CRIMINAL" && (
              <div className="rounded-lg border border-danger-200 bg-danger-50/30 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase text-danger-600">Criminal Case Details</p>
                <Input id="offenceType" label="Offence Type *" placeholder="e.g., Murder, Theft, Rape" value={form.offenceType} onChange={e => update("offenceType", e.target.value)} />
                <Input id="penalCodeSection" label="Penal Code Section" placeholder="e.g., PC 188" value={form.penalCodeSection} onChange={e => update("penalCodeSection", e.target.value)} />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-secondary">Offence Description</label>
                  <textarea className="flex w-full rounded-lg border border-input-border bg-card px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" rows={2} value={form.offenceDescription} onChange={e => update("offenceDescription", e.target.value)} />
                </div>
                <Select id="isBailable" label="Bailable" options={[{ value: "", label: "Not specified" }, { value: "true", label: "Yes" }, { value: "false", label: "No" }]} value={form.isBailable} onChange={e => update("isBailable", e.target.value)} />
              </div>
            )}

            {/* Civil-specific fields */}
            {form.caseType === "CIVIL" && (
              <div className="rounded-lg border border-info-200 bg-info-50/30 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase text-info-600">Civil Case Details</p>
                <Input id="claimAmount" label="Claim Amount (UGX)" type="number" value={form.claimAmount} onChange={e => update("claimAmount", e.target.value)} />
                <Input id="natureOfDispute" label="Nature of Dispute" placeholder="e.g., Breach of Contract" value={form.natureOfDispute} onChange={e => update("natureOfDispute", e.target.value)} />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-secondary">Cause of Action</label>
                  <textarea className="flex w-full rounded-lg border border-input-border bg-card px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" rows={2} value={form.causeOfAction} onChange={e => update("causeOfAction", e.target.value)} />
                </div>
              </div>
            )}
          </CardContent>
          <div className="flex justify-end gap-3 px-6 pb-6">
            <Button onClick={() => setStep(2)}>Next <ChevronRight className="h-4 w-4" /></Button>
          </div>
        </Card>
      )}

      {/* Step 2: Parties */}
      {step === 2 && (
        <Card className="border-card-border animate-slide-in-right">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div>
                <h3 className="font-semibold">Parties</h3>
                <p className="text-xs text-muted">Add all parties involved in this case</p>
              </div>
              <Button size="sm" variant="outline" onClick={addParty}><Plus className="h-3 w-3" /> Add Party</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {parties.map((party, idx) => (
              <div key={idx} className="rounded-lg border border-card-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <Select
                    options={PARTY_TYPES}
                    value={party.partyType}
                    onChange={e => updateParty(idx, "partyType", e.target.value)}
                  />
                  {parties.length > 1 && (
                    <button onClick={() => removeParty(idx)} className="rounded p-1 text-muted-more hover:bg-danger-50 hover:text-danger-600"><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="First Name" value={party.firstName} onChange={e => updateParty(idx, "firstName", e.target.value)} />
                  <Input placeholder="Last Name" value={party.lastName} onChange={e => updateParty(idx, "lastName", e.target.value)} />
                  <Input placeholder="Phone Number" value={party.phoneNumber} onChange={e => updateParty(idx, "phoneNumber", e.target.value)} />
                  <Input placeholder="National ID" value={party.nationalId} onChange={e => updateParty(idx, "nationalId", e.target.value)} />
                </div>
              </div>
            ))}
          </CardContent>
          <div className="flex justify-between gap-3 px-6 pb-6">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={() => setStep(3)}>Next <ChevronRight className="h-4 w-4" /></Button>
          </div>
        </Card>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <Card className="border-card-border animate-slide-in-right">
          <CardHeader>
            <h3 className="font-semibold">Review & Submit</h3>
            <p className="text-xs text-muted">Verify all details before filing the case</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-app p-4 space-y-3">
              <div className="flex justify-between"><span className="text-sm text-muted">Title</span><span className="text-sm font-medium text-main">{form.title || "-"}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted">Type</span><Badge variant={form.caseType === "CRIMINAL" ? "criminal" : form.caseType === "CIVIL" ? "civil" : "secondary"}>{form.caseType.replace(/_/g, " ") || "-"}</Badge></div>
              <div className="flex justify-between"><span className="text-sm text-muted">Court</span><span className="text-sm font-medium">{courts.find(c => c.value === form.courtId)?.label || "-"}</span></div>
              {form.caseType === "CRIMINAL" && (
                <div className="flex justify-between"><span className="text-sm text-muted">Offence</span><span className="text-sm font-medium">{form.offenceType || "-"}</span></div>
              )}
              {form.caseType === "CIVIL" && (
                <div className="flex justify-between"><span className="text-sm text-muted">Claim</span><span className="text-sm font-medium">{form.claimAmount ? `UGX ${parseInt(form.claimAmount).toLocaleString()}` : "-"}</span></div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-muted">Parties</span>
                <span className="text-sm font-medium">{parties.filter(p => p.firstName).length} party(s)</span>
              </div>
            </div>

            <div className="space-y-2">
              {parties.filter(p => p.firstName).map((p, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-card-border p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-app-hover text-xs font-bold text-secondary">
                    {p.firstName[0]}{p.lastName[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{p.firstName} {p.lastName}</p>
                    <p className="text-xs text-muted">{p.partyType} {p.phoneNumber && `· ${p.phoneNumber}`}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <div className="flex justify-between gap-3 px-6 pb-6">
            <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
            <Button onClick={handleSubmit} loading={loading}>File Case</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
