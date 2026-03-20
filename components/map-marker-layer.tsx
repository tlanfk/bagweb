"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { MAP_SIZE } from "@/lib/maps";
import type { MarkerPoint, MarkerType } from "@/lib/types";
import { MarkerIcon } from "@/components/marker-icon";

const MARKER_Z_INDEX: Record<MarkerType, number> = {
  car: 600,
  boat: 500,
  key: 400,
  plane: 300,
  garage: 200,
  gas: 100,
};

export interface DisplayMarker extends MarkerPoint {
  type: MarkerType;
  iconSrc: string;
  color: string;
}

interface MapMarkerLayerProps {
  editable: boolean;
  iconBackgroundEnabled: boolean;
  keyMarkerScaleFactor: number;
  markerScale: number;
  selectedMapId: string;
  selectedMarkerKey: string | null;
  visibleMarkers: DisplayMarker[];
  onBeginMarkerDrag: (
    event: ReactPointerEvent<HTMLButtonElement>,
    type: MarkerType,
    markerId: string,
  ) => void;
  onSelectMarker: (markerKey: string) => void;
}

export function MapMarkerLayer({
  editable,
  iconBackgroundEnabled,
  keyMarkerScaleFactor,
  markerScale,
  selectedMapId,
  selectedMarkerKey,
  visibleMarkers,
  onBeginMarkerDrag,
  onSelectMarker,
}: MapMarkerLayerProps) {
  return (
    <>
      {visibleMarkers.map((marker) => {
        const markerKey = `${selectedMapId}:${marker.type}:${marker.id}`;
        const isSelected = editable && selectedMarkerKey === markerKey;
        const currentMarkerScale = marker.type === "key" ? markerScale * keyMarkerScaleFactor : markerScale;

        return (
          <button
            key={markerKey}
            type="button"
            data-marker="true"
            className={`map-marker ${isSelected ? "is-selected" : ""} ${marker.type === "key" ? "map-marker--pin" : ""} ${!iconBackgroundEnabled && marker.type !== "key" ? "is-bg-disabled" : ""}`}
            style={
              {
                left: `${(marker.x / MAP_SIZE) * 100}%`,
                top: `${(marker.y / MAP_SIZE) * 100}%`,
                borderColor: marker.color,
                "--marker-scale": currentMarkerScale,
                zIndex: isSelected ? 1000 : MARKER_Z_INDEX[marker.type],
              } as CSSProperties
            }
            onPointerDown={(event) => onBeginMarkerDrag(event, marker.type, marker.id)}
            onClick={(event) => {
              event.stopPropagation();

              if (editable) {
                onSelectMarker(markerKey);
              }
            }}
          >
            <MarkerIcon
              iconSrc={marker.iconSrc}
              color={marker.color}
              isPin={marker.type === "key"}
              variant="map"
            />
          </button>
        );
      })}
    </>
  );
}
