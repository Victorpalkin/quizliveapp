import {
  Image as ImageIcon,
  FileQuestion,
  Vote,
  MessageSquare,
  Star,
  Trophy,
  HelpCircle,
  Disc3,
  ClipboardList,
  BarChart3,
  Sparkles,
  Workflow,
} from 'lucide-react';
import type { PresentationSlide, SlideElement } from '@/lib/types';
import { cn } from '@/lib/utils';

// Thumbnail is ~154px wide in 180px panel. Virtual canvas = 960px. Scale ~ 0.16
export const FONT_SCALE = 0.16;

export const ELEMENT_ICON_CONFIG: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  quiz: { icon: FileQuestion, color: 'text-purple-500' },
  poll: { icon: Vote, color: 'text-teal-500' },
  thoughts: { icon: MessageSquare, color: 'text-blue-500' },
  rating: { icon: Star, color: 'text-orange-500' },
  evaluation: { icon: ClipboardList, color: 'text-indigo-500' },
  'quiz-results': { icon: BarChart3, color: 'text-purple-500' },
  'poll-results': { icon: BarChart3, color: 'text-teal-500' },
  'thoughts-results': { icon: BarChart3, color: 'text-blue-500' },
  'rating-results': { icon: BarChart3, color: 'text-orange-500' },
  'evaluation-results': { icon: BarChart3, color: 'text-indigo-500' },
  leaderboard: { icon: Trophy, color: 'text-yellow-500' },
  qa: { icon: HelpCircle, color: 'text-green-500' },
  'spin-wheel': { icon: Disc3, color: 'text-pink-500' },
  'ai-step': { icon: Sparkles, color: 'text-violet-500' },
  'agentic-designer': { icon: Workflow, color: 'text-cyan-500' },
  'agentic-designer-results': { icon: BarChart3, color: 'text-cyan-500' },
};

export function ElementPreview({ element }: { element: SlideElement }) {
  if (element.type === 'text') {
    const fontSize = Math.max(4, (element.fontSize || 24) * FONT_SCALE);
    return (
      <div
        className="w-full h-full overflow-hidden"
        style={{
          fontSize: `${fontSize}px`,
          fontWeight: element.fontWeight || 'normal',
          fontStyle: element.fontStyle || 'normal',
          textAlign: element.textAlign || 'left',
          color: element.color || 'inherit',
          lineHeight: element.lineHeight || 1.2,
        }}
      >
        {element.content || ''}
      </div>
    );
  }

  if (element.type === 'image') {
    if (element.imageUrl) {
      return (
        <img
          src={element.imageUrl}
          alt=""
          className="w-full h-full"
          style={{
            objectFit: element.objectFit || 'cover',
            borderRadius: element.borderRadius
              ? `${Math.max(1, element.borderRadius * FONT_SCALE)}px`
              : undefined,
          }}
          draggable={false}
        />
      );
    }
    return (
      <div className="w-full h-full bg-muted/30 flex items-center justify-center">
        <ImageIcon className="h-3 w-3 text-muted-foreground/50" />
      </div>
    );
  }

  if (element.type === 'shape') {
    return (
      <div
        className="w-full h-full"
        style={{
          backgroundColor: element.backgroundColor || 'transparent',
          borderColor: element.borderColor || 'transparent',
          borderWidth: element.borderWidth
            ? `${Math.max(1, element.borderWidth * FONT_SCALE)}px`
            : undefined,
          borderStyle: element.borderWidth ? 'solid' : undefined,
          borderRadius:
            element.shapeType === 'circle'
              ? '50%'
              : element.shapeType === 'rounded-rect'
                ? '4px'
                : undefined,
          clipPath:
            element.shapeType === 'triangle'
              ? 'polygon(50% 0%, 0% 100%, 100% 100%)'
              : element.shapeType === 'arrow-right'
                ? 'polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%)'
                : undefined,
          transform:
            element.shapeType === 'diamond' ? 'rotate(45deg)' : undefined,
        }}
      />
    );
  }

  if (element.type === 'connector' && element.connectorConfig) {
    const cfg = element.connectorConfig;
    // Simple line preview for thumbnails
    const bbox = {
      x: Math.min(cfg.startX, cfg.endX),
      y: Math.min(cfg.startY, cfg.endY),
      width: Math.max(2, Math.abs(cfg.endX - cfg.startX)),
      height: Math.max(2, Math.abs(cfg.endY - cfg.startY)),
    };
    const lx1 = ((cfg.startX - bbox.x) / bbox.width) * 100;
    const ly1 = ((cfg.startY - bbox.y) / bbox.height) * 100;
    const lx2 = ((cfg.endX - bbox.x) / bbox.width) * 100;
    const ly2 = ((cfg.endY - bbox.y) / bbox.height) * 100;
    return (
      <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
        <line
          x1={lx1} y1={ly1} x2={lx2} y2={ly2}
          stroke={cfg.strokeColor}
          strokeWidth={Math.max(1, cfg.strokeWidth * FONT_SCALE)}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  const iconConfig = ELEMENT_ICON_CONFIG[element.type];
  if (iconConfig) {
    const Icon = iconConfig.icon;
    return (
      <div className="w-full h-full rounded-sm bg-muted/30 flex items-center justify-center">
        <Icon className={cn('h-3 w-3', iconConfig.color)} />
      </div>
    );
  }

  return null;
}

function getSlideBackground(slide: PresentationSlide): React.CSSProperties {
  const bgStyle: React.CSSProperties = {};
  if (slide.background) {
    if (slide.background.type === 'solid' && slide.background.color) {
      bgStyle.backgroundColor = slide.background.color;
    } else if (
      slide.background.type === 'gradient' &&
      slide.background.gradient
    ) {
      bgStyle.background = slide.background.gradient;
    } else if (
      slide.background.type === 'image' &&
      slide.background.imageUrl
    ) {
      bgStyle.backgroundImage = `url(${slide.background.imageUrl})`;
      bgStyle.backgroundSize = 'cover';
    }
  } else {
    bgStyle.backgroundColor = '#ffffff';
  }
  return bgStyle;
}

export function SlideThumbnail({
  slide,
  index,
  isActive,
  className,
  onClick,
}: {
  slide: PresentationSlide;
  index: number;
  isActive: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const bgStyle = getSlideBackground(slide);

  return (
    <div
      className={cn('flex items-stretch gap-1.5', className)}
      onClick={onClick}
    >
      {/* Active indicator */}
      <div
        className={cn(
          'w-1 rounded-full flex-shrink-0 transition-all duration-200',
          isActive
            ? 'bg-gradient-to-b from-primary to-accent'
            : 'bg-transparent'
        )}
      />
      <div
        className={cn(
          'relative flex-1 aspect-video rounded-md overflow-hidden transition-all duration-200',
          isActive
            ? 'shadow-lg shadow-primary/15 ring-1 ring-primary/30'
            : 'shadow-sm'
        )}
        style={bgStyle}
      >
        {/* Rich element previews */}
        <div className="absolute inset-0 pointer-events-none">
          {slide.elements
            .slice()
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((el) => (
              <div
                key={el.id}
                className="absolute overflow-hidden"
                style={{
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  width: `${el.width}%`,
                  height: `${el.height}%`,
                  opacity: el.opacity ?? 1,
                  transform: el.rotation
                    ? `rotate(${el.rotation}deg)`
                    : undefined,
                }}
              >
                <ElementPreview element={el} />
              </div>
            ))}
        </div>

        {/* Slide number */}
        <div className="absolute bottom-0.5 left-1 text-[9px] font-mono text-muted-foreground bg-background/70 px-1 rounded">
          {index + 1}
        </div>
      </div>
    </div>
  );
}
