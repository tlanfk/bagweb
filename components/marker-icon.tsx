"use client";

import type { CSSProperties } from "react";
import type { MarkerType } from "@/lib/types";

interface MarkerIconProps {
  iconSrc: string;
  color: string;
  isPin: boolean;
  markerType: MarkerType;
  variant: "sidebar" | "map";
}

export function iconStyle(iconSrc: string, color: string): CSSProperties {
  return {
    "--icon-url": `url("${iconSrc}")`,
    "--icon-color": color,
  } as CSSProperties;
}

function shouldRenderAsImage(markerType: MarkerType, isPin: boolean) {
  return isPin || markerType === "car" || markerType === "gas";
}

export function createDragPreview(
  iconSrc: string,
  color: string,
  markerType: MarkerType,
  isPin: boolean,
): HTMLDivElement | null {
  if (typeof document === "undefined") {
    return null;
  }

  const preview = document.createElement("div");
  preview.style.width = "34px";
  preview.style.height = "34px";
  preview.style.pointerEvents = "none";
  preview.style.display = "flex";
  preview.style.alignItems = "center";
  preview.style.justifyContent = "center";
  preview.style.background = "transparent";

  if (shouldRenderAsImage(markerType, isPin)) {
    const icon = document.createElement("img");
    icon.src = iconSrc;
    icon.alt = "";
    icon.style.display = "block";
    icon.style.width = "34px";
    icon.style.height = "34px";
    icon.style.objectFit = "contain";
    preview.appendChild(icon);
  } else {
    const icon = document.createElement("span");
    icon.style.display = "block";
    icon.style.width = "34px";
    icon.style.height = "34px";
    icon.style.backgroundColor = color;
    icon.style.webkitMaskImage = `url("${iconSrc}")`;
    icon.style.webkitMaskRepeat = "no-repeat";
    icon.style.webkitMaskPosition = "center";
    icon.style.webkitMaskSize = "contain";
    icon.style.maskImage = `url("${iconSrc}")`;
    icon.style.maskRepeat = "no-repeat";
    icon.style.maskPosition = "center";
    icon.style.maskSize = "contain";
    preview.appendChild(icon);
  }

  document.body.appendChild(preview);
  return preview;
}

export function MarkerIcon({ iconSrc, color, isPin, markerType, variant }: MarkerIconProps) {
  if (shouldRenderAsImage(markerType, isPin)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={iconSrc}
        alt=""
        draggable={false}
        className={variant === "sidebar" ? "marker-image marker-image--sidebar" : "marker-image marker-image--map"}
      />
    );
  }

  return (
    <span
      className={variant === "sidebar" ? "icon-mask marker-row__icon" : "icon-mask map-marker__icon"}
      style={iconStyle(iconSrc, color)}
    />
  );
}
