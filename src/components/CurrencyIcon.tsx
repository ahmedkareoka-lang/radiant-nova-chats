import novaCoin3d from "@/assets/nova-coin-3d.png";
import blueDiamond3d from "@/assets/blue-diamond-3d.png";

interface CurrencyIconProps {
  type: "gold" | "diamond";
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-8 h-8",
};

const CurrencyIcon = ({ type, size = "sm", className = "" }: CurrencyIconProps) => {
  const src = type === "gold" ? novaCoin3d : blueDiamond3d;
  return (
    <img
      src={src}
      alt={type === "gold" ? "NOVA Coin" : "Diamond"}
      className={`${sizes[size]} object-contain inline-block ${className}`}
      loading="lazy"
    />
  );
};

export default CurrencyIcon;
