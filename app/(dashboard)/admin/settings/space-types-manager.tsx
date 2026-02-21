"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Loader2,
  Trash2,
  Tag,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { createSpaceTypeSchema } from "@/lib/validators/schemas";
import { toast } from "sonner";
import type { SpaceType } from "@/lib/types/helpers";

interface SpaceTypesManagerProps {
  orgId: string;
  customTypes: SpaceType[];
  defaultTypes: SpaceType[];
}

export function SpaceTypesManager({
  orgId,
  customTypes,
  defaultTypes,
}: SpaceTypesManagerProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();

    const parsed = createSpaceTypeSchema.safeParse({ name });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    const supabase = createBrowserSupabaseClient();

    const { error } = await supabase.from("space_types").insert({
      org_id: orgId,
      name,
    });

    setLoading(false);

    if (error) {
      if (error.code === "23505") {
        toast.error("This space type already exists");
      } else {
        toast.error("Failed to add space type");
      }
      return;
    }

    toast.success("Space type added");
    setName("");
    router.refresh();
  }

  async function handleRename(typeId: string) {
    const parsed = createSpaceTypeSchema.safeParse({ name: editingName });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setRenameSaving(true);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from("space_types")
      .update({ name: editingName })
      .eq("id", typeId);

    setRenameSaving(false);

    if (error) {
      if (error.code === "23505") {
        toast.error("A space type with this name already exists");
      } else {
        toast.error("Failed to rename space type");
      }
      return;
    }

    toast.success("Space type renamed");
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(typeId: string) {
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from("space_types")
      .delete()
      .eq("id", typeId);

    if (error) {
      toast.error("Cannot delete — type is in use by spaces");
      return;
    }

    toast.success("Space type removed");
    router.refresh();
  }

  return (
    <div>
      <h2 className="text-h2 mb-3 text-slate-900">Space Types</h2>

      {/* System defaults */}
      <div className="mb-4">
        <p className="text-label mb-2 uppercase text-slate-500">
          System Defaults
        </p>
        <div className="flex flex-wrap gap-2">
          {defaultTypes.map((t) => (
            <span
              key={t.id}
              className="rounded-full bg-slate-100 px-3 py-1 text-caption text-slate-600"
            >
              {t.name}
            </span>
          ))}
        </div>
      </div>

      {/* Custom types */}
      <div className="mb-4">
        <p className="text-label mb-2 uppercase text-slate-500">
          Custom Types
        </p>
        {customTypes.length === 0 ? (
          <p className="text-sm-body text-slate-400">No custom types added</p>
        ) : (
          <div className="space-y-1">
            {customTypes.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                {editingId === t.id ? (
                  <>
                    <div className="flex flex-1 items-center gap-2">
                      <Tag className="h-3.5 w-3.5 text-primary-500" />
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-7 max-w-xs text-body"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(t.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleRename(t.id)}
                        disabled={renameSaving}
                      >
                        {renameSaving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5 text-pass" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditingId(null)}
                        disabled={renameSaving}
                      >
                        <X className="h-3.5 w-3.5 text-slate-400" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5 text-primary-500" />
                      <span className="text-body text-slate-700">{t.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditingId(t.id);
                          setEditingName(t.name);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5 text-slate-400" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDelete(t.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-slate-400" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New space type name"
          className="max-w-xs"
          required
        />
        <Button
          type="submit"
          size="sm"
          disabled={loading}
          variant="outline"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
