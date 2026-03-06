'use client';

import { useRef, useState, useCallback } from 'react';
import { useStorage } from '@/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { nanoid } from 'nanoid';
import type { PresentationSlide, SlideElement, SlideElementType, PresentationTheme } from '@/lib/types';
import { TextElement } from './elements/TextElement';
import { ImageElement } from './elements/ImageElement';
import { ShapeElement } from './elements/ShapeElement';
import { ConnectorElement } from './elements/ConnectorElement';
import { InteractiveElement } from './elements/InteractiveElement';
import { ResultsElement } from './elements/ResultsElement';
import { SelectionOverlay } from './elements/SelectionOverlay';
import { ConnectorSelectionOverlay } from './elements/ConnectorSelectionOverlay';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Copy,
  ClipboardPaste,
  CopyPlus,
  Trash2,
  ArrowUpToLine,
  ArrowDownToLine,
  Lock,
  Unlock,
  Upload,
} from 'lucide-react';

interface SlideCanvasProps {
  slide: PresentationSlide | null;
  selectedElementId: string | null;
  selectedElementIds: string[];
  onSelectElement: (elementId: string | null) => void;
  onToggleSelectElement: (elementId: string) => void;
  onUpdateElement: (elementId: string, updates: Partial<SlideElement>) => void;
  onDeleteElement: (elementId: string) => void;
  onAddElement: (type: SlideElementType, overrides?: Partial<SlideElement>) => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onCopyElement: () => void;
  onPasteElement: () => void;
  onDuplicateElement: () => void;
  theme: PresentationTheme;
  editingElementId: string | null;
  onStartEditing: (elementId: string) => void;
  onStopEditing: () => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onStartDrag: () => void;
  onEndDrag: () => void;
}

const INTERACTIVE_TYPES = ['quiz', 'poll', 'thoughts', 'rating', 'evaluation'];
const RESULTS_TYPES = ['quiz-results', 'poll-results', 'thoughts-results', 'rating-results', 'evaluation-results'];
const SPECIAL_TYPES = ['leaderboard', 'qa', 'spin-wheel'];

const SNAP_THRESHOLD = 2; // % threshold for snapping

interface GuideLine {
  orientation: 'horizontal' | 'vertical';
  position: number; // %
}

function ElementRenderer({
  element,
  isSelected,
  onSelect,
  isEditing,
  onStartEditing,
  onStopEditing,
  onUpdateContent,
  onUploadImage,
}: {
  element: SlideElement;
  isSelected: boolean;
  onSelect: () => void;
  isEditing?: boolean;
  onStartEditing?: () => void;
  onStopEditing?: () => void;
  onUpdateContent?: (content: string) => void;
  onUploadImage?: () => void;
}) {
  if (element.type === 'text') {
    return (
      <TextElement
        element={element}
        isSelected={isSelected}
        isEditing={isEditing}
        onStartEditing={onStartEditing}
        onStopEditing={onStopEditing}
        onUpdateContent={onUpdateContent}
      />
    );
  }
  if (element.type === 'image') {
    return <ImageElement element={element} onUpload={onUploadImage} />;
  }
  if (element.type === 'shape') {
    return <ShapeElement element={element} />;
  }
  if (element.type === 'connector') {
    return <ConnectorElement element={element} />;
  }
  if (INTERACTIVE_TYPES.includes(element.type) || SPECIAL_TYPES.includes(element.type)) {
    return <InteractiveElement element={element} />;
  }
  if (RESULTS_TYPES.includes(element.type)) {
    return <ResultsElement element={element} />;
  }

  return (
    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
      {element.type}
    </div>
  );
}

export function SlideCanvas({
  slide,
  selectedElementId,
  selectedElementIds,
  onSelectElement,
  onToggleSelectElement,
  onUpdateElement,
  onDeleteElement,
  onAddElement,
  onBringToFront,
  onSendToBack,
  onCopyElement,
  onPasteElement,
  onDuplicateElement,
  theme,
  editingElementId,
  onStartEditing,
  onStopEditing,
  zoom,
  onZoomChange,
  onStartDrag,
  onEndDrag,
}: SlideCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{
    x: number; y: number; elX: number; elY: number;
    connectorConfig?: SlideElement['connectorConfig'];
  } | null>(null);
  const [guideLines, setGuideLines] = useState<GuideLine[]>([]);
  const storage = useStorage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadElementIdRef = useRef<string | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; elementId: string } | null>(null);

  // File drag-and-drop state
  const [isFileDragOver, setIsFileDragOver] = useState(false);

  if (!slide) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        No slide selected
      </div>
    );
  }

  const bgStyle: React.CSSProperties = {};
  if (slide.background) {
    if (slide.background.type === 'solid' && slide.background.color) {
      bgStyle.backgroundColor = slide.background.color;
    } else if (slide.background.type === 'gradient' && slide.background.gradient) {
      bgStyle.background = slide.background.gradient;
    } else if (slide.background.type === 'image' && slide.background.imageUrl) {
      bgStyle.backgroundImage = `url(${slide.background.imageUrl})`;
      bgStyle.backgroundSize = 'cover';
      bgStyle.backgroundPosition = 'center';
    }
  } else {
    bgStyle.backgroundColor = '#ffffff';
  }

  // Sort elements by zIndex for rendering order
  const sortedElements = [...slide.elements].sort((a, b) => a.zIndex - b.zIndex);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).dataset.canvas) {
      onSelectElement(null);
    }
    setContextMenu(null);
  };

  // Snap guide calculation
  const calculateSnap = (
    elX: number, elY: number, elWidth: number, elHeight: number,
    draggedId: string, shiftHeld: boolean
  ): { x: number; y: number; guides: GuideLine[] } => {
    if (shiftHeld) return { x: elX, y: elY, guides: [] };

    const guides: GuideLine[] = [];
    let snappedX = elX;
    let snappedY = elY;

    // Snap targets: slide center, edges, and other elements
    const vTargets = [0, 50, 100]; // vertical guide positions
    const hTargets = [0, 50, 100]; // horizontal guide positions

    slide.elements.forEach((el) => {
      if (el.id === draggedId) return;
      vTargets.push(el.x, el.x + el.width / 2, el.x + el.width);
      hTargets.push(el.y, el.y + el.height / 2, el.y + el.height);
    });

    // Check element edges and center against targets
    const elCenterX = elX + elWidth / 2;
    const elRight = elX + elWidth;
    const elCenterY = elY + elHeight / 2;
    const elBottom = elY + elHeight;

    for (const target of vTargets) {
      if (Math.abs(elX - target) < SNAP_THRESHOLD) {
        snappedX = target;
        guides.push({ orientation: 'vertical', position: target });
        break;
      }
      if (Math.abs(elCenterX - target) < SNAP_THRESHOLD) {
        snappedX = target - elWidth / 2;
        guides.push({ orientation: 'vertical', position: target });
        break;
      }
      if (Math.abs(elRight - target) < SNAP_THRESHOLD) {
        snappedX = target - elWidth;
        guides.push({ orientation: 'vertical', position: target });
        break;
      }
    }

    for (const target of hTargets) {
      if (Math.abs(elY - target) < SNAP_THRESHOLD) {
        snappedY = target;
        guides.push({ orientation: 'horizontal', position: target });
        break;
      }
      if (Math.abs(elCenterY - target) < SNAP_THRESHOLD) {
        snappedY = target - elHeight / 2;
        guides.push({ orientation: 'horizontal', position: target });
        break;
      }
      if (Math.abs(elBottom - target) < SNAP_THRESHOLD) {
        snappedY = target - elHeight;
        guides.push({ orientation: 'horizontal', position: target });
        break;
      }
    }

    return { x: snappedX, y: snappedY, guides };
  };

  const handleMouseDown = (e: React.MouseEvent, element: SlideElement) => {
    if (element.locked) return;
    if (editingElementId === element.id) return;
    e.stopPropagation();

    // Shift+click for multi-select
    if (e.shiftKey) {
      onToggleSelectElement(element.id);
      return;
    }

    onSelectElement(element.id);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      elX: element.x,
      elY: element.y,
      connectorConfig: element.connectorConfig ? { ...element.connectorConfig } : undefined,
    };

    let hasMoved = false;

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragStartRef.current) return;

      if (!hasMoved) {
        hasMoved = true;
        setIsDragging(true);
        onStartDrag();
      }

      const dx = ((ev.clientX - dragStartRef.current.x) / rect.width) * 100;
      const dy = ((ev.clientY - dragStartRef.current.y) / rect.height) * 100;

      const rawX = Math.max(0, Math.min(100 - element.width, dragStartRef.current.elX + dx));
      const rawY = Math.max(0, Math.min(100 - element.height, dragStartRef.current.elY + dy));

      const { x: snapX, y: snapY, guides } = calculateSnap(
        rawX, rawY, element.width, element.height, element.id, ev.shiftKey
      );

      setGuideLines(guides);

      // For connectors, translate both endpoints relative to initial config
      if (element.type === 'connector' && dragStartRef.current.connectorConfig) {
        const initCfg = dragStartRef.current.connectorConfig;
        const offsetX = snapX - dragStartRef.current.elX;
        const offsetY = snapY - dragStartRef.current.elY;
        onUpdateElement(element.id, {
          x: snapX,
          y: snapY,
          connectorConfig: {
            ...initCfg,
            startX: initCfg.startX + offsetX,
            startY: initCfg.startY + offsetY,
            endX: initCfg.endX + offsetX,
            endY: initCfg.endY + offsetY,
            startAttachment: undefined,
            endAttachment: undefined,
          },
        });
      } else {
        onUpdateElement(element.id, { x: snapX, y: snapY });
      }
    };

    const handleMouseUp = () => {
      dragStartRef.current = null;
      if (hasMoved) {
        setIsDragging(false);
        onEndDrag();
      }
      setGuideLines([]);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleResize = useCallback(
    (elementId: string, newWidth: number, newHeight: number, newX?: number, newY?: number) => {
      const updates: Partial<SlideElement> = {
        width: Math.max(5, newWidth),
        height: Math.max(5, newHeight),
      };
      if (newX !== undefined) updates.x = Math.max(0, newX);
      if (newY !== undefined) updates.y = Math.max(0, newY);
      onUpdateElement(elementId, updates);
    },
    [onUpdateElement]
  );

  // Context menu
  const handleContextMenu = (e: React.MouseEvent, element: SlideElement) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectElement(element.id);
    setContextMenu({ x: e.clientX, y: e.clientY, elementId: element.id });
  };

  const contextElement = contextMenu
    ? slide.elements.find((el) => el.id === contextMenu.elementId)
    : null;

  // Zoom with Ctrl+scroll
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      onZoomChange(Math.max(0.25, Math.min(2, zoom + delta)));
    }
  };

  // Image upload handler for click-to-upload on canvas
  const handleImageUpload = useCallback((elementId: string) => {
    uploadElementIdRef.current = elementId;
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storage || !uploadElementIdRef.current) return;

    const imageRef = ref(storage, `presentations/images/${nanoid()}`);
    await uploadBytes(imageRef, file);
    const url = await getDownloadURL(imageRef);
    onUpdateElement(uploadElementIdRef.current, { imageUrl: url });
    uploadElementIdRef.current = null;
    e.target.value = '';
  };

  // Drag-and-drop file handling
  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      setIsFileDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsFileDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsFileDragOver(false);

    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0 || !storage) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    for (const file of files) {
      const imageRef = ref(storage, `presentations/images/${nanoid()}`);
      await uploadBytes(imageRef, file);
      const url = await getDownloadURL(imageRef);

      const dropX = ((e.clientX - rect.left) / rect.width) * 100;
      const dropY = ((e.clientY - rect.top) / rect.height) * 100;

      onAddElement('image', {
        imageUrl: url,
        x: Math.max(0, Math.min(60, dropX - 20)),
        y: Math.max(0, Math.min(60, dropY - 20)),
        width: 40,
        height: 40,
      });
    }
  };

  const hasBackground = slide.background && (
    (slide.background.type === 'solid' && slide.background.color) ||
    (slide.background.type === 'gradient' && slide.background.gradient) ||
    (slide.background.type === 'image' && slide.background.imageUrl)
  );

  return (
    <div
      className="flex-1 flex items-center justify-center p-6 overflow-hidden bg-muted/20"
      onWheel={handleWheel}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div
        ref={canvasRef}
        className={`relative shadow-xl rounded-lg overflow-hidden ${!hasBackground ? 'bg-grid-dots' : ''}`}
        style={{
          ...bgStyle,
          aspectRatio: '16 / 9',
          width: '100%',
          maxWidth: '960px',
          maxHeight: 'calc(100vh - 140px)',
          cursor: isDragging ? 'grabbing' : 'default',
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.2s ease',
        }}
        onClick={handleCanvasClick}
        data-canvas="true"
      >
        {/* File drop zone overlay */}
        {isFileDragOver && (
          <div className="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center gap-2 text-primary">
              <Upload className="h-8 w-8" />
              <span className="text-sm font-medium">Drop image here</span>
            </div>
          </div>
        )}

        {/* Snap guide lines */}
        {guideLines.map((guide, i) => (
          <div
            key={i}
            className="absolute pointer-events-none z-[100]"
            style={
              guide.orientation === 'vertical'
                ? {
                    left: `${guide.position}%`,
                    top: 0,
                    bottom: 0,
                    width: '1px',
                    backgroundColor: '#3b82f6',
                  }
                : {
                    top: `${guide.position}%`,
                    left: 0,
                    right: 0,
                    height: '1px',
                    backgroundColor: '#3b82f6',
                  }
            }
          />
        ))}

        {sortedElements.map((element) => {
          const isSelected = selectedElementIds.includes(element.id);
          return (
            <div
              key={element.id}
              className={`absolute group/el transition-shadow duration-150 ${
                isDragging && element.id === selectedElementId ? 'shadow-2xl' : ''
              }`}
              style={{
                left: `${element.x}%`,
                top: `${element.y}%`,
                width: `${element.width}%`,
                height: `${element.height}%`,
                zIndex: element.zIndex,
                opacity: element.opacity ?? 1,
                transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
                cursor: element.locked ? 'default' : isDragging ? 'grabbing' : 'grab',
              }}
              onMouseDown={(e) => handleMouseDown(e, element)}
              onContextMenu={(e) => handleContextMenu(e, element)}
            >
              <ElementRenderer
                element={element}
                isSelected={isSelected}
                onSelect={() => onSelectElement(element.id)}
                isEditing={editingElementId === element.id}
                onStartEditing={() => onStartEditing(element.id)}
                onStopEditing={onStopEditing}
                onUpdateContent={(content) => onUpdateElement(element.id, { content })}
                onUploadImage={() => handleImageUpload(element.id)}
              />
              {/* Hover indicator (thin dashed border before selection) */}
              {!isSelected && !element.locked && (
                <div className="absolute inset-0 border border-dashed border-transparent group-hover/el:border-primary/30 rounded-sm pointer-events-none transition-colors" />
              )}
              {isSelected && !element.locked && element.type === 'connector' && (
                <ConnectorSelectionOverlay
                  element={element}
                  canvasRef={canvasRef}
                  slideElements={slide.elements}
                  onUpdateConnector={(updates) => onUpdateElement(element.id, updates)}
                />
              )}
              {isSelected && !element.locked && element.type !== 'connector' && (
                <SelectionOverlay
                  element={element}
                  canvasRef={canvasRef}
                  onResize={(w, h, x, y) => handleResize(element.id, w, h, x, y)}
                />
              )}
            </div>
          );
        })}

        {/* Multi-select bounding box */}
        {selectedElementIds.length > 1 && (() => {
          const selectedEls = slide.elements.filter((el) => selectedElementIds.includes(el.id));
          if (selectedEls.length < 2) return null;
          const minX = Math.min(...selectedEls.map((el) => el.x));
          const minY = Math.min(...selectedEls.map((el) => el.y));
          const maxX = Math.max(...selectedEls.map((el) => el.x + el.width));
          const maxY = Math.max(...selectedEls.map((el) => el.y + el.height));
          return (
            <div
              className="absolute border-2 border-dashed border-primary/40 rounded-sm pointer-events-none z-[90]"
              style={{
                left: `${minX}%`,
                top: `${minY}%`,
                width: `${maxX - minX}%`,
                height: `${maxY - minY}%`,
              }}
            />
          );
        })()}
      </div>

      {/* Context menu using DropdownMenu positioned at cursor */}
      {contextMenu && contextElement && (
        <div
          className="fixed z-[200]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <DropdownMenu open onOpenChange={(open) => { if (!open) setContextMenu(null); }}>
            <DropdownMenuTrigger asChild>
              <div className="h-0 w-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="right" sideOffset={0}>
              <DropdownMenuItem onClick={() => { onCopyElement(); setContextMenu(null); }}>
                <Copy className="h-4 w-4 mr-2" /> Copy
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { onPasteElement(); setContextMenu(null); }}>
                <ClipboardPaste className="h-4 w-4 mr-2" /> Paste
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { onDuplicateElement(); setContextMenu(null); }}>
                <CopyPlus className="h-4 w-4 mr-2" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => { onDeleteElement(contextMenu.elementId); setContextMenu(null); }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { onBringToFront(); setContextMenu(null); }}>
                <ArrowUpToLine className="h-4 w-4 mr-2" /> Bring to Front
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { onSendToBack(); setContextMenu(null); }}>
                <ArrowDownToLine className="h-4 w-4 mr-2" /> Send to Back
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  onUpdateElement(contextMenu.elementId, { locked: !contextElement.locked });
                  setContextMenu(null);
                }}
              >
                {contextElement.locked ? (
                  <><Unlock className="h-4 w-4 mr-2" /> Unlock</>
                ) : (
                  <><Lock className="h-4 w-4 mr-2" /> Lock</>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
