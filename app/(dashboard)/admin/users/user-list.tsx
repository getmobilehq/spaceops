"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User, MoreVertical, Shield, Ban, CheckCircle2, Building2, Pencil, Trash2, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { updateUserSchema } from "@/lib/validators/schemas";
import { toast } from "sonner";
import type { UserProfile, Building, BuildingAssignment } from "@/lib/types/helpers";
import type { UserRole } from "@/lib/types/database";

interface UserListProps {
  users: UserProfile[];
  currentUserId: string;
  buildings: Building[];
  assignments: BuildingAssignment[];
}

const roleBadgeColors: Record<string, string> = {
  admin: "bg-primary-100 text-primary-700",
  supervisor: "bg-info-bg text-info border border-info-border",
  staff: "bg-slate-100 text-slate-600",
  client: "bg-warning-bg text-warning border border-warning-border",
};

export function UserList({ users, currentUserId, buildings, assignments }: UserListProps) {
  const router = useRouter();
  const [assignDialogUser, setAssignDialogUser] = useState<UserProfile | null>(null);
  const [selectedBuildingIds, setSelectedBuildingIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [editDialogUser, setEditDialogUser] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [removeUserId, setRemoveUserId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  // Build a map: userId -> buildingId[]
  const userAssignments: Record<string, string[]> = {};
  for (const a of assignments) {
    if (!userAssignments[a.user_id]) userAssignments[a.user_id] = [];
    userAssignments[a.user_id].push(a.building_id);
  }

  function openAssignDialog(user: UserProfile) {
    setAssignDialogUser(user);
    setSelectedBuildingIds(new Set(userAssignments[user.id] ?? []));
  }

  function toggleBuilding(buildingId: string) {
    setSelectedBuildingIds((prev) => {
      const next = new Set(prev);
      if (next.has(buildingId)) {
        next.delete(buildingId);
      } else {
        next.add(buildingId);
      }
      return next;
    });
  }

  async function saveAssignments() {
    if (!assignDialogUser) return;

    setSaving(true);
    const supabase = createBrowserSupabaseClient();

    // Delete existing assignments for this user
    const { error: deleteError } = await supabase
      .from("building_assignments")
      .delete()
      .eq("user_id", assignDialogUser.id);

    if (deleteError) {
      toast.error("Failed to update assignments");
      setSaving(false);
      return;
    }

    // Insert new assignments
    if (selectedBuildingIds.size > 0) {
      const rows = Array.from(selectedBuildingIds).map((buildingId) => ({
        user_id: assignDialogUser.id,
        building_id: buildingId,
      }));

      const { error: insertError } = await supabase
        .from("building_assignments")
        .insert(rows);

      if (insertError) {
        toast.error("Failed to save assignments");
        setSaving(false);
        return;
      }
    }

    toast.success("Building assignments updated");
    setSaving(false);
    setAssignDialogUser(null);
    router.refresh();
  }

  async function updateRole(userId: string, role: UserRole) {
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from("users")
      .update({ role })
      .eq("id", userId);

    if (error) {
      toast.error("Failed to update role");
      return;
    }

    toast.success("Role updated");
    router.refresh();
  }

  function openEditDialog(user: UserProfile) {
    setEditDialogUser(user);
    setEditName(user.name);
    setEditPhone(user.phone ?? "");
  }

  async function handleEditUser() {
    if (!editDialogUser) return;

    const parsed = updateUserSchema.safeParse({
      name: editName,
      phone: editPhone || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setEditSaving(true);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from("users")
      .update({ name: editName, phone: editPhone || null })
      .eq("id", editDialogUser.id);

    setEditSaving(false);

    if (error) {
      toast.error("Failed to update user details");
      return;
    }

    toast.success("User details updated");
    setEditDialogUser(null);
    router.refresh();
  }

  async function handleRemoveUser() {
    if (!removeUserId) return;

    setRemoving(true);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", removeUserId);

    setRemoving(false);

    if (error) {
      if (error.code === "23503") {
        toast.error(
          "Cannot remove user — they have inspection or task records. Deactivate instead."
        );
      } else {
        toast.error("Failed to remove user");
      }
      setRemoveUserId(null);
      return;
    }

    toast.success("User removed from organization");
    setRemoveUserId(null);
    router.refresh();
  }

  async function toggleActive(userId: string, currentlyActive: boolean) {
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from("users")
      .update({ active: !currentlyActive })
      .eq("id", userId);

    if (error) {
      toast.error("Failed to update user status");
      return;
    }

    toast.success(currentlyActive ? "User deactivated" : "User activated");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {users.map((u) => {
        const assignedCount = userAssignments[u.id]?.length ?? 0;

        return (
          <div
            key={u.id}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                <User className="h-4 w-4 text-slate-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-body font-medium text-slate-900">
                    {u.name}
                  </p>
                  {!u.active && (
                    <Badge variant="outline" className="text-[10px] text-slate-400">
                      Inactive
                    </Badge>
                  )}
                </div>
                <p className="text-caption text-slate-500">{u.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Building count badge for supervisor/staff */}
              {(u.role === "supervisor" || u.role === "staff") && assignedCount > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  <Building2 className="h-2.5 w-2.5" />
                  {assignedCount}
                </span>
              )}

              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${roleBadgeColors[u.role] || ""}`}
              >
                {u.role}
              </span>

              {u.id !== currentUserId && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4 text-slate-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {(u.role === "supervisor" || u.role === "staff") && (
                      <DropdownMenuItem onClick={() => openAssignDialog(u)}>
                        <Building2 className="mr-2 h-4 w-4" />
                        Assign Buildings
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => openEditDialog(u)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        updateRole(
                          u.id,
                          u.role === "admin" ? "supervisor" : "admin"
                        )
                      }
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      {u.role === "admin"
                        ? "Demote to Supervisor"
                        : "Promote to Admin"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => toggleActive(u.id, u.active)}
                    >
                      {u.active ? (
                        <>
                          <Ban className="mr-2 h-4 w-4" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Activate
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setRemoveUserId(u.id)}
                      className="text-fail focus:text-fail"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove from Organization
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        );
      })}

      {/* Assign Buildings Dialog */}
      <Dialog
        open={!!assignDialogUser}
        onOpenChange={(open) => {
          if (!open) setAssignDialogUser(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Assign Buildings to {assignDialogUser?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-72 space-y-2 overflow-y-auto py-2">
            {buildings.length === 0 ? (
              <p className="text-sm-body text-slate-500">No buildings available</p>
            ) : (
              buildings.map((b) => (
                <label
                  key={b.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 transition-colors hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedBuildingIds.has(b.id)}
                    onChange={() => toggleBuilding(b.id)}
                    className="h-4 w-4 rounded border-slate-300 text-primary-600"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-medium text-slate-700">{b.name}</p>
                    {b.city && (
                      <p className="text-caption text-slate-400">{b.city}</p>
                    )}
                  </div>
                </label>
              ))
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setAssignDialogUser(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={saveAssignments}
              disabled={saving}
              className="bg-primary-600 font-semibold text-white hover:bg-primary-700"
            >
              {saving ? "Saving..." : `Save (${selectedBuildingIds.size} selected)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Details Dialog */}
      <Dialog
        open={!!editDialogUser}
        onOpenChange={(open) => {
          if (!open) setEditDialogUser(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+1 555 000 0000"
              />
            </div>
            <p className="text-caption text-slate-400">
              Email cannot be changed (it is the login identity).
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditDialogUser(null)}
              >
                Cancel
              </Button>
              <Button onClick={handleEditUser} disabled={editSaving}>
                {editSaving && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove User AlertDialog */}
      <AlertDialog
        open={!!removeUserId}
        onOpenChange={(open) => {
          if (!open) setRemoveUserId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User from Organization</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the user and all their building
              assignments. This action cannot be undone. If the user has
              inspection or task records, consider deactivating them instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveUser}
              disabled={removing}
              className="bg-fail text-white hover:bg-red-700"
            >
              {removing && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              Remove User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
