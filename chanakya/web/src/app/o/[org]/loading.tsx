import { SkeletonRows } from "@/components/ui/panel";

export default function Loading() {
  return <div className="p-3"><SkeletonRows rows={10} /></div>;
}
