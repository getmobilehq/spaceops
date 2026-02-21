"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { createClientOrgSchema } from "@/lib/validators/schemas";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Loader2,
  Building2,
  Link2,
  Pencil,
} from "lucide-react";
import type { ClientOrg, ClientBuildingLink, Building } from "@/lib/types/helpers";

interface ClientOrgsManagerProps {
  orgId: string;
  clientOrgs: ClientOrg[];
  clientBuildingLinks: ClientBuildingLink[];
  buildings: Building[];
}

export function ClientOrgsManager({
  orgId,
  clientOrgs,
  clientBuildingLinks,
  buildings,
}: ClientOrgsManagerProps) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [linkOrgId, setLinkOrgId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editOrgId, setEditOrgId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editContactEmail, setEditContactEmail] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  async function handleCreate() {
    const result = createClientOrgSchema.safeParse({
      name,
      contact_email: contactEmail || undefined,
    });
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }

    setSaving(true);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.from("client_orgs").insert({
      org_id: orgId,
      name,
      contact_email: contactEmail || null,
    });

    if (error) {
      toast.error("Failed to create client organization");
    } else {
      toast.success("Client organization created");
      setName("");
      setContactEmail("");
      setShowCreate(false);
      router.refresh();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const supabase = createBrowserSupabaseClient();

    // Delete links first, then client org
    await supabase
      .from("client_building_links")
      .delete()
      .eq("client_org_id", id);

    const { error } = await supabase.from("client_orgs").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete client organization");
    } else {
      toast.success("Client organization deleted");
      router.refresh();
    }
    setDeletingId(null);
  }

  function openEditDialog(org: ClientOrg) {
    setEditOrgId(org.id);
    setEditName(org.name);
    setEditContactEmail(org.contact_email ?? "");
  }

  async function handleEdit() {
    if (!editOrgId) return;

    const result = createClientOrgSchema.safeParse({
      name: editName,
      contact_email: editContactEmail || undefined,
    });
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }

    setEditSaving(true);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from("client_orgs")
      .update({ name: editName, contact_email: editContactEmail || null })
      .eq("id", editOrgId);

    setEditSaving(false);

    if (error) {
      toast.error("Failed to update client organization");
      return;
    }

    toast.success("Client organization updated");
    setEditOrgId(null);
    router.refresh();
  }

  function getLinkedBuildingIds(clientOrgId: string): string[] {
    return clientBuildingLinks
      .filter((l) => l.client_org_id === clientOrgId)
      .map((l) => l.building_id);
  }

  async function toggleBuildingLink(clientOrgId: string, buildingId: string) {
    const supabase = createBrowserSupabaseClient();
    const linked = getLinkedBuildingIds(clientOrgId).includes(buildingId);

    if (linked) {
      await supabase
        .from("client_building_links")
        .delete()
        .eq("client_org_id", clientOrgId)
        .eq("building_id", buildingId);
    } else {
      await supabase.from("client_building_links").insert({
        client_org_id: clientOrgId,
        building_id: buildingId,
      });
    }

    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-h2 text-slate-900">Client Organizations</h2>
          <p className="text-sm-body mt-1 text-slate-500">
            Manage client access to buildings
          </p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Client Organization</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Client Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Acme Corporation"
                />
              </div>
              <div>
                <Label>Contact Email</Label>
                <Input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="client@example.com"
                />
              </div>
              <Button onClick={handleCreate} disabled={saving} className="w-full">
                {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Create Client
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {clientOrgs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
          <p className="text-sm-body text-slate-500">
            No client organizations yet
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {clientOrgs.map((org) => {
            const linkedIds = getLinkedBuildingIds(org.id);
            return (
              <div
                key={org.id}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-body font-semibold text-slate-900">
                      {org.name}
                    </p>
                    {org.contact_email && (
                      <p className="text-caption text-slate-400">
                        {org.contact_email}
                      </p>
                    )}
                    <p className="mt-1 text-caption text-slate-500">
                      {linkedIds.length} building
                      {linkedIds.length !== 1 ? "s" : ""} linked
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(org)}
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Dialog
                      open={linkOrgId === org.id}
                      onOpenChange={(open) =>
                        setLinkOrgId(open ? org.id : null)
                      }
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Link2 className="mr-1.5 h-3.5 w-3.5" />
                          Link Buildings
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            Link Buildings — {org.name}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="max-h-80 space-y-1 overflow-y-auto pt-2">
                          {buildings.length === 0 ? (
                            <p className="text-sm-body text-slate-400 py-4 text-center">
                              No buildings available
                            </p>
                          ) : (
                            buildings.map((b) => {
                              const isLinked = linkedIds.includes(b.id);
                              return (
                                <label
                                  key={b.id}
                                  className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-slate-50"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isLinked}
                                    onChange={() =>
                                      toggleBuildingLink(org.id, b.id)
                                    }
                                    className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                  />
                                  <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-slate-400" />
                                    <span className="text-body text-slate-700">
                                      {b.name}
                                    </span>
                                  </div>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(org.id)}
                      disabled={deletingId === org.id}
                    >
                      {deletingId === org.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5 text-fail" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Client Org Dialog */}
      <Dialog
        open={!!editOrgId}
        onOpenChange={(open) => {
          if (!open) setEditOrgId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Client Organization</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Client Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g., Acme Corporation"
              />
            </div>
            <div>
              <Label>Contact Email</Label>
              <Input
                type="email"
                value={editContactEmail}
                onChange={(e) => setEditContactEmail(e.target.value)}
                placeholder="client@example.com"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOrgId(null)}>
                Cancel
              </Button>
              <Button onClick={handleEdit} disabled={editSaving}>
                {editSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
