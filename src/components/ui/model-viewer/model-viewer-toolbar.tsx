"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import {
  Box,
  Camera,
  Check,
  ChevronDown,
  Copy,
  Download,
  Footprints,
  Gauge,
  Grid2X2,
  LayoutGrid,
  ListTree,
  Moon,
  Pause,
  Play,
  Rotate3D,
  RotateCcw,
  ScanSearch,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ViewerControlButton as Button } from "./viewer-ui";
import type {
  ViewerMode,
  ViewerLighting,
  ViewerShading,
  ViewerViewCube,
} from "./model-viewer";
import "./model-viewer.css";

export function ModelViewerToolbar({
  className,
  onKeyDown,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="model-viewer-toolbar"
      role="toolbar"
      aria-label="3D viewer controls"
      className={cn("viewer-toolbar", className)}
      {...props}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (
          event.defaultPrevented ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey
        )
          return;
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
          return;
        // Ignore events from portaled menus and editable controls.
        const target = event.target as HTMLElement;
        if (!event.currentTarget.contains(target) || !target.closest("button"))
          return;
        const buttons = [
          ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
            "button:not(:disabled)",
          ),
        ];
        const current = buttons.indexOf(target.closest("button")!);
        if (current < 0 || buttons.length === 0) return;
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? buttons.length - 1
              : (current +
                  (event.key === "ArrowRight" ? 1 : -1) +
                  buttons.length) %
                buttons.length;
        event.preventDefault();
        buttons[next].focus();
      }}
    />
  );
}

export function ModelViewerToolbarGroup({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="model-viewer-toolbar-group"
      role="group"
      className={cn("viewer-toolbar-group", className)}
      {...props}
    />
  );
}

export type ModelViewerToolbarButtonProps = ComponentProps<typeof Button> & {
  label: string;
  active?: boolean;
  icon?: ReactNode;
};

export function ModelViewerToolbarButton({
  label,
  active,
  icon,
  children,
  ...props
}: ModelViewerToolbarButtonProps) {
  return (
    <Button
      data-slot="model-viewer-toolbar-button"
      data-state={active === undefined ? undefined : active ? "on" : "off"}
      size="icon-sm"
      variant={active ? "secondary" : "ghost"}
      aria-label={label}
      aria-pressed={active}
      tooltip={label}
      {...props}
    >
      {children ?? icon}
    </Button>
  );
}

export type ModelViewerControlsProps = ComponentProps<"div"> & {
  mode: ViewerMode;
  onModeChange: (mode: ViewerMode) => void;
  shading: ViewerShading;
  onShadingChange: (shading: ViewerShading) => void;
  lighting: ViewerLighting;
  onLightingChange: (lighting: ViewerLighting) => void;
  grid: boolean;
  onGridChange: (visible: boolean) => void;
  projection: "perspective" | "orthographic";
  onProjectionChange: (projection: "perspective" | "orthographic") => void;
  viewCube: ViewerViewCube | false;
  onViewCubeChange: (viewCube: ViewerViewCube | false) => void;
  inspectorOpen: boolean;
  onInspectorChange: (open: boolean) => void;
  onReset: () => void;
  captureDisabled?: boolean;
  onCapture: (action: "copy" | "download") => void;
};

/** The default controls, also usable outside ModelViewer with controlled state. */
export function ModelViewerControls({
  mode,
  onModeChange,
  shading,
  onShadingChange,
  lighting,
  onLightingChange,
  grid,
  onGridChange,
  projection,
  onProjectionChange,
  viewCube,
  onViewCubeChange,
  inspectorOpen,
  onInspectorChange,
  onReset,
  captureDisabled,
  onCapture,
  ...props
}: ModelViewerControlsProps) {
  const [captureMenuOpen, setCaptureMenuOpen] = useState(false);
  return (
    <ModelViewerToolbar {...props}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="viewer-shading-trigger text-[10px] font-semibold"
            aria-label={`Shading: ${shading}`}
          >
            {shading}
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={6}
          className="viewer-menu"
        >
          {(["realistic", "solid", "normals", "wireframe"] as const).map(
            (option) => (
              <DropdownMenuItem
                key={option}
                onSelect={() => onShadingChange(option)}
              >
                <Check
                  className={option === shading ? "is-visible" : "is-hidden"}
                />
                <span>{option}</span>
              </DropdownMenuItem>
            ),
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <ModelViewerToolbarGroup aria-label="Interaction mode">
        <ModelViewerToolbarButton
          icon={<Rotate3D />}
          label="Orbit camera"
          active={mode === "orbit"}
          onClick={() => onModeChange("orbit")}
        />
        <ModelViewerToolbarButton
          icon={<LayoutGrid />}
          label="Four-view split"
          active={mode === "split"}
          onClick={() => onModeChange("split")}
        />
        <ModelViewerToolbarButton
          icon={<Footprints />}
          label="Fly camera"
          active={mode === "firstPerson"}
          onClick={() => onModeChange("firstPerson")}
        />
      </ModelViewerToolbarGroup>
      <ModelViewerToolbarGroup aria-label="Scene options">
        <ModelViewerToolbarButton
          icon={lighting === "day" ? <Sun /> : <Moon />}
          label={lighting === "day" ? "Switch to night" : "Switch to day"}
          active={lighting === "night"}
          onClick={() => onLightingChange(lighting === "day" ? "night" : "day")}
        />
        <ModelViewerToolbarButton
          icon={<Grid2X2 />}
          label="Show grid"
          active={grid}
          onClick={() => onGridChange(!grid)}
        />
        <ModelViewerToolbarButton
          icon={<ScanSearch />}
          label="Orthographic view"
          active={projection === "orthographic"}
          onClick={() =>
            onProjectionChange(
              projection === "orthographic" ? "perspective" : "orthographic",
            )
          }
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="View cube options"
            >
              <Box />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="viewer-menu">
            {([false, "drei", "asset-studio"] as const).map((value) => (
              <DropdownMenuItem
                key={String(value)}
                onSelect={() => onViewCubeChange(value)}
              >
                <Check
                  className={viewCube === value ? "is-visible" : "is-hidden"}
                />
                {value === false
                  ? "Off"
                  : value === "drei"
                    ? "Drei cube"
                    : "Asset Studio"}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <ModelViewerToolbarButton
          icon={<ListTree />}
          label="Inspect model"
          active={inspectorOpen}
          onClick={() => onInspectorChange(!inspectorOpen)}
        />
        <ModelViewerToolbarButton
          icon={<RotateCcw />}
          label="Reset view"
          onClick={onReset}
        />
        <DropdownMenu open={captureMenuOpen} onOpenChange={setCaptureMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="icon-sm"
              variant={captureMenuOpen ? "secondary" : "ghost"}
              aria-label="Screenshot options"
              title="Screenshot options"
              disabled={captureDisabled}
            >
              <Camera />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="viewer-capture-menu"
          >
            <div className="viewer-capture-title">
              Capture view <span>PNG</span>
            </div>
            <DropdownMenuItem onSelect={() => void onCapture("copy")}>
              <Copy /> Copy to clipboard
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void onCapture("download")}>
              <Download /> Download image
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ModelViewerToolbarGroup>
    </ModelViewerToolbar>
  );
}

const animationSpeeds = [0.5, 1, 1.5, 2];

export type ModelViewerAnimationControlsProps = ComponentProps<"div"> & {
  clips: string[];
  animation: string | null;
  onAnimationChange: (clip: string) => void;
  playing: boolean;
  onPlayingChange: (playing: boolean) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  onRestart: () => void;
};

export function ModelViewerAnimationControls({
  clips,
  animation,
  onAnimationChange,
  playing,
  onPlayingChange,
  speed,
  onSpeedChange,
  onRestart,
  className,
  ...props
}: ModelViewerAnimationControlsProps) {
  return (
    <ModelViewerToolbar
      data-slot="model-viewer-animation-controls"
      aria-label="Animation controls"
      className={cn("viewer-animation-controls", className)}
      {...props}
    >
      <ModelViewerToolbarButton
        icon={playing ? <Pause /> : <Play />}
        label={playing ? "Pause animation" : "Play animation"}
        active={playing}
        onClick={() => onPlayingChange(!playing)}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="viewer-animation-name"
          >
            {animation ?? "No animation"}
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={6}
          className="viewer-animation-menu"
        >
          {clips.map((name) => (
            <DropdownMenuItem
              key={name}
              onSelect={() => onAnimationChange(name)}
            >
              <Check
                className={name === animation ? "is-visible" : "is-hidden"}
              />
              {name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <ModelViewerToolbarButton
        icon={<RotateCcw />}
        label="Restart animation"
        onClick={onRestart}
      />
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label={`Animation speed ${speed}×`}
        title={`Animation speed ${speed}×`}
        onClick={() =>
          onSpeedChange(
            animationSpeeds[
              (animationSpeeds.indexOf(speed) + 1) % animationSpeeds.length
            ] ?? 1,
          )
        }
      >
        <Gauge />
        <span className="viewer-speed-label">{speed}×</span>
      </Button>
    </ModelViewerToolbar>
  );
}
