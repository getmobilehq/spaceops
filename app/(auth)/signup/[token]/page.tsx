import { Suspense } from "react";
import { SignupForm } from "./signup-form";
import { Logo } from "@/components/shared/logo";

export default async function SignupPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <>
      <div className="mb-8 flex justify-center">
        <Logo variant="dark" size="lg" />
      </div>
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h1 className="text-h2 mb-1 text-center text-white">
          Create your account
        </h1>
        <p className="text-sm-body mb-6 text-center text-slate-400">
          You&apos;ve been invited to join SpaceOps
        </p>
        <Suspense>
          <SignupForm token={token} />
        </Suspense>
      </div>
    </>
  );
}
