"use client";
import { Button } from "@/components/ui/button";

export default function OrgError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="p-4">
      <div role="alert" className="max-w-xl border border-danger/40 bg-danger/10 p-4">
        <p className="text-[13px] font-semibold text-danger">This view failed to load.</p>
        <p className="mt-1 text-[12px] text-muted">{error.digest ? `Reference ${error.digest}. ` : ""}The error has been logged on the server.</p>
        <Button className="mt-3" onClick={reset}>Retry</Button>
      </div>
    </div>
  );
}
