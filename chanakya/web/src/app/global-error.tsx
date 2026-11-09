"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en-IN">
      <body style={{ background: "#0b0e11", color: "#e8edf2", fontFamily: "system-ui", padding: 32 }}>
        <h1 style={{ fontSize: 14 }}>CHANAKYA encountered an unexpected error.</h1>
        <button onClick={reset} style={{ marginTop: 12, fontSize: 12 }}>Try again</button>
      </body>
    </html>
  );
}
