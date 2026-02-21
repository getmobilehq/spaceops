import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { Logo } from "@/components/shared/logo";

export default function LoginPage() {
  return (
    <>
      <div className="mb-10 flex justify-center">
        <Logo variant="dark" size="lg" />
      </div>
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
        <h1 className="text-h1 mb-1 text-center tracking-tight text-white">Welcome back</h1>
        <p className="text-sm-body mb-6 text-center text-slate-400">
          Sign in to your account
        </p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </>
  );
}
