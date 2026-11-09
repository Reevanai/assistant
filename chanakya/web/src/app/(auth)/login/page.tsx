import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <>
      <h1 className="text-[14px] font-semibold">Sign in</h1>
      {error ? <p role="alert" className="mt-2 text-[12px] text-danger">That link is invalid or has expired. Sign in to continue.</p> : null}
      <LoginForm next={next ?? "/"} />
      <p className="mt-4 text-[12px] text-muted">
        No account? <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-accent hover:underline">Create one</Link>
      </p>
    </>
  );
}
