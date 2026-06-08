import { useEffect, useState } from "react";
import { X, Plus, Users, Crown, Trash2, Loader2, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Community {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
}

interface Member {
  id: string;
  user_id: string;
  community_id: string;
  role: string;
}

interface Group {
  id: string;
  name: string;
  community_id: string | null;
}

export function CommunityHub({
  open,
  onOpenChange,
  users,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  users: Profile[];
}) {
  const { user } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [active, setActive] = useState<Community | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    void load();
  }, [open, user]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("communities")
      .select("*")
      .order("created_at", { ascending: false });
    setCommunities((data ?? []) as Community[]);
    setLoading(false);
  };

  const createCommunity = async () => {
    if (!user || !newName.trim()) return;
    const { data, error } = await supabase
      .from("communities")
      .insert({ name: newName.trim(), description: newDesc.trim() || null, created_by: user.id })
      .select("*")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase
      .from("community_members")
      .insert({ community_id: (data as Community).id, user_id: user.id, role: "admin" });
    toast.success("Community created");
    setNewName("");
    setNewDesc("");
    setCreating(false);
    await load();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-background/90 backdrop-blur-sm p-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl bg-card shadow-elegant overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" /> Communities
          </h2>
          <button onClick={() => onOpenChange(false)} className="rounded-lg p-1 hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <aside className="w-60 border-r border-border overflow-y-auto p-2">
            <button
              onClick={() => setCreating(true)}
              className="mb-2 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-primary py-2 text-xs font-semibold text-primary-foreground"
            >
              <Plus className="h-4 w-4" /> New community
            </button>
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : communities.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">No communities</p>
            ) : (
              communities.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActive(c)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-secondary ${
                    active?.id === c.id ? "bg-secondary" : ""
                  }`}
                >
                  <div className="font-medium truncate">{c.name}</div>
                  {c.created_by === user?.id && (
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Crown className="h-3 w-3" /> Owner
                    </div>
                  )}
                </button>
              ))
            )}
          </aside>

          <main className="flex-1 overflow-y-auto p-4">
            {creating ? (
              <div className="space-y-3 max-w-md">
                <h3 className="font-semibold">Create community</h3>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Community name"
                  maxLength={100}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Description (optional)"
                  rows={3}
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setCreating(false)}
                    className="flex-1 rounded-lg border border-border py-2 text-sm hover:bg-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => void createCommunity()}
                    disabled={!newName.trim()}
                    className="flex-1 rounded-lg bg-gradient-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    Create
                  </button>
                </div>
              </div>
            ) : active ? (
              <CommunityDetail
                community={active}
                users={users}
                onDeleted={async () => {
                  setActive(null);
                  await load();
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Select a community to manage
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function CommunityDetail({
  community,
  users,
  onDeleted,
}: {
  community: Community;
  users: Profile[];
  onDeleted: () => void | Promise<void>;
}) {
  const { user } = useAuth();
  const isOwner = user?.id === community.created_by;
  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    void (async () => {
      const [{ data: mems }, { data: gs }, { data: ag }] = await Promise.all([
        supabase.from("community_members").select("*").eq("community_id", community.id),
        supabase.from("chat_groups").select("id,name,community_id").eq("community_id", community.id),
        supabase.from("chat_groups").select("id,name,community_id").is("community_id", null),
      ]);
      setMembers((mems ?? []) as Member[]);
      setGroups((gs ?? []) as Group[]);
      setAllGroups((ag ?? []) as Group[]);
    })();
  }, [community.id]);

  const memberIds = new Set(members.map((m) => m.user_id));
  const candidates = users.filter((u) => !memberIds.has(u.id));

  const addMember = async (uid: string) => {
    const { error } = await supabase
      .from("community_members")
      .insert({ community_id: community.id, user_id: uid, role: "member" });
    if (error) {
      toast.error(error.message);
      return;
    }
    const { data } = await supabase
      .from("community_members")
      .select("*")
      .eq("community_id", community.id);
    setMembers((data ?? []) as Member[]);
  };

  const removeMember = async (uid: string) => {
    await supabase
      .from("community_members")
      .delete()
      .eq("community_id", community.id)
      .eq("user_id", uid);
    setMembers((prev) => prev.filter((m) => m.user_id !== uid));
  };

  const linkGroup = async (groupId: string) => {
    const { error } = await supabase
      .from("chat_groups")
      .update({ community_id: community.id })
      .eq("id", groupId);
    if (error) {
      toast.error(error.message);
      return;
    }
    const moved = allGroups.find((g) => g.id === groupId);
    if (moved) {
      setGroups((p) => [...p, { ...moved, community_id: community.id }]);
      setAllGroups((p) => p.filter((g) => g.id !== groupId));
    }
  };

  const unlinkGroup = async (groupId: string) => {
    await supabase.from("chat_groups").update({ community_id: null }).eq("id", groupId);
    const moved = groups.find((g) => g.id === groupId);
    setGroups((p) => p.filter((g) => g.id !== groupId));
    if (moved) setAllGroups((p) => [...p, { ...moved, community_id: null }]);
  };

  const deleteCommunity = async () => {
    if (!confirm("Delete this community?")) return;
    const { error } = await supabase.from("communities").delete().eq("id", community.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Community deleted");
    void onDeleted();
  };

  const profileFor = (id: string) =>
    users.find((u) => u.id === id) ?? { id, display_name: "User", avatar_url: null };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-semibold">{community.name}</h3>
            {community.description && (
              <p className="mt-1 text-sm text-muted-foreground">{community.description}</p>
            )}
          </div>
          {isOwner && (
            <button
              onClick={() => void deleteCommunity()}
              className="rounded-lg border border-destructive/50 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5 inline mr-1" /> Delete
            </button>
          )}
        </div>
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold">Members ({members.length})</h4>
          {isOwner && (
            <button
              onClick={() => setShowAdd((v) => !v)}
              className="text-xs text-primary hover:underline"
            >
              {showAdd ? "Done" : "Add member"}
            </button>
          )}
        </div>
        <ul className="space-y-1">
          {members.map((m) => {
            const p = profileFor(m.user_id);
            return (
              <li key={m.id} className="flex items-center gap-2 rounded-lg p-2 hover:bg-secondary">
                <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground overflow-hidden">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (p.display_name ?? "U").charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 text-sm">{p.display_name}</div>
                {m.role === "admin" && <Crown className="h-3.5 w-3.5 text-yellow-500" />}
                {isOwner && m.user_id !== user?.id && (
                  <button
                    onClick={() => void removeMember(m.user_id)}
                    className="rounded p-1 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        {showAdd && isOwner && (
          <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border p-2">
            {candidates.length === 0 ? (
              <p className="py-3 text-center text-xs text-muted-foreground">No more users</p>
            ) : (
              candidates.map((p) => (
                <button
                  key={p.id}
                  onClick={() => void addMember(p.id)}
                  className="flex w-full items-center gap-2 rounded p-1.5 text-left text-sm hover:bg-secondary"
                >
                  <div className="h-7 w-7 rounded-full bg-gradient-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                    {(p.display_name ?? "U").charAt(0).toUpperCase()}
                  </div>
                  {p.display_name}
                </button>
              ))
            )}
          </div>
        )}
      </section>

      <section>
        <h4 className="mb-2 text-sm font-semibold flex items-center gap-1.5">
          <Link2 className="h-4 w-4" /> Linked groups
        </h4>
        {groups.length === 0 ? (
          <p className="text-xs text-muted-foreground">No groups linked yet</p>
        ) : (
          <ul className="space-y-1">
            {groups.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span>{g.name}</span>
                {isOwner && (
                  <button
                    onClick={() => void unlinkGroup(g.id)}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Unlink
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {isOwner && allGroups.length > 0 && (
          <div className="mt-3">
            <p className="mb-1 text-xs text-muted-foreground">Available groups:</p>
            <div className="flex flex-wrap gap-2">
              {allGroups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => void linkGroup(g.id)}
                  className="rounded-full border border-border px-3 py-1 text-xs hover:bg-secondary"
                >
                  + {g.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
