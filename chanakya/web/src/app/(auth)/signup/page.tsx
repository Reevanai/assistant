import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata = { title: "Create account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="text-[14px] font-semibold">Create account</h1>
      <SignupForm next={next ?? "/onboarding"} />
      <p className="mt-4 text-[12px] text-muted">
        Already registered? <Link href="/login" className="text-accent hover:underline">Sign in</Link>
      </p>
    </>
  );
}
