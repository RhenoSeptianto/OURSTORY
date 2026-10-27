import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ChevronLeft, ChevronRight, ImagePlus } from "lucide-react";
import { PrivateImage } from "../components";
import type { Slide } from "./model";
export function cropStyle(photo: Slide): CSSProperties {
  return {
    objectFit: photo.fit,
    objectPosition: `${photo.x}% ${photo.y}%`,
    transform: `scale(${photo.zoom})`,
    transformOrigin: `${photo.x}% ${photo.y}%`,
  };
}
export function SlideImage({ slide }: { slide: Slide }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [slide.url, slide.path]);
  return (
    <div
      className="polaroid-photo"
      style={
        {
          "--photo-fit": slide.fit,
          "--photo-position": `${slide.x}% ${slide.y}%`,
          "--photo-zoom": slide.zoom,
        } as CSSProperties
      }
    >
      {slide.url && !failed ? (
        <img
          src={slide.url}
          alt={slide.caption || "Foto kenangan pilihan"}
          onError={() => setFailed(true)}
          style={cropStyle(slide)}
        />
      ) : slide.path ? (
        <PrivateImage
          path={slide.path}
          alt={slide.caption || "Foto kenangan pilihan"}
        />
      ) : (
        <div className="image-placeholder">
          <ImagePlus size={28} />
          <span>Foto tidak tersedia</span>
        </div>
      )}
    </div>
  );
}
export function PolaroidPlayer({
  slides,
  paused = false,
  label = "Polaroid kenangan kita",
}: {
  slides: Slide[];
  paused?: boolean;
  label?: string;
}) {
  const [index, setIndex] = useState(0),
    [reset, setReset] = useState(0),
    [hover, setHover] = useState(false),
    [focus, setFocus] = useState(false),
    [hidden, setHidden] = useState(document.hidden),
    [reduced, setReduced] = useState(
      () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const current = slides.length ? Math.min(index, slides.length - 1) : 0;
  const signature = slides.map((s) => s.photo_id).join(",");
  useEffect(() => {
    setIndex(0);
  }, [signature]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => setReduced(media.matches),
      visibility = () => setHidden(document.hidden);
    media.addEventListener("change", motion);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      media.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    if (slides.length < 2 || paused || hover || focus || reduced) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      if (document.hidden) return;
      timer = setTimeout(() => {
        if (
          !document.hidden &&
          !window.matchMedia("(prefers-reduced-motion: reduce)").matches
        )
          setIndex((i) => (i + 1) % slides.length);
      }, 6000);
    };
    document.addEventListener("visibilitychange", schedule);
    schedule();
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [slides.length, current, reset, paused, hover, focus, reduced, signature]);
  const go = (next: number) => {
    if (!slides.length) return;
    setIndex((next + slides.length) % slides.length);
    setReset((r) => r + 1);
  };
  const neighbors = new Set([
    current,
    (current + 1) % slides.length,
    (current - 1 + slides.length) % slides.length,
  ]);
  return (
    <section
      className={"polaroid-player " + (reduced ? "still" : "")}
      aria-label={label}
      aria-roledescription="carousel"
      data-autoplay={
        slides.length > 1 && !paused && !hover && !focus && !hidden && !reduced
          ? "running"
          : "paused"
      }
      tabIndex={0}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setFocus(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocus(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          go(current + 1);
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          go(current - 1);
        }
      }}
    >
      <div
        className="polaroid-viewport"
        onPointerDown={(e) => {
          if (e.isPrimary) pointer.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerCancel={() => {
          pointer.current = null;
        }}
        onPointerUp={(e) => {
          if (!pointer.current) return;
          const dx = e.clientX - pointer.current.x,
            dy = e.clientY - pointer.current.y;
          pointer.current = null;
          if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy) * 1.3)
            go(current + (dx < 0 ? 1 : -1));
        }}
      >
        {!slides.length ? (
          <div className="image-placeholder">
            <ImagePlus size={30} />
            <span>Add our first memory ♡</span>
          </div>
        ) : (
          slides.map((slide, i) =>
            neighbors.has(i) ? (
              <div
                key={slide.photo_id}
                className={
                  "polaroid-layer " + (current === i ? "is-current" : "")
                }
                aria-hidden={current !== i}
              >
                <SlideImage slide={slide} />
              </div>
            ) : null,
          )
        )}
        {slides.length > 1 && (
          <>
            <button
              className="polaroid-arrow prev"
              aria-label="Foto sebelumnya"
              onClick={() => go(current - 1)}
            >
              <ChevronLeft size={17} />
            </button>
            <button
              className="polaroid-arrow next"
              aria-label="Foto berikutnya"
              onClick={() => go(current + 1)}
            >
              <ChevronRight size={17} />
            </button>
          </>
        )}
      </div>
      <div
        className="polaroid-caption"
        aria-live={paused || focus || hover || reduced ? "polite" : "off"}
      >
        {slides[current]?.caption || "you, me & somewhere new ♡"}
      </div>
      <div className="polaroid-dots" aria-label="Pilih foto">
        {slides.length > 1 &&
          slides.map((slide, i) => (
            <button
              key={slide.photo_id}
              aria-label={`Tampilkan foto ${i + 1}`}
              aria-current={current === i ? "true" : undefined}
              onClick={() => go(i)}
            >
              <span />
            </button>
          ))}
      </div>
    </section>
  );
}
