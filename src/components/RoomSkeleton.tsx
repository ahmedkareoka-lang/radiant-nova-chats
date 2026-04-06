import { Skeleton } from "@/components/ui/skeleton";

const RoomSkeleton = () => (
  <div className="card-glass p-3">
    <div className="flex items-center gap-3">
      <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4 rounded-lg" />
        <Skeleton className="h-3 w-1/2 rounded-lg" />
      </div>
      <div className="flex flex-col items-end gap-1">
        <Skeleton className="h-4 w-12 rounded-full" />
        <Skeleton className="h-3 w-8 rounded-full" />
      </div>
    </div>
    <div className="mt-2 flex gap-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="w-3 h-3 rounded-full" />
      ))}
    </div>
  </div>
);

export default RoomSkeleton;
