import { Skeleton } from "@/components/ui/skeleton";

/**
 * Profile page skeleton — shown while profile data is loading.
 * Mirrors the real layout (cover + circular avatar + stats) so users perceive instant load.
 */
const ProfileSkeleton = () => (
  <div className="min-h-screen pb-24">
    {/* Cover placeholder */}
    <div className="relative w-full h-56">
      <Skeleton className="w-full h-full rounded-none" />
      {/* Avatar placeholder overlapping */}
      <div className="absolute left-1/2 -translate-x-1/2 -bottom-14 z-10">
        <Skeleton className="w-32 h-32 rounded-full border-4 border-background" />
      </div>
    </div>

    <div className="px-4 max-w-lg mx-auto pt-20 space-y-4">
      {/* Name */}
      <div className="flex flex-col items-center space-y-2">
        <Skeleton className="h-7 w-40 rounded-md" />
        <Skeleton className="h-4 w-28 rounded-md" />
      </div>

      {/* Followers / Following row */}
      <div className="flex justify-center gap-6 pt-2">
        <Skeleton className="h-12 w-20 rounded-xl" />
        <Skeleton className="h-12 w-20 rounded-xl" />
        <Skeleton className="h-12 w-20 rounded-xl" />
      </div>

      {/* Wealth/Charm bars */}
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="h-20 w-full rounded-2xl" />

      {/* Menu rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-xl" />
      ))}
    </div>
  </div>
);

export default ProfileSkeleton;
