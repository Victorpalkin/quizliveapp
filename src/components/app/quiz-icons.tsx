import { cn } from "@/lib/utils";

type IconProps = {
  className?: string;
};

export const TriangleIcon = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 100 100"
    className={cn("fill-current", className)}
    aria-hidden="true"
  >
    <polygon points="50 15, 100 85, 0 85" />
  </svg>
);

export const DiamondIcon = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 100 100"
    className={cn("fill-current", className)}
    aria-hidden="true"
  >
    <polygon points="50 0, 100 50, 50 100, 0 50" />
  </svg>
);

export const SquareIcon = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 100 100"
    className={cn("fill-current", className)}
    aria-hidden="true"
  >
    <rect x="10" y="10" width="80" height="80" />
  </svg>
);

export const CircleIcon = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 100 100"
    className={cn("fill-current", className)}
    aria-hidden="true"
  >
    <circle cx="50" cy="50" r="45" />
  </svg>
);
