"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FolderOpen, Upload, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Doc {
  id: string;
  name: string;
  category: string;
  file_path: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  contract: "Smlouva",
  receipt: "Účtenka",
  invoice: "Faktura",
  proof: "Doklad",
  other: "Jiné",
};

export default function DocumentsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [clientId, setClientId] = useState("");
  const [advisorId, setAdvisorId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState("other");

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: client } = await supabase.from("clients").select("id, advisor_id").eq("user_id", user.id).single();
      if (!client) { setLoading(false); return; }
      setClientId(client.id);
      setAdvisorId(client.advisor_id);

      const { data } = await supabase.from("client_documents").select("*").eq("client_id", client.id).order("created_at", { ascending: false });
      setDocs(data || []);
      setLoading(false);
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleUpload() {
    if (!uploadFile || !clientId || !advisorId) return;
    setUploading(true);

    const filePath = `client-docs/${clientId}/${Date.now()}_${uploadFile.name}`;
    const { error: storageError } = await supabase.storage.from("documents").upload(filePath, uploadFile);
    if (storageError) {
      toast.error("Chyba při nahrávání.");
      setUploading(false);
      return;
    }

    const { data: newDoc } = await supabase.from("client_documents").insert({
      client_id: clientId,
      advisor_id: advisorId,
      name: uploadFile.name,
      category: uploadCategory,
      file_path: filePath,
      file_size: uploadFile.size,
      uploaded_by: "client",
    }).select().single();

    if (newDoc) setDocs((prev) => [newDoc, ...prev]);
    setUploadFile(null);
    setUploading(false);
    toast.success("Dokument nahrán.");
  }

  async function handleDownload(filePath: string) {
    const { data } = await supabase.storage.from("documents").createSignedUrl(filePath, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 rounded-xl" /></div>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Dokumenty</h1>

      {/* Upload zone */}
      <div className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Nahrát dokument</h2>
        <div
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 p-8 transition-colors hover:border-blue-300"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setUploadFile(f); }}
        >
          <Upload className="mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">Přetáhněte soubor sem nebo</p>
          <label className="mt-2 cursor-pointer rounded-lg bg-slate-100 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200">
            Vyberte soubor
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setUploadFile(f); }} />
          </label>
        </div>

        {uploadFile && (
          <div className="mt-4 flex items-center gap-3">
            <div className="flex flex-1 items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-blue-700">{uploadFile.name} ({formatSize(uploadFile.size)})</span>
              <button onClick={() => setUploadFile(null)} className="ml-auto text-xs text-blue-400 hover:text-blue-600">Odebrat</button>
            </div>
            <Select value={uploadCategory} onValueChange={setUploadCategory}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleUpload} disabled={uploading} size="sm">
              {uploading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Upload className="mr-2 h-3 w-3" />}Nahrát
            </Button>
          </div>
        )}
      </div>

      {/* Documents list */}
      {docs.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <FolderOpen className="mb-4 h-12 w-12 text-slate-200" />
          <p className="text-lg font-medium text-slate-400">Žádné dokumenty</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-white shadow-sm">
          <table className="w-full">
            <thead><tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-slate-700"><th className="px-6 py-3">Název</th><th className="px-6 py-3">Kategorie</th><th className="px-6 py-3">Datum</th><th className="px-6 py-3">Velikost</th><th className="px-6 py-3">Nahrál</th><th className="px-6 py-3"></th></tr></thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-6 py-3 text-sm font-medium text-slate-900">{d.name}</td>
                  <td className="px-6 py-3"><Badge variant="secondary" className="text-[10px]">{CATEGORY_LABELS[d.category] || d.category}</Badge></td>
                  <td className="px-6 py-3 text-sm text-slate-500">{new Date(d.created_at).toLocaleDateString("cs-CZ")}</td>
                  <td className="px-6 py-3 text-sm text-slate-500">{formatSize(d.file_size)}</td>
                  <td className="px-6 py-3 text-sm text-slate-500">{d.uploaded_by === "client" ? "Vy" : "Poradce"}</td>
                  <td className="px-6 py-3">
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => handleDownload(d.file_path)}>Stáhnout</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
