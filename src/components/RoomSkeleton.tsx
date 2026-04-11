import { Skeleton } from "@/components/ui/skeleton";

const RoomSkeleton = () => (
  <div className="rounded-2xl overflow-hidden border border-border/30" style={{ aspectRatio: "16/10" }}>
    <Skeleton className="w-full h-full rounded-none" />
  </div>
);

export default RoomSkeleton;
