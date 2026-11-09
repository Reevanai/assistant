import { redirect } from "next/navigation";
import { isConfigured } from "@/lib/env";
import { getCurrentUser, getDefaultOrgSlug } from "@/lib/data/session";
import { orgPath } from "@/lib/domain/routes";
import { SetupRequired } from "@/components/setup-required";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!isConfigured()) return <SetupRequired />;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const slug = await getDefaultOrgSlug();
  redirect(slug ? orgPath(slug) : "/onboarding");
}
