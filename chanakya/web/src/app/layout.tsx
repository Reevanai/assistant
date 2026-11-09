import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "CHANAKYA", template: "%s · CHANAKYA" },
  description: "Political, government and public-affairs intelligence for India.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
