"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminLayout from "../components/AdminLayout";

type TeamMember = {
  id: string;
  email: string;
  full_name: string;
  admin_role: string;
  created_at: string;
  last_login?: string;
  actions_count?: number;
};

export default function AdminTym() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [allUsers, setAllUsers] = useState<{ id: string; email: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedRole, setSelectedRole] = useState("sales");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    // Načteme členy týmu (všichni s admin_role)
    const { data: teamData } = await supabase
      .from("profiles")
      .select("id, email, full_name, admin_role, created_at")
      .not("admin_role", "is", null)
      .order("admin_role");

    if (teamData) {
      // Načteme počty akcí pro každého
      const { data: actionsData } = await supabase
        .from("admin_activity_log")
        .select("admin_id");

      const actionsCounts: Record<string, number> = {};
      actionsData?.forEach(a => {
        if (a.admin_id) {
          actionsCounts[a.admin_id] = (actionsCounts[a.admin_id] || 0) + 1;
        }
      });

      setTeam(teamData.map(m => ({
        ...m,
        actions_count: actionsCounts[m.id] || 0,
      })));
    }

    // Načteme všechny uživatele pro přidání do týmu
    const { data: usersData } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .is("admin_role", null)
      .order("full_name");

    setAllUsers(usersData || []);
    setLoading(false);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    await supabase
      .from("profiles")
      .update({ admin_role: selectedRole })
      .eq("id", selectedUser);

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("admin_activity_log").insert({
      admin_id: user?.id,
      action: "add_team_member",
      target_type: "user",
      target_id: selectedUser,
      details: { role: selectedRole },
    });

    setSelectedUser("");
    setSelectedRole("sales");
    setShowModal(false);
    setSaving(false);
    loadData();
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    await supabase
      .from("profiles")
      .update({ admin_role: newRole })
      .eq("id", userId);

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("admin_activity_log").insert({
      admin_id: user?.id,
      action: "change_team_role",
      target_type: "user",
      target_id: userId,
      details: { new_role: newRole },
    });

    loadData();
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!confirm(`Opravdu odebrat ${memberName} z týmu?`)) return;

    await supabase
      .from("profiles")
      .update({ admin_role: null })
      .eq("id", userId);

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("admin_activity_log").insert({
      admin_id: user?.id,
      action: "remove_team_member",
      target_type: "user",
      target_id: userId,
    });

    loadData();
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "master_admin":
        return { label: "🔴 Master Admin", color: "bg-red-500/20 text-red-400 border border-red-500/30", desc: "Plný přístup ke všemu" };
      case "admin":
        return { label: "🟠 Admin", color: "bg-orange-500/20 text-orange-400 border border-orange-500/30", desc: "Správa uživatelů a poptávek" };
      case "sales":
        return { label: "🟡 Obchodník", color: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30", desc: "Promo, fachmani, inzeráty" };
      default:
        return { label: role, color: "bg-gray-500/20 text-gray-400", desc: "" };
    }
  };

  const roleOrder = ["master_admin", "admin", "sales"];
  const sortedTeam = [...team].sort((a, b) => 
    roleOrder.indexOf(a.admin_role) - roleOrder.indexOf(b.admin_role)
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">🏢 Správa týmu</h1>
            <p className="text-slate-400">{team.length} členů týmu</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl hover:opacity-90 transition-all"
          >
            + Přidat člena týmu
          </button>
        </div>

        {/* Role Overview */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { role: "master_admin", icon: "🔴", label: "Master Admin", desc: "Plný přístup, správa týmu, nastavení systému" },
            { role: "admin", icon: "🟠", label: "Admin", desc: "Správa uživatelů, poptávek, kategorií, fakturace" },
            { role: "sales", icon: "🟡", label: "Obchodník", desc: "Promo akce, fiktivní fachmani, topování" },
          ].map((r) => (
            <div key={r.role} className="bg-slate-800/50 border border-white/5 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{r.icon}</span>
                <div>
                  <h3 className="text-white font-semibold">{r.label}</h3>
                  <p className="text-slate-500 text-sm">{team.filter(m => m.admin_role === r.role).length} členů</p>
                </div>
              </div>
              <p className="text-slate-400 text-sm">{r.desc}</p>
            </div>
          ))}
        </div>

        {/* Team List */}
        <div className="bg-slate-800/50 border border-white/5 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : team.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">🏢</div>
              <h3 className="text-xl font-bold text-white mb-2">Žádní členové týmu</h3>
              <p className="text-slate-400 mb-6">Přidejte prvního člena týmu.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Člen</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Role</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Akce provedeno</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Přidán</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase">Akce</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sortedTeam.map((member) => {
                    const roleBadge = getRoleBadge(member.admin_role);
                    
                    return (
                      <tr key={member.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold">
                              {member.full_name?.charAt(0) || "?"}
                            </div>
                            <div>
                              <p className="text-white font-medium">{member.full_name}</p>
                              <p className="text-slate-500 text-sm">{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-3 py-1 rounded-lg text-sm font-medium ${roleBadge.color}`}>
                            {roleBadge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-cyan-400 font-medium">{member.actions_count}</span>
                          <span className="text-slate-500 text-sm ml-1">akcí</span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-sm">
                          {new Date(member.created_at).toLocaleDateString("cs-CZ")}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {member.admin_role !== "master_admin" && (
                              <>
                                <select
                                  value={member.admin_role}
                                  onChange={(e) => handleChangeRole(member.id, e.target.value)}
                                  className="px-3 py-1.5 bg-slate-700 border border-white/10 rounded-lg text-sm text-white focus:outline-none"
                                >
                                  <option value="sales">🟡 Obchodník</option>
                                  <option value="admin">🟠 Admin</option>
                                  <option value="master_admin">🔴 Master Admin</option>
                                </select>
                                <button
                                  onClick={() => handleRemoveMember(member.id, member.full_name)}
                                  className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
                                >
                                  Odebrat
                                </button>
                              </>
                            )}
                            {member.admin_role === "master_admin" && (
                              <span className="text-slate-500 text-sm">Nelze upravit</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Member Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-md">
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">👤 Přidat člena týmu</h2>
                  <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
                </div>
              </div>

              <form onSubmit={handleAddMember} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Uživatel *</label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">Vyberte uživatele...</option>
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Role *</label>
                  <div className="space-y-2">
                    {[
                      { key: "sales", label: "🟡 Obchodník", desc: "Promo, fiktivní fachmani" },
                      { key: "admin", label: "🟠 Admin", desc: "Správa uživatelů, poptávek" },
                      { key: "master_admin", label: "🔴 Master Admin", desc: "Plný přístup" },
                    ].map((role) => (
                      <button
                        key={role.key}
                        type="button"
                        onClick={() => setSelectedRole(role.key)}
                        className={`w-full px-4 py-3 rounded-xl text-left transition-all ${
                          selectedRole === role.key
                            ? "bg-cyan-500 text-white"
                            : "bg-white/5 text-slate-400 hover:bg-white/10"
                        }`}
                      >
                        <div className="font-medium">{role.label}</div>
                        <div className="text-sm opacity-70">{role.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={saving || !selectedUser}
                    className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl disabled:opacity-50"
                  >
                    {saving ? "Ukládám..." : "Přidat do týmu"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 bg-white/5 text-slate-400 rounded-xl hover:bg-white/10"
                  >
                    Zrušit
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}