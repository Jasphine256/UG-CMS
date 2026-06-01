"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Upload, FileText, Download, Trash2, Eye, Tag } from "lucide-react";

const DOC_TYPES = [
  {value:"PLEADING",label:"Pleading"},{value:"AFFIDAVIT",label:"Affidavit"},{value:"JUDGMENT",label:"Judgment"},
  {value:"ORDER",label:"Order"},{value:"APPLICATION",label:"Application"},{value:"RULING",label:"Ruling"},
  {value:"CERTIFICATE",label:"Certificate"},{value:"CORRESPONDENCE",label:"Correspondence"},{value:"OTHER",label:"Other"},
];

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Record<string,unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title:"", caseId:"", documentType:"OTHER", tags:"", file: null as File|null });

  const fetchDocs = useCallback(async () => {
    const res = await fetch("/api/documents?limit=30");
    const d = await res.json();
    if (d.success) setDocs(d.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  async function handleUpload() {
    if (!form.file) { toast.error("Select a file"); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append("file", form.file);
    if (form.title) fd.append("title", form.title);
    if (form.caseId) fd.append("caseId", form.caseId);
    fd.append("documentType", form.documentType);
    if (form.tags) fd.append("tags", form.tags);

    const res = await fetch("/api/documents", { method:"POST", body:fd });
    const d = await res.json();
    if (d.success) { toast.success("Document uploaded"); setForm({ title:"", caseId:"", documentType:"OTHER", tags:"", file:null }); fetchDocs(); }
    else toast.error(d.error);
    setUploading(false);
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes/1024).toFixed(1)} KB`;
    return `${(bytes/1048576).toFixed(1)} MB`;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Documents" description="Upload and manage case documents" />

      {/* Upload area */}
      <Card className="mb-6 border-card-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <input ref={fileRef} type="file" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)setForm(p=>({...p,file:f,title:f.name}));}}/>
              <Button variant="outline" onClick={()=>fileRef.current?.click()}>
                <Upload className="h-4 w-4"/> {form.file ? form.file.name : "Select File"}
              </Button>
            </div>
            <Input id="dTitle" placeholder="Title" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} className="w-40" />
            <Input id="dCase" placeholder="Case ID" value={form.caseId} onChange={e=>setForm(f=>({...f,caseId:e.target.value}))} className="w-32" />
            <Select options={DOC_TYPES} value={form.documentType} onChange={e=>setForm(f=>({...f,documentType:e.target.value}))} />
            <Input id="dTags" placeholder="Tags (comma-separated)" value={form.tags} onChange={e=>setForm(f=>({...f,tags:e.target.value}))} className="w-40" />
            <Button onClick={handleUpload} loading={uploading} disabled={!form.file}>Upload</Button>
          </div>
        </CardContent>
      </Card>

      {/* Documents list */}
      <Card className="border-card-border">
        <CardContent className="p-0">
          {loading ? <div className="space-y-3 p-6">{[1,2,3,4].map(i=><Skeleton key={i} className="h-16 w-full"/>)}</div> : docs.length===0 ? (
            <div className="py-16 text-center"><FileText className="mx-auto h-10 w-10 text-muted-more"/><p className="mt-3 text-muted">No documents uploaded</p></div>
          ) : (
            <div className="divide-y divide-surface-100">
              {docs.map((d:Record<string,unknown>) => (
                <div key={d.id as string} className="flex items-center gap-4 px-6 py-4 hover:bg-app">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50"><FileText className="h-5 w-5 text-blue-600"/></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-main truncate">{d.title as string}</p>
                      <Badge variant="secondary" size="sm">{(d.documentType as string)}</Badge>
                    </div>
                    <p className="text-xs text-muted">{d.fileName as string} · {formatSize(d.fileSize as number)} · {(d.uploadedBy as {firstName?:string;lastName?:string})?.firstName} {(d.uploadedBy as {firstName?:string;lastName?:string})?.lastName}</p>
                    {(d.tags as {tag:string}[]||[]).length > 0 && (
                      <div className="mt-1 flex gap-1">{(d.tags as {tag:string}[]).map((t,i)=><Badge key={i} variant="outline" size="sm">{t.tag}</Badge>)}</div>
                    )}
                  </div>
                  <a href={d.fileUrl as string} target="_blank" className="rounded-lg p-2 text-muted-more hover:bg-app-hover hover:text-primary-600" title="View/Download"><Download className="h-4 w-4"/></a>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
