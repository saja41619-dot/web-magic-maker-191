import { useState, useMemo } from "react";
import { X, Search, Users, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface NewGroupModalProps {
  allUsers: Profile[];
  onClose: () => void;
  onGroupCreated?: () => void;
}

export function NewGroupModal({ allUsers, onClose, onGroupCreated }: NewGroupModalProps) {
  const { user } = useAuth();
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [creating, setCreating] = useState(false);

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return allUsers.filter(
      (user) =>
        (user.display_name ?? "").toLowerCase().includes(q) &&
        !selectedUsers.some((sUser) => sUser.id === user.id)
    );
  }, [allUsers, searchTerm, selectedUsers]);

  const toggleUserSelection = (user: Profile) => {
    setSelectedUsers((prev) =>
      prev.some((sUser) => sUser.id === user.id)
        ? prev.filter((sUser) => sUser.id !== user.id)
        : [...prev, user]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Group name cannot be empty.");
      return;
    }
    if (selectedUsers.length === 0) {
      toast.error("Please select at least one member for the group.");
      return;
    }
    if (!user) return;

    setCreating(true);
    try {
      // 1. Create the group
      const { data: group, error: groupError } = await supabase
        .from("chat_groups")
        .insert([{ name: groupName.trim(), created_by: user.id }])
        .select()
        .single();
      
      if (groupError) {
        console.error("Group creation error:", groupError);
        throw groupError;
      }

      if (!group) throw new Error("Group was not returned after creation");

      // 2. Add members (including creator)
      const members = [
        { group_id: group.id, user_id: user.id, role: 'admin' },
        ...selectedUsers.map(u => ({ group_id: group.id, user_id: u.id, role: 'member' }))
      ];

      const { error: membersError } = await supabase.from("group_members").insert(members);
      if (membersError) {
        console.error("Members insertion error:", membersError);
        throw membersError;
      }

      toast.success(`Group "${groupName}" created successfully!`);
      onGroupCreated?.();
      onClose();
    } catch (err: any) {
      console.error("Detailed error:", err);
      toast.error(err.message || "Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[102] flex items-center justify-center bg-background/90 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-elegant p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold">New Group</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <label htmlFor="groupName" className="text-sm font-medium text-muted-foreground">
            Group Name
          </label>
          <input
            id="groupName"
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Enter group name"
            className="mt-1.5 w-full rounded-md border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium text-muted-foreground">
            Add Members ({selectedUsers.length})
          </label>
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedUsers.map((user) => (
              <span
                key={user.id}
                className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
              >
                {user.display_name}
                <button onClick={() => toggleUserSelection(user)} className="ml-1 text-primary/70 hover:text-primary">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users to add..."
              className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="max-h-48 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-border">
          {filteredUsers.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">No users found.</p>
          ) : (
            filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => toggleUserSelection(user)}
                className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-secondary/50 transition-colors text-left"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    user.display_name?.charAt(0).toUpperCase() || "U"
                  )}
                </div>
                <p className="font-medium text-sm truncate">{user.display_name || "User"}</p>
              </button>
            ))
          )}
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={handleCreateGroup}
            disabled={creating}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition-smooth hover:opacity-90 disabled:opacity-60"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
            {creating ? "Creating..." : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
}