"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

interface SignupFormProps {
  token: string;
}

interface InvitationData {
  id: string;
  email: string;
  role: string;
  org_id: string;
  expires_at: string;
}

export function SignupForm({ token }: SignupFormProps) {
  const router = useRouter();
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);

  useEffect(() => {
    async function checkInvitation() {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("token", token)
        .eq("accepted", false)
        .single();

      if (error || !data) {
        setInviteError("This invitation link is invalid or has already been used.");
        setCheckingToken(false);
        return;
      }

      const inv = data as unknown as InvitationData;
      if (new Date(inv.expires_at) < new Date()) {
        setInviteError("This invitation has expired. Please ask your admin for a new one.");
        setCheckingToken(false);
        return;
      }

      setInvitation(inv);
      setCheckingToken(false);
    }

    checkInvitation();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!invitation) return;

    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (name.length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }

    setLoading(true);

    try {
      // Use server-side API route (service role) to create account + profile
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Failed to create account");
        return;
      }

      // Sign in with the newly created credentials
      const supabase = createBrowserSupabaseClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password,
      });

      if (signInError) {
        setError("Account created but sign-in failed. Please go to the login page.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingToken) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary-400" />
      </div>
    );
  }

  if (inviteError) {
    return (
      <div className="py-4 text-center">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-warning" />
        <p className="text-sm-body text-slate-300">{inviteError}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-md bg-slate-800 px-3 py-2 text-caption text-slate-400">
        Signing up as{" "}
        <span className="font-semibold text-slate-200">{invitation?.email}</span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm-body font-semibold text-slate-300">
          Full Name
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Smith"
          required
          className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 focus-visible:ring-primary-500"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm-body font-semibold text-slate-300">
          Password
        </Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 focus-visible:ring-primary-500"
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="confirmPassword"
          className="text-sm-body font-semibold text-slate-300"
        >
          Confirm Password
        </Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 focus-visible:ring-primary-500"
        />
      </div>

      {error && (
        <div className="rounded-md bg-fail-bg px-3 py-2 text-caption text-fail">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-primary-600 font-semibold text-white hover:bg-primary-700"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating account...
          </>
        ) : (
          "Create Account"
        )}
      </Button>
    </form>
  );
}
