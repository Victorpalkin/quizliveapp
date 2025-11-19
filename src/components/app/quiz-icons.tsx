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

export const StarIcon = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 100 100"
    className={cn("fill-current", className)}
    aria-hidden="true"
  >
    <polygon points="50 5, 61 38, 95 38, 68 58, 79 91, 50 71, 21 91, 32 58, 5 38, 39 38" />
  </svg>
);

export const PentagonIcon = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 100 100"
    className={cn("fill-current", className)}
    aria-hidden="true"
  >
    <polygon points="50 5, 95 38, 79 88, 21 88, 5 38" />
  </svg>
);

export const HexagonIcon = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 100 100"
    className={cn("fill-current", className)}
    aria-hidden="true"
  >
    <polygon points="25 10, 75 10, 100 50, 75 90, 25 90, 0 50" />
  </svg>
);

export const HeartIcon = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 100 100"
    className={cn("fill-current", className)}
    aria-hidden="true"
  >
    <path d="M50 85 C20 60, 5 45, 5 30 C5 15, 15 5, 27 5 C35 5, 42 10, 50 20 C58 10, 65 5, 73 5 C85 5, 95 15, 95 30 C95 45, 80 60, 50 85 Z" />
  </svg>
);
