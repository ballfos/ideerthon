import { 
  Monitor, 
  CakeSlice, 
  Brush, 
  Candy, 
  Calculator, 
  Hamburger, 
  Building, 
  Smile, 
  Heart, 
  Crown,
  User,
  type LucideIcon
} from "lucide-react";
import { cn } from "@/utils/ui/cn";

export const ICON_MAP: Record<string, LucideIcon> = {
  "monitor": Monitor,
  "cake-slice": CakeSlice,
  "brush": Brush,
  "candy": Candy,
  "calculator": Calculator,
  "hamburger": Hamburger,
  "building": Building,
  "smile": Smile,
  "heart": Heart, 
  "crown": Crown,
};

export const NAME_TO_ICON_MAP: Record<string, string> = {
  "若手エンジニア": "monitor",
  "女子高生": "cake-slice",
  "デザイナー": "brush",
  "おばちゃん": "candy",
  "敏腕マーケター": "calculator",
  "アメリカ人トム": "hamburger",
  "辛口ベンチャーキャピタル": "building",
  "小学生": "smile",
  "おばあちゃん": "heart",
  "アイディアー🦌": "🦌",
};

interface AgentIconProps {
  iconName?: string;
  agentName?: string;
  className?: string;
  size?: number;
}

export function AgentIcon({ iconName, agentName, className, size = 20 }: AgentIconProps) {
  const resolvedIconName = iconName || (agentName ? NAME_TO_ICON_MAP[agentName] : undefined);
  
  if (resolvedIconName && /\p{Emoji}/u.test(resolvedIconName) && !ICON_MAP[resolvedIconName.toLowerCase()]) {
    return (
      <span 
        className={cn("flex items-center justify-center font-normal leading-none select-none", className)}
        style={{ fontSize: size * 0.9 }}
      >
        {resolvedIconName}
      </span>
    );
  }

  const IconComponent = resolvedIconName ? ICON_MAP[resolvedIconName.toLowerCase()] : null;

  if (IconComponent) {
    return <IconComponent className={cn("text-[#7a6446]", className)} size={size} />;
  }

  return <User className={cn("text-[#7a6446]", className)} size={size} />;
}
