"use client";

import Link from "next/link";
import type { Dispatch, DragEvent, RefObject, SetStateAction } from "react";
import type { AccessContext } from "@/lib/admin-access";
import { MAPS, MARKER_DEFINITIONS } from "@/lib/maps";
import type { MapId, MarkerDefinition, MarkerType } from "@/lib/types";
import { createDragPreview, MarkerIcon } from "@/components/marker-icon";

interface MapSidebarProps {
  access: AccessContext;
  canEdit: boolean;
  editable: boolean;
  editMode: boolean;
  isAdminPage: boolean;
  isSidebarVisible: boolean;
  isSigningIn: boolean;
  isSuperAdmin: boolean;
  selectedMapId: MapId;
  selectedToolType: MarkerType;
  sidebarRef: RefObject<HTMLElement | null>;
  visibleTypes: Record<MarkerType, boolean>;
  onAdminEmailsEdit: () => void;
  onEditToggle: () => void;
  onGoogleLogin: () => void;
  onSelectMap: (mapId: MapId) => void;
  onSelectToolType: (type: MarkerType) => void;
  onSignOut: () => void;
  setVisibleTypes: Dispatch<SetStateAction<Record<MarkerType, boolean>>>;
  iconBackgroundEnabled: boolean;
  onIconBackgroundChange: (enabled: boolean) => void;
}

function handleMarkerDragStart(
  event: DragEvent<HTMLButtonElement>,
  definition: MarkerDefinition,
  editable: boolean,
  onSelectToolType: (type: MarkerType) => void,
) {
  if (!editable) {
    event.preventDefault();
    return;
  }

  event.dataTransfer.setData("text/plain", definition.type);
  event.dataTransfer.effectAllowed = "copy";
  onSelectToolType(definition.type);

  const preview = createDragPreview(
    definition.iconSrc,
    definition.color,
    definition.type,
    definition.type === "key",
  );

  if (preview) {
    event.dataTransfer.setDragImage(preview, 17, 17);
    window.setTimeout(() => preview.remove(), 0);
  }
}

export function MapSidebar({
  access,
  canEdit,
  editable,
  editMode,
  isAdminPage,
  isSidebarVisible,
  isSigningIn,
  isSuperAdmin,
  selectedMapId,
  selectedToolType,
  sidebarRef,
  visibleTypes,
  onAdminEmailsEdit,
  onEditToggle,
  onGoogleLogin,
  onSelectMap,
  onSelectToolType,
  onSignOut,
  setVisibleTypes,
  iconBackgroundEnabled,
  onIconBackgroundChange,
}: MapSidebarProps) {
  return (
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
                  onClick={() => onSelectMap(map.id)}
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
                    onSelectToolType(definition.type);
                    setVisibleTypes((current) => ({
                      ...current,
                      [definition.type]: !current[definition.type],
                    }));
                  }}
                  onDragStart={(event) => handleMarkerDragStart(event, definition, editable, onSelectToolType)}
                >
                  <MarkerIcon
                    iconSrc={definition.iconSrc}
                    color={definition.color}
                    isPin={definition.type === "key"}
                    markerType={definition.type}
                    variant="sidebar"
                  />
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
                        onClick={onEditToggle}
                      >
                        편집
                      </button>
                    ) : null}
                    {isSuperAdmin ? (
                      <button type="button" className="action-button" onClick={onAdminEmailsEdit}>
                        권한 이메일
                      </button>
                    ) : null}
                    <button type="button" className="action-button" onClick={onSignOut}>
                      로그아웃
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="action-button action-button--google"
                    disabled={isSigningIn}
                    onClick={onGoogleLogin}
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
                  onClick={onGoogleLogin}
                >
                  {isSigningIn ? "로그인 중" : "관리자 로그인"}
                </button>
              )}

              <label className="action-button action-button--toggle-check">
                <input
                  type="checkbox"
                  checked={iconBackgroundEnabled}
                  onChange={(event) => onIconBackgroundChange(event.target.checked)}
                />
                <span>아이콘 배경</span>
              </label>
            </div>
          </section>
        </div>
      ) : null}
    </aside>
  );
}
