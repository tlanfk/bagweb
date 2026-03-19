"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, DragEvent, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import type { AccessContext } from "@/lib/admin-access";
import { MAPS, MAP_SIZE, MARKER_DEFINITIONS } from "@/lib/maps";
import { clampCoordinate, cloneCollection, makeMarkerId, removeMarker, upsertMarker } from "@/lib/markers";
import { MapId, MarkerCollection, MarkerType } from "@/lib/types";

type ExperienceMode = "viewer" | "admin";

interface MapExperienceProps {
  mode: ExperienceMode;
  initialCollection: MarkerCollection;
  initialAccess: AccessContext;
}

interface ViewportMetrics {
  width: number;
  height: number;
}

interface PanState {
  x: number;
  y: number;
}

interface DragInteraction {
  kind: "pan" | "marker";
  startClientX: number;
  startClientY: number;
  startPan: PanState;
  markerType?: MarkerType;
  markerId?: string;
}

const MIN_ZOOM = 0.675;
const MAX_ZOOM = 5;
const INITIAL_ZOOM = 0.75;
const ZOOM_FACTOR = 1.2;
const FULL_MARKER_SCALE_ZOOM = 1.69;
const DRAG_THRESHOLD = 5;
const ICON_BACKGROUND_STORAGE_KEY = "bagweb-icon-background-enabled";
const MARKER_Z_INDEX: Record<MarkerType, number> = {
  car: 600,
  boat: 500,
  key: 400,
  plane: 300,
  garage: 200,
  gas: 100,
};

function clampZoom(value: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number(value.toFixed(3))));
}

function clampValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function iconStyle(iconSrc: string, color: string): CSSProperties {
  return {
    "--icon-url": `url("${iconSrc}")`,
    "--icon-color": color,
  } as CSSProperties;
}

export function MapExperience({ mode, initialCollection, initialAccess }: MapExperienceProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const suppressClickRef = useRef(false);
  const interactionRef = useRef<DragInteraction | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);

  const [selectedMapId, setSelectedMapId] = useState<MapId>("erangel");
  const [selectedToolType, setSelectedToolType] = useState<MarkerType>("car");
  const [selectedMarkerKey, setSelectedMarkerKey] = useState<string | null>(null);
  const [zoom, setZoom] = useState(INITIAL_ZOOM);
  const [pan, setPan] = useState<PanState>({ x: 0, y: 0 });
  const [viewport, setViewport] = useState<ViewportMetrics>({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [sourceCollection, setSourceCollection] = useState<MarkerCollection>(() =>
    cloneCollection(initialCollection),
  );
  const [draftCollection, setDraftCollection] = useState<MarkerCollection>(() =>
    cloneCollection(initialCollection),
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [access, setAccess] = useState<AccessContext>(initialAccess);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [iconBackgroundEnabled, setIconBackgroundEnabled] = useState(true);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [visibleTypes, setVisibleTypes] = useState<Record<MarkerType, boolean>>({
    car: true,
    boat: true,
    gas: true,
    plane: true,
    garage: true,
    key: true,
  });

  const isAdminPage = mode === "admin";
  const canEdit = access.canEdit;
  const isSuperAdmin = access.isSuperAdmin;
  const editable = isAdminPage && canEdit && editMode;

  useEffect(() => {
    setSourceCollection(cloneCollection(initialCollection));
    setDraftCollection(cloneCollection(initialCollection));
  }, [initialCollection]);

  useEffect(() => {
    setAccess(initialAccess);
  }, [initialAccess]);

  useEffect(() => {
    if (access.isSignedIn) {
      setIsSigningIn(false);
    }
  }, [access.isSignedIn]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const saved = window.localStorage.getItem(ICON_BACKGROUND_STORAGE_KEY);

    if (saved === "true") {
      setIconBackgroundEnabled(true);
      return;
    }

    if (saved === "false") {
      setIconBackgroundEnabled(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(ICON_BACKGROUND_STORAGE_KEY, String(iconBackgroundEnabled));
  }, [iconBackgroundEnabled]);

  useEffect(() => {
    const viewportElement = viewportRef.current;

    if (!viewportElement) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      setViewport({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(viewportElement);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setZoom(INITIAL_ZOOM);
    setPan({ x: 0, y: 0 });
    setSelectedMarkerKey(null);
    suppressClickRef.current = false;
  }, [selectedMapId]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!editable || !selectedMarkerKey) {
        return;
      }

      if (event.key !== "Delete" && event.key !== "Backspace") {
        return;
      }

      const [mapId, type, markerId] = selectedMarkerKey.split(":") as [MapId, MarkerType, string];
      setDraftCollection((current) => removeMarker(current, mapId, type, markerId));
      setSelectedMarkerKey(null);
      setSaveState("idle");
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editable, selectedMarkerKey]);

  const baseSize = useMemo(() => {
    if (viewport.width === 0 || viewport.height === 0) {
      return 640;
    }

    return Math.max(320, Math.max(viewport.width, viewport.height));
  }, [viewport.height, viewport.width]);

  const renderedSize = baseSize * zoom;
  const markerScale = clampValue(
    0.9 + ((zoom - MIN_ZOOM) / (FULL_MARKER_SCALE_ZOOM - MIN_ZOOM)) * 0.1,
    0.9,
    1,
  );
  const defaultLeft = (viewport.width - renderedSize) / 2;
  const defaultTop = (viewport.height - renderedSize) / 2;
  const contentLeft = defaultLeft + pan.x;
  const contentTop = defaultTop + pan.y;

  const currentMapGroups = draftCollection.maps[selectedMapId];
  const currentMarkers = useMemo(() => {
    return MARKER_DEFINITIONS.flatMap((definition) =>
      currentMapGroups[definition.type].map((marker) => ({
        ...marker,
        type: definition.type,
        label: definition.label,
        iconSrc: definition.iconSrc,
        color: definition.color,
      })),
    );
  }, [currentMapGroups]);
  const visibleMarkers = currentMarkers.filter((marker) => visibleTypes[marker.type]);

  const hasCurrentMapUnsavedChanges =
    JSON.stringify(sourceCollection.maps[selectedMapId]) !== JSON.stringify(draftCollection.maps[selectedMapId]);
  const hasUnsavedChanges = JSON.stringify(sourceCollection.maps) !== JSON.stringify(draftCollection.maps);

  function clampPan(nextPan: PanState, nextZoom: number): PanState {
    const nextRenderedSize = baseSize * nextZoom;
    const nextDefaultLeft = (viewport.width - nextRenderedSize) / 2;
    const nextDefaultTop = (viewport.height - nextRenderedSize) / 2;

    if (viewport.width === 0 || viewport.height === 0) {
      return nextPan;
    }

    if (nextRenderedSize <= viewport.width) {
      nextPan.x = 0;
    } else {
      const minPanX = viewport.width - nextRenderedSize - nextDefaultLeft;
      const maxPanX = -nextDefaultLeft;
      nextPan.x = clampValue(nextPan.x, minPanX, maxPanX);
    }

    if (nextRenderedSize <= viewport.height) {
      nextPan.y = 0;
    } else {
      const minPanY = viewport.height - nextRenderedSize - nextDefaultTop;
      const maxPanY = -nextDefaultTop;
      nextPan.y = clampValue(nextPan.y, minPanY, maxPanY);
    }

    return nextPan;
  }

  function getViewportPoint(clientX: number, clientY: number) {
    const viewportElement = viewportRef.current;

    if (!viewportElement) {
      return null;
    }

    const rect = viewportElement.getBoundingClientRect();

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  function getMapCoordinate(clientX: number, clientY: number) {
    const point = getViewportPoint(clientX, clientY);

    if (!point) {
      return null;
    }

    const relativeX = point.x - contentLeft;
    const relativeY = point.y - contentTop;

    if (relativeX < 0 || relativeY < 0 || relativeX > renderedSize || relativeY > renderedSize) {
      return null;
    }

    return {
      x: clampCoordinate((relativeX / renderedSize) * MAP_SIZE),
      y: clampCoordinate((relativeY / renderedSize) * MAP_SIZE),
    };
  }

  function updateZoom(clientX: number, clientY: number, direction: "in" | "out") {
    const point = getViewportPoint(clientX, clientY);

    if (!point) {
      return;
    }

    const nextZoom = clampZoom(direction === "in" ? zoom * ZOOM_FACTOR : zoom / ZOOM_FACTOR);

    if (nextZoom === zoom) {
      return;
    }

    const anchorX = clampValue((point.x - contentLeft) / renderedSize, 0, 1);
    const anchorY = clampValue((point.y - contentTop) / renderedSize, 0, 1);
    const nextRenderedSize = baseSize * nextZoom;
    const nextDefaultLeft = (viewport.width - nextRenderedSize) / 2;
    const nextDefaultTop = (viewport.height - nextRenderedSize) / 2;

    const unclampedPan = {
      x: point.x - anchorX * nextRenderedSize - nextDefaultLeft,
      y: point.y - anchorY * nextRenderedSize - nextDefaultTop,
    };

    setZoom(nextZoom);
    setPan(clampPan(unclampedPan, nextZoom));
  }

  function addMarkerAt(clientX: number, clientY: number, type: MarkerType) {
    const coordinates = getMapCoordinate(clientX, clientY);

    if (!coordinates) {
      return;
    }

    const marker = {
      id: makeMarkerId(),
      x: coordinates.x,
      y: coordinates.y,
    };

    setDraftCollection((current) => upsertMarker(current, selectedMapId, type, marker));
    setSelectedMarkerKey(`${selectedMapId}:${type}:${marker.id}`);
    setSaveState("idle");
  }

  function beginPan(event: ReactPointerEvent<HTMLDivElement>) {
    if (renderedSize <= viewport.width && renderedSize <= viewport.height) {
      return;
    }

    event.preventDefault();
    interactionRef.current = {
      kind: "pan",
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPan: pan,
    };
    setIsDragging(true);
  }

  function beginMarkerDrag(
    event: ReactPointerEvent<HTMLButtonElement>,
    type: MarkerType,
    markerId: string,
  ) {
    if (!editable) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    interactionRef.current = {
      kind: "marker",
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPan: pan,
      markerType: type,
      markerId,
    };
    setSelectedMarkerKey(`${selectedMapId}:${type}:${markerId}`);
    setIsDragging(true);
  }

  const handlePointerMove = useEffectEvent((event: PointerEvent) => {
    const interaction = interactionRef.current;

    if (!interaction) {
      return;
    }

    lastPointerRef.current = { x: event.clientX, y: event.clientY };

    const moved =
      Math.abs(event.clientX - interaction.startClientX) > DRAG_THRESHOLD ||
      Math.abs(event.clientY - interaction.startClientY) > DRAG_THRESHOLD;

    if (moved) {
      suppressClickRef.current = true;
    }

    if (interaction.kind === "pan") {
      setPan(
        clampPan(
          {
            x: interaction.startPan.x + (event.clientX - interaction.startClientX),
            y: interaction.startPan.y + (event.clientY - interaction.startClientY),
          },
          zoom,
        ),
      );
      return;
    }

    if (!interaction.markerType || !interaction.markerId) {
      return;
    }

    const coordinates = getMapCoordinate(event.clientX, event.clientY);

    if (!coordinates) {
      return;
    }

    setDraftCollection((current) =>
      upsertMarker(current, selectedMapId, interaction.markerType as MarkerType, {
        id: interaction.markerId as string,
        x: coordinates.x,
        y: coordinates.y,
      }),
    );
    setSaveState("idle");
  });

  function isPointInsideSidebar(clientX: number, clientY: number) {
    const sidebarElement = sidebarRef.current;

    if (!sidebarElement) {
      return false;
    }

    const rect = sidebarElement.getBoundingClientRect();

    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  }

  const handlePointerUp = useEffectEvent(() => {
    const interaction = interactionRef.current;

    if (interaction?.kind === "marker" && interaction.markerType && interaction.markerId) {
      const lastPointer = lastPointerRef.current;

      if (lastPointer && isPointInsideSidebar(lastPointer.x, lastPointer.y)) {
        setDraftCollection((current) =>
          removeMarker(current, selectedMapId, interaction.markerType as MarkerType, interaction.markerId as string),
        );
        setSelectedMarkerKey(null);
        setSaveState("idle");
      }
    }

    interactionRef.current = null;
    lastPointerRef.current = null;
    setIsDragging(false);
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  });

  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  async function handleSave() {
    if (!canEdit || !hasCurrentMapUnsavedChanges) {
      return;
    }

    setSaveState("saving");

    const response = await fetch("/api/markers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mapId: selectedMapId,
        groups: draftCollection.maps[selectedMapId],
        lastKnownUpdatedAt: sourceCollection.mapUpdatedAt[selectedMapId],
      }),
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { message?: string } | null;
      setSaveState("error");

      if (result?.message) {
        window.alert(result.message);
      } else {
        window.alert("저장에 실패했습니다.");
      }

      return;
    }

    const saved = (await response.json()) as MarkerCollection;
    setSourceCollection(cloneCollection(saved));
    setDraftCollection(cloneCollection(saved));
    setSelectedMarkerKey(null);
    setSaveState("saved");
    setEditMode(false);
  }

  function handleEditToggle() {
    if (!editMode) {
      setEditMode(true);
      return;
    }

    if (hasUnsavedChanges) {
      const shouldDiscard = window.confirm("저장하지 않은 내역은 사라집니다. 편집 모드를 종료하시겠습니까?");

      if (!shouldDiscard) {
        return;
      }
    }

    setDraftCollection(cloneCollection(sourceCollection));
    setSelectedMarkerKey(null);
    setSaveState("idle");
    setEditMode(false);
  }

  async function handleAdminEmailsEdit() {
    const currentValue = access.adminEmails.join(", ");
    const nextValue = window.prompt("편집 권한 이메일을 쉼표로 구분해서 입력해 주세요.", currentValue);

    if (nextValue === null) {
      return;
    }

    const adminEmails = nextValue
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    const response = await fetch("/api/admin-emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ adminEmails }),
    });

    if (!response.ok) {
      window.alert("권한 이메일 저장에 실패했습니다.");
      return;
    }

    const result = (await response.json()) as { adminEmails: string[] };
    setAccess((current) => ({
      ...current,
      adminEmails: result.adminEmails,
    }));
    setDraftCollection((current) => ({
      ...current,
      adminEmails: result.adminEmails,
    }));
    setSourceCollection((current) => ({
      ...current,
      adminEmails: result.adminEmails,
    }));
  }

  function handleGoogleLogin() {
    setIsSigningIn(true);
    void signIn("google", { callbackUrl: "/admin" });
  }

  return (
    <div
      ref={shellRef}
      className={`app-shell ${isSidebarVisible ? "" : "is-sidebar-collapsed"}`}
      onContextMenu={(event) => event.preventDefault()}
    >
      <aside ref={sidebarRef} className={`sidebar ${isSidebarVisible ? "" : "is-collapsed"}`}>
        {isSidebarVisible ? (
          <div className="sidebar-scroll">
            <section className="sidebar-block">
              <p className="eyebrow">MAP LIST</p>
              <div className="map-list">
                {MAPS.map((map) => (
                  <button
                    key={map.id}
                    type="button"
                    className={`map-item ${selectedMapId === map.id ? "is-active" : ""}`}
                    onClick={() => setSelectedMapId(map.id)}
                  >
                    {map.name}
                  </button>
                ))}
              </div>
            </section>

            <section className="sidebar-block sidebar-block--markers">
              <div className="marker-list">
                {MARKER_DEFINITIONS.map((definition) => (
                  <button
                    key={definition.type}
                    type="button"
                    draggable={editable}
                    className={`marker-row ${visibleTypes[definition.type] ? "is-visible" : "is-hidden"} ${editable ? "is-draggable" : ""} ${editable && selectedToolType === definition.type ? "is-tool-selected" : ""}`}
                    onClick={() => {
                      setSelectedToolType(definition.type);
                      setVisibleTypes((current) => ({
                        ...current,
                        [definition.type]: !current[definition.type],
                      }));
                    }}
                    onDragStart={(event) => {
                      if (!editable) {
                        event.preventDefault();
                        return;
                      }

                      event.dataTransfer.setData("text/plain", definition.type);
                      event.dataTransfer.effectAllowed = "copy";
                      setSelectedToolType(definition.type);
                    }}
                  >
                    {definition.type === "key" ? (
                      <span
                        className="ring-icon marker-row__icon ring-icon--sidebar"
                        style={{ "--icon-color": definition.color } as CSSProperties}
                      />
                    ) : (
                      <span className="icon-mask marker-row__icon" style={iconStyle(definition.iconSrc, definition.color)} />
                    )}
                    <span>{definition.label}</span>
                  </button>
                ))}
              </div>
            </section>
            <section className="sidebar-block sidebar-block--controls">
              <div className="sidebar-control-list">
                {isAdminPage ? (
                  access.isSignedIn ? (
                    <>
                      {canEdit ? (
                        <button
                          type="button"
                          className={`action-button action-button--toggle ${editMode ? "is-active" : ""}`}
                          onClick={handleEditToggle}
                        >
                          편집
                        </button>
                      ) : null}
                      {isSuperAdmin ? (
                        <button type="button" className="action-button" onClick={handleAdminEmailsEdit}>
                          권한 이메일
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="action-button"
                        onClick={() => signOut({ callbackUrl: "/" })}
                      >
                        로그아웃
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="action-button action-button--google"
                      disabled={isSigningIn}
                      onClick={handleGoogleLogin}
                    >
                      {isSigningIn ? "로그인 중" : "Google로 로그인"}
                    </button>
                  )
                ) : access.isSignedIn ? (
                  <Link href="/admin" className="action-button action-button--link">
                    {canEdit ? "관리자 편집" : "관리자 화면"}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="action-button action-button--google"
                    disabled={isSigningIn}
                    onClick={handleGoogleLogin}
                  >
                    {isSigningIn ? "로그인 중" : "관리자 로그인"}
                  </button>
                )}

                <label className="action-button action-button--toggle-check">
                  <input
                    type="checkbox"
                    checked={iconBackgroundEnabled}
                    onChange={(event) => setIconBackgroundEnabled(event.target.checked)}
                  />
                  <span>아이콘 배경</span>
                </label>
              </div>
            </section>
          </div>
        ) : null}
      </aside>

      <button
        type="button"
        className="menu-toggle"
        onClick={() => setIsSidebarVisible((current) => !current)}
        aria-label={isSidebarVisible ? "메뉴 닫기" : "메뉴 열기"}
      >
        <Image src="/vector/menu.svg" alt="" width={22} height={22} className="menu-toggle__icon" />
      </button>

      <main className="workspace">
        <div
          ref={viewportRef}
          className={`map-viewport ${isDragging ? "is-dragging" : ""}`}
          onWheel={(event) => {
            event.preventDefault();
            updateZoom(event.clientX, event.clientY, event.deltaY < 0 ? "in" : "out");
          }}
          onPointerDown={(event) => {
            if ((event.target as HTMLElement).closest("[data-marker='true']")) {
              return;
            }

            beginPan(event);
          }}
          onDragOver={(event) => {
            if (!editable) {
              return;
            }

            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
          }}
          onDrop={(event: DragEvent<HTMLDivElement>) => {
            if (!editable) {
              return;
            }

            event.preventDefault();
            const droppedType = event.dataTransfer.getData("text/plain") as MarkerType;

            if (!droppedType) {
              return;
            }

            addMarkerAt(event.clientX, event.clientY, droppedType);
          }}
        >
          <div
            className={`map-canvas ${editable ? "is-editable" : ""}`}
            style={{
              width: `${renderedSize}px`,
              height: `${renderedSize}px`,
              left: `${contentLeft}px`,
              top: `${contentTop}px`,
            }}
          >
            <Image
              src={MAPS.find((map) => map.id === selectedMapId)?.imageSrc ?? MAPS[0].imageSrc}
              alt=""
              fill
              unoptimized
              sizes="100vw"
              className="map-canvas__image"
              draggable={false}
              priority
            />
            <div className="map-canvas__overlay" />

            {visibleMarkers.map((marker) => {
              const markerKey = `${selectedMapId}:${marker.type}:${marker.id}`;
              const isSelected = editable && selectedMarkerKey === markerKey;

              return (
                <button
                  key={markerKey}
                  type="button"
                  data-marker="true"
                  className={`map-marker ${isSelected ? "is-selected" : ""} ${marker.type === "key" ? "map-marker--ring" : ""} ${!iconBackgroundEnabled && marker.type !== "key" ? "is-bg-disabled" : ""}`}
                  style={
                    {
                      left: `${(marker.x / MAP_SIZE) * 100}%`,
                      top: `${(marker.y / MAP_SIZE) * 100}%`,
                      borderColor: marker.color,
                      "--marker-scale": markerScale,
                      zIndex: isSelected ? 1000 : MARKER_Z_INDEX[marker.type],
                    } as CSSProperties
                  }
                  onPointerDown={(event) => beginMarkerDrag(event, marker.type, marker.id)}
                  onClick={(event) => {
                    event.stopPropagation();

                    if (editable) {
                      setSelectedMarkerKey(markerKey);
                    }
                  }}
                >
                  {marker.type === "key" ? (
                    <span
                      className="ring-icon map-marker__icon ring-icon--map"
                      style={{ "--icon-color": marker.color } as CSSProperties}
                    />
                  ) : (
                    <span className="icon-mask map-marker__icon" style={iconStyle(marker.iconSrc, marker.color)} />
                  )}
                </button>
              );
            })}
          </div>

          {isAdminPage && canEdit ? (
            <div className="viewport-controls">
              <button
                type="button"
                className="viewport-button viewport-button--save"
                disabled={!hasCurrentMapUnsavedChanges || saveState === "saving"}
                onClick={handleSave}
              >
                {saveState === "saving" ? "저장 중" : "저장하기"}
              </button>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
