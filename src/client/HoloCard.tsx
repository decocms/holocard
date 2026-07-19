import { type CSSProperties, useEffect, useId, useLayoutEffect, useRef } from "react";
import type { CardManifest } from "@/core/types";

interface HoloCardProps {
  manifest: CardManifest;
  photoUrl: string;
  productUrl?: string;
  editable?: boolean;
  onFieldChange?: (
    field: "occasion" | "title" | "message" | "signature",
    value: string,
  ) => void;
  onEditStart?: () => void;
  onPhotoPositionChange?: (x: number, y: number) => void;
  className?: string;
}

type OrientationConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

export function HoloCard({
  manifest,
  photoUrl,
  productUrl = "/",
  editable = false,
  onFieldChange,
  onEditStart,
  onPhotoPositionChange,
  className = "",
}: HoloCardProps) {
  const inputId = useId();
  const cardRef = useRef<HTMLLabelElement>(null);
  const photoDragRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    originX: 50,
    originY: 50,
  });
  const copyRef = useRef<HTMLSpanElement>(null);
  const stateRef = useRef({
    rx: 0,
    ry: 0,
    tx: 0,
    ty: 0,
    active: false,
    raf: 0,
    dragging: false,
    moved: false,
    startX: 0,
    startY: 0,
    baseBeta: null as number | null,
    baseGamma: null as number | null,
    orientationEnabled: false,
    orientationReceiving: false,
    permissionAttempted: false,
  });

  // Orientation listeners intentionally mount once and keep mutable motion in refs.
  // biome-ignore lint/correctness/useExhaustiveDependencies: remounting would duplicate sensor listeners.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const Orientation = window.DeviceOrientationEvent as OrientationConstructor | undefined;
    if (Orientation && typeof Orientation.requestPermission !== "function") enableOrientation();
    return () => {
      window.removeEventListener("deviceorientation", onOrientation);
      cancelAnimationFrame(stateRef.current.raf);
    };
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref-based fitting must rerun when manifest content changes.
  useLayoutEffect(() => {
    const card = cardRef.current;
    const copy = copyRef.current;
    if (!card || !copy) return;
    let frame = requestAnimationFrame(fitCopy);
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fitCopy);
    });
    observer.observe(card);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [
    manifest.photoHeight,
    manifest.occasion,
    manifest.title,
    manifest.message,
    manifest.signature,
  ]);

  function applyCopyScale(scale: number) {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty("--title-size", `${(3 * scale).toFixed(2)}rem`);
    card.style.setProperty("--message-size", `${(1.13 * scale).toFixed(2)}rem`);
    card.style.setProperty("--occasion-size", `${(0.86 * scale).toFixed(2)}rem`);
    card.style.setProperty("--signature-size", `${scale.toFixed(2)}rem`);
  }

  function fitCopy() {
    const copy = copyRef.current;
    if (!copy) return;
    let scale = 1;
    applyCopyScale(scale);
    void copy.offsetHeight;
    while (copy.scrollHeight > copy.clientHeight + 1 && scale > 0.55) {
      scale = Math.max(0.55, scale - 0.03);
      applyCopyScale(scale);
      void copy.offsetHeight;
    }
  }

  function ensureLoop() {
    if (!stateRef.current.raf) stateRef.current.raf = requestAnimationFrame(tick);
  }

  function tick() {
    const card = cardRef.current;
    const state = stateRef.current;
    if (!card) return;
    state.rx += (state.tx - state.rx) * 0.12;
    state.ry += (state.ty - state.ry) * 0.12;
    card.style.setProperty("--rx", `${state.rx.toFixed(3)}deg`);
    card.style.setProperty("--ry", `${state.ry.toFixed(3)}deg`);
    applyLight(state.rx, state.ry);
    const unsettled = Math.abs(state.tx - state.rx) > 0.02 || Math.abs(state.ty - state.ry) > 0.02;
    if (unsettled) state.raf = requestAnimationFrame(tick);
    else state.raf = 0;
  }

  function applyLight(rx: number, ry: number) {
    const card = cardRef.current;
    if (!card) return;
    const x = Math.max(0, Math.min(100, 50 + (ry / 14) * 48));
    const y = Math.max(0, Math.min(100, 50 - (rx / 14) * 48));
    const strength = Math.min(1, (Math.abs(rx) + Math.abs(ry)) / 18);
    card.style.setProperty("--mx", `${x.toFixed(1)}%`);
    card.style.setProperty("--my", `${y.toFixed(1)}%`);
    card.style.setProperty("--posx", `${(20 + x * 0.6).toFixed(1)}%`);
    card.style.setProperty("--posy", `${(20 + y * 0.6).toFixed(1)}%`);
    card.style.setProperty("--active", Math.max(strength, stateRef.current.active ? 0.35 : 0).toFixed(2));
  }

  function setTarget(rx: number, ry: number, active = true) {
    const state = stateRef.current;
    state.tx = Math.max(-14, Math.min(14, rx));
    state.ty = Math.max(-14, Math.min(14, ry));
    state.active = active;
    ensureLoop();
  }

  function onPointerDown(event: React.PointerEvent<HTMLLabelElement>) {
    const state = stateRef.current;
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia("(hover: hover) and (pointer: fine)").matches ||
      state.orientationReceiving
    ) {
      return;
    }
    state.dragging = true;
    state.moved = false;
    state.startX = event.clientX;
    state.startY = event.clientY;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const card = cardRef.current;
    if (!card) return;
    const box = card.getBoundingClientRect();
    const state = stateRef.current;
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches && event.buttons === 0) {
      const x = (event.clientX - box.left) / box.width;
      const y = (event.clientY - box.top) / box.height;
      setTarget((0.5 - y) * 28, (x - 0.5) * 28);
      return;
    }
    if (state.dragging && !state.orientationReceiving) {
      const dx = event.clientX - state.startX;
      const dy = event.clientY - state.startY;
      if (Math.hypot(dx, dy) > 7) state.moved = true;
      setTarget((-dy / box.height) * 28, (dx / box.width) * 28);
    }
  }

  function onPointerLeave() {
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) setTarget(0, 0, false);
  }

  function onPointerEnd() {
    const state = stateRef.current;
    if (!state.dragging) return;
    state.dragging = false;
    setTarget(0, 0, false);
  }

  function onOrientation(event: DeviceOrientationEvent) {
    if (event.beta == null || event.gamma == null) return;
    const state = stateRef.current;
    if (state.baseBeta == null) {
      state.baseBeta = event.beta;
      state.baseGamma = event.gamma;
    }
    state.orientationReceiving = true;
    setTarget(
      -(event.beta - state.baseBeta) * 0.45,
      (event.gamma - (state.baseGamma ?? event.gamma)) * 0.45,
    );
  }

  function enableOrientation() {
    const state = stateRef.current;
    if (
      state.orientationEnabled ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    state.orientationEnabled = true;
    window.addEventListener("deviceorientation", onOrientation);
  }

  async function requestOrientation() {
    const state = stateRef.current;
    if (
      state.permissionAttempted ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const Orientation = window.DeviceOrientationEvent as OrientationConstructor | undefined;
    if (!Orientation) return;
    state.permissionAttempted = true;
    if (typeof Orientation.requestPermission === "function") {
      try {
        if ((await Orientation.requestPermission()) === "granted") enableOrientation();
      } catch {
        // Touch drag remains available when permission is declined.
      }
    } else {
      enableOrientation();
    }
  }

  function onCardClick(event: React.MouseEvent<HTMLLabelElement>) {
    if (editable) return;
    if (stateRef.current.moved) {
      event.preventDefault();
      stateRef.current.moved = false;
      return;
    }
    void requestOrientation();
  }

  function editableProps(
    field: "occasion" | "title" | "message" | "signature",
    label: string,
    multiline = false,
  ) {
    if (!editable) return {};
    return {
      contentEditable: true,
      suppressContentEditableWarning: true,
      role: "textbox",
      "aria-label": label,
      "aria-multiline": multiline,
      spellCheck: true,
      "data-placeholder": label,
      onFocus: onEditStart,
      onPointerDown: (event: React.PointerEvent<HTMLElement>) => event.stopPropagation(),
      onClick: (event: React.MouseEvent<HTMLElement>) => event.stopPropagation(),
      onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
        if (!multiline && event.key === "Enter") event.preventDefault();
      },
      onInput: (event: React.FormEvent<HTMLElement>) => {
        onFieldChange?.(field, event.currentTarget.innerText ?? "");
        requestAnimationFrame(fitCopy);
      },
    };
  }

  function onPhotoPointerDown(event: React.PointerEvent<HTMLSpanElement>) {
    if (!editable || !onPhotoPositionChange) return;
    event.preventDefault();
    event.stopPropagation();
    photoDragRef.current = {
      dragging: true,
      startX: event.clientX,
      startY: event.clientY,
      originX: manifest.photoPositionX,
      originY: manifest.photoPositionY,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function onPhotoPointerMove(event: React.PointerEvent<HTMLSpanElement>) {
    const drag = photoDragRef.current;
    if (!drag.dragging || !onPhotoPositionChange) return;
    event.preventDefault();
    event.stopPropagation();
    const box = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, drag.originX - ((event.clientX - drag.startX) / box.width) * 100));
    const y = Math.max(0, Math.min(100, drag.originY - ((event.clientY - drag.startY) / box.height) * 100));
    onPhotoPositionChange(Math.round(x), Math.round(y));
  }

  function onPhotoPointerEnd(event: React.PointerEvent<HTMLSpanElement>) {
    if (!photoDragRef.current.dragging) return;
    event.preventDefault();
    event.stopPropagation();
    photoDragRef.current.dragging = false;
  }

  return (
    <div className={`holo-stage ${className}`} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      <input className="holo-flip-toggle" id={inputId} type="checkbox" aria-label="Virar o cartão" />
      <label
        ref={cardRef}
        className="holo-card"
        htmlFor={editable ? undefined : inputId}
        data-template={manifest.template}
        data-accent={manifest.accent}
        data-frame={manifest.frame}
        data-pattern={manifest.pattern}
        style={
          {
            "--photo-height": `${manifest.photoHeight}%`,
            "--photo-x": `${manifest.photoPositionX}%`,
            "--photo-y": `${manifest.photoPositionY}%`,
            "--custom-color": manifest.customColor,
          } as CSSProperties
        }
        onPointerDown={onPointerDown}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClick={onCardClick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") void requestOrientation();
        }}
      >
        <span className="holo-flipper">
          <span className="holo-face holo-face--front">
            <span className="holo-surface">
              <span
                className={`holo-photo-wrap${editable ? " is-photo-editable" : ""}`}
                onPointerDown={onPhotoPointerDown}
                onPointerMove={onPhotoPointerMove}
                onPointerUp={onPhotoPointerEnd}
                onPointerCancel={onPhotoPointerEnd}
              >
                <img className="holo-photo" src={photoUrl} alt="" />
                <span className="holo-photo-foil" aria-hidden="true" />
                <span className="holo-sparkle" aria-hidden="true" />
              </span>
              <span className="holo-copy" ref={copyRef}>
                <span className="holo-occasion" {...editableProps("occasion", "Ocasião")}>
                  {manifest.occasion}
                </span>
                <span className="holo-title" {...editableProps("title", "Título")}>
                  {manifest.title}
                </span>
                <span className="holo-message" {...editableProps("message", "Mensagem", true)}>
                  {manifest.message}
                </span>
                {manifest.signature || editable ? (
                  <span className="holo-signature" {...editableProps("signature", "Assinatura")}>
                    {manifest.signature}
                  </span>
                ) : null}
              </span>
              <span className="holo-foil" aria-hidden="true" />
              <span className="holo-lines" aria-hidden="true" />
              <span className="holo-glare" aria-hidden="true" />
            </span>
          </span>
          <span className="holo-face holo-face--back">
            <span className="holo-back">
              <span className="holo-back-foil" aria-hidden="true" />
              <span className="holo-back-glare" aria-hidden="true" />
              <span className="holo-back-logo">
                holocard <span>✦</span>
              </span>
            </span>
          </span>
        </span>
      </label>
      <a className="holo-chip" href={productUrl} aria-label="Abrir a página do Holocard">
        holocard ✦
      </a>
    </div>
  );
}
