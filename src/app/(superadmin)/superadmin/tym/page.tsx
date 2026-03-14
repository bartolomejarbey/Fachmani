"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, UserPlus, Shield, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SuperadminProfile {
  id: string;
  user_id: string;
  role: string;
  display_name: string;
  email: string;
  created_at: string;
}

const roleColors: Record<string, string> = {
  owner: "bg-purple-100 text-purple-700",
  support: "bg-blue-100 text-blue-700",
  sales: "bg-green-100 text-green-700",
  tech: "bg-orange-100 text-orange-700",
};

const roleLabels: Record<string, string> = {
  owner: "Vlastník",
  support: "Podpora",
  sales: "Obchod",
  tech: "Technik",
};

export default function TeamPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<SuperadminProfile[]>([]);
  const [tableExists, setTableExists] = useState(true);

  // Add form
  const [addEmail, setAddEmail] = useState("");
  const [addDisplayName, setAddDisplayName] = useState("");
  const [addRole, setAddRole] = useState("support");
  const [addLoading, setAddLoading] = useState(false);

  // Delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteMember, setDeleteMember] = useState<SuperadminProfile | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from("superadmin_profiles")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        // Table might not exist
        setTableExists(false);
        setMembers([]);
      } else {
        setMembers(data || []);
        setTableExists(true);
      }
      setLoading(false);
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd() {
    if (!addEmail.trim() || !addDisplayName.trim()) {
      toast.error("Vyplňte email a zobrazované jméno");
      return;
    }
    setAddLoading(true);

    const { data, error } = await supabase
      .from("superadmin_profiles")
      .insert({
        email: addEmail.trim(),
        display_name: addDisplayName.trim(),
        role: addRole,
      })
      .select()
      .single();

    if (error) {
      toast.error("Nepodařilo se přidat člena: " + error.message);
    } else if (data) {
      setMembers((prev) => [...prev, data]);
      setAddEmail("");
      setAddDisplayName("");
      setAddRole("support");
      toast.success("Člen týmu byl přidán");
    }
    setAddLoading(false);
  }

  async function handleChangeRole(member: SuperadminProfile, newRole: string) {
    const { error } = await supabase
      .from("superadmin_profiles")
      .update({ role: newRole })
      .eq("id", member.id);

    if (error) {
      toast.error("Nepodařilo se změnit roli");
    } else {
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, role: newRole } : m))
      );
      toast.success("Role byla změněna");
    }
  }

  function openDelete(member: SuperadminProfile) {
    setDeleteMember(member);
    setDeleteOpen(true);
  }

  async function handleDelete() {
    if (!deleteMember) return;
    setDeleteLoading(true);

    const { error } = await supabase
      .from("superadmin_profiles")
      .delete()
      .eq("id", deleteMember.id);

    if (error) {
      toast.error("Nepodařilo se odstranit člena");
    } else {
      setMembers((prev) => prev.filter((m) => m.id !== deleteMember.id));
      setDeleteOpen(false);
      toast.success("Člen týmu byl odstraněn");
    }
    setDeleteLoading(false);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!tableExists) {
    return (
      <div>
        <div className="mb-6 flex items-center gap-3">
          <Users className="h-6 w-6 text-slate-400" />
          <h1 className="text-2xl font-bold text-slate-900">Správa týmu</h1>
        </div>
        <div className="rounded-xl border bg-white px-6 py-16 text-center shadow-sm">
          <Shield className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">
            Tabulka superadmin_profiles zatím neexistuje
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Vytvořte tabulku v Supabase pro správu týmu.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Users className="h-6 w-6 text-slate-400" />
        <h1 className="text-2xl font-bold text-slate-900">Správa týmu</h1>
      </div>

      {/* Add member form */}
      <div className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Přidat člena</h2>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Email</Label>
            <Input
              type="email"
              placeholder="jan@firma.cz"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
            />
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Zobrazované jméno</Label>
            <Input
              placeholder="Jan Novák"
              value={addDisplayName}
              onChange={(e) => setAddDisplayName(e.target.value)}
            />
          </div>
          <div className="w-[150px] space-y-1">
            <Label className="text-xs">Role</Label>
            <Select value={addRole} onValueChange={setAddRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Vlastník</SelectItem>
                <SelectItem value="support">Podpora</SelectItem>
                <SelectItem value="sales">Obchod</SelectItem>
                <SelectItem value="tech">Technik</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAdd} disabled={addLoading}>
            {addLoading ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-1.5 h-4 w-4" />
            )}
            Přidat
          </Button>
        </div>
      </div>

      {/* Members table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-slate-700">
              <th className="px-6 py-3">Jméno</th>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3">Přidán</th>
              <th className="px-6 py-3 text-right">Akce</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                  <Users className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                  Žádní členové týmu
                </td>
              </tr>
            ) : (
              members.map((m) => (
                <tr
                  key={m.id}
                  className="border-b last:border-0 even:bg-slate-50/50 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                        <Shield className="h-4 w-4 text-slate-500" />
                      </div>
                      <span className="text-sm font-medium text-slate-900">
                        {m.display_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-500">{m.email}</td>
                  <td className="px-6 py-3">
                    <Select
                      value={m.role}
                      onValueChange={(val) => handleChangeRole(m, val)}
                    >
                      <SelectTrigger className="w-[130px] h-8">
                        <Badge
                          className={`text-[10px] ${roleColors[m.role] || "bg-slate-100 text-slate-700"}`}
                        >
                          {roleLabels[m.role] || m.role}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Vlastník</SelectItem>
                        <SelectItem value="support">Podpora</SelectItem>
                        <SelectItem value="sales">Obchod</SelectItem>
                        <SelectItem value="tech">Technik</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-6 py-3 text-xs text-slate-500">
                    {new Date(m.created_at).toLocaleDateString("cs-CZ")}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => openDelete(m)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Celkem {members.length} členů týmu
      </p>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Odstranit člena týmu</DialogTitle>
            <DialogDescription>
              Opravdu chcete odstranit uživatele{" "}
              <span className="font-medium text-slate-700">
                {deleteMember?.display_name}
              </span>{" "}
              ({deleteMember?.email})? Tuto akci nelze vrátit zpět.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Zrušit
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-1.5 h-4 w-4" />
              )}
              Smazat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
