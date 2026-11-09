"use client";
import { useEffect, useState } from "react";

const fmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata", weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
});

export function IstClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return (
    <time className="font-mono text-[11px] text-muted tabular-nums" suppressHydrationWarning>
      {now ? `${fmt.format(now)} IST` : " "}
    </time>
  );
}
