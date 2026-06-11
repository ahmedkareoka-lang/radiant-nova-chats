import { getVipTier } from "@/lib/vipConfig";
import VipTierBadge from "@/components/VipTierBadge";

interface VipBadgeProps {
  level: number;
  size?: "sm" | "md" | "lg";
  /** Show the tier title alongside the badge */
  showTitle?: boolean;
  /** Pass the userId to check for exclusive boss verification */
  userId?: string;
}

const SIZE_PX = { sm: 20, md: 28, lg: 38 } as const;

const VipBadge = ({ level, size = "sm", showTitle = false, userId }: VipBadgeProps) => {
  const tier = getVipTier(level);
  if (!tier) return null;

  // هنا بنحط رابط مؤقت للشارة لحد ما نرفع صورتك الحقيقية
  const bossBadgeUrl = "https://img.icons8.com/fluency/48/verified-badge.png";

  // السيستم هيتعرف عليك لأن الـ ID بتاعك BOSS
  const bossUserId = "BOSS";

  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      {/* لو الحساب بتاعك (BOSS) اظهر شارة التوثيق فوراً، غير كده اظهر الـ VIP العادي */}
      {userId === bossUserId ? (
        <img 
          src={bossBadgeUrl} 
          alt="NOVA Owner Verification" 
          style={{ width: `${SIZE_PX[size]}px`, height: `${SIZE_PX[size]}px`, objectFit: 'contain' }}
        />
      ) : (
        <VipTierBadge level={level} size={SIZE_PX[size]} />
      )}
      
      {showTitle && (
        <span
          className="text-xs font-bold"
          style={{ color: `hsl(${tier.glow})`, textShadow: `0 0 6px hsl(${tier.glow} / 0.6)` }}
        >
          {tier.title}
        </span>
      )}
    </span>
  );
};

export default VipBadge;
