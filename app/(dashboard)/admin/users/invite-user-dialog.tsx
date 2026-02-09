"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2, UserPlus } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { inviteUserSchema } from "@/lib/validators/schemas";
import { toast } from "sonner";
import type { UserRole } from "@/lib/types/database";

interface InviteUserDialogProps {
  orgId: string;
  userId: string;
}

export function InviteUserDialog({ orgId, userId }: InviteUserDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("staff");

  function generateToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsed = inviteUserSchema.safeParse({ email, role });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    const supabase = createBrowserSupabaseClient();
    const token = generateToken();

    const { error } = await supabase.from("invitations").insert({
      org_id: orgId,
      email,
      role,
      token,
      invited_by: userId,
    });

    setLoading(false);

    if (error) {
      toast.error("Failed to create invitation");
      return;
    }

    const inviteUrl = `${window.location.origin}/signup/${token}`;
    await navigator.clipboard.writeText(inviteUrl);
    toast.success("Invitation created! Link copied to clipboard.");

    setEmail("");
    setRole("staff");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-primary-600 font-semibold text-white hover:bg-primary-700"
        >
          <UserPlus className="mr-1.5 h-4 w-4" />
          Invite User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm-body font-semibold text-slate-700">
              Email Address
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@company.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm-body font-semibold text-slate-700">
              Role
            </Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as UserRole)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="client">Client</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary-600 font-semibold text-white hover:bg-primary-700"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Invitation
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
