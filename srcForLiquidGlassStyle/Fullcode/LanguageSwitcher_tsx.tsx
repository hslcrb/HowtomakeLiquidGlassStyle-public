"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useRef, useState, useCallback, useEffect } from "react";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [dragX, setDragX] = useState<number | null>(null);
  const [pendingLocale, setPendingLocale] = useState<string | null>(null);

  const startXRef = useRef(0);
  const startPillXRef = useRef(0);

  const KO_POS = 0;
  const EN_POS = 36;
  const THRESHOLD = 18;
  const DRAG_THRESHOLD = 3;

  // locale 변경 완료 시 pending 클리어
  useEffect(() => {
    if (pendingLocale && pendingLocale === locale) {
      setPendingLocale(null);
    }
  }, [locale, pendingLocale]);

  const getPillPosition = useCallback(() => {
    if (dragX !== null) return dragX;
    const effectiveLocale = pendingLocale ?? locale;
    return effectiveLocale === "en" ? EN_POS : KO_POS;
  }, [dragX, locale, pendingLocale]);

  const switchLocale = useCallback((newLocale: string) => {
    if (newLocale !== locale) {
      document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
      router.refresh();
    }
  }, [locale, router]);

  const handleDragStart = useCallback((clientX: number) => {
    setIsDragging(true);
    setHasDragged(false);
    startXRef.current = clientX;
    startPillXRef.current = locale === "en" ? EN_POS : KO_POS;
  }, [locale]);

  const handleDragMove = useCallback((clientX: number) => {
    if (!isDragging) return;
    const deltaX = clientX - startXRef.current;
    if (Math.abs(deltaX) > DRAG_THRESHOLD) setHasDragged(true);

    let newX = startPillXRef.current + deltaX;
    const elasticRange = 8;
    newX = Math.max(-elasticRange, Math.min(EN_POS + elasticRange, newX));
    setDragX(newX);
  }, [isDragging]);

  const handleDragEnd = useCallback((endClientX?: number) => {
    if (!isDragging) return;

    let newLocale: string | null = null;

    if (hasDragged) {
      const currentX = dragX ?? (locale === "en" ? EN_POS : KO_POS);
      newLocale = currentX > THRESHOLD ? "en" : "ko";
    } else if (endClientX !== undefined && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = endClientX - rect.left;
      newLocale = clickX > rect.width / 2 ? "en" : "ko";
    }

    if (newLocale && newLocale !== locale) {
      setPendingLocale(newLocale); // 바운스백 방지
    }

    setIsDragging(false);
    setDragX(null);
    if (newLocale) switchLocale(newLocale);
    setTimeout(() => setHasDragged(false), 50);
  }, [isDragging, dragX, locale, hasDragged, switchLocale]);

  // 전역 이벤트
  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => handleDragMove(e.clientX);
    const handleTouchMove = (e: TouchEvent) => handleDragMove(e.touches[0].clientX);
    const handleMouseUp = (e: MouseEvent) => handleDragEnd(e.clientX);
    const handleTouchEnd = (e: TouchEvent) => handleDragEnd(e.changedTouches[0]?.clientX);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  const pillPosition = getPillPosition();
  const effectiveLocale = pendingLocale ?? locale;
  const isAtEn = dragX !== null ? dragX > THRESHOLD : effectiveLocale === "en";

  return (
    <div
      ref={containerRef}
      className="h-10 w-[72px] flex items-center justify-center rounded-full relative overflow-hidden select-none cursor-grab active:cursor-grabbing"
      onMouseDown={(e) => { e.preventDefault(); handleDragStart(e.clientX); }}
      onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
    >
      {/* Glass layers */}
      <div className="absolute inset-0 rounded-full bg-white/[0.04] backdrop-blur-xl" />
      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/[0.08] to-transparent" />
      <div className="absolute inset-0 rounded-full border border-white/[0.12] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-1px_1px_rgba(0,0,0,0.1)]" />

      {/* Dynamic light */}
      <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
        <div
          className="absolute w-[200%] h-[200%] -top-1/2 -left-1/2 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.15)_0%,transparent_50%)] transition-transform duration-500"
          style={{ transform: `rotate(${isAtEn ? 15 : -15}deg)` }}
        />
      </div>

      {/* Labels */}
      <div className="absolute inset-0 flex items-center pointer-events-none z-10">
        <div className="flex-1 text-center text-xs font-semibold" style={{ color: !isAtEn ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.5)" }}>KO</div>
        <div className="flex-1 text-center text-xs font-semibold" style={{ color: isAtEn ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.5)" }}>EN</div>
      </div>

      {/* Sliding pill */}
      <div
        className="absolute top-1 bottom-1 w-[28px] rounded-full pointer-events-none"
        style={{
          left: "4px",
          transform: `translateX(${pillPosition}px) scale(${isDragging ? 1.08 : 1})`,
          transition: isDragging
            ? "transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1)"
            : "transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1)"
        }}
      >
        <div className="absolute inset-0 rounded-full bg-white transition-opacity duration-200" style={{ opacity: isDragging ? 0 : 1 }} />
        <div
          className="absolute inset-0 rounded-full backdrop-blur-xl transition-opacity duration-200"
          style={{
            opacity: isDragging ? 1 : 0,
            background: "linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0.15), rgba(255,255,255,0.25))"
          }}
        />
        <div
          className="absolute inset-0 rounded-full border transition-all duration-200"
          style={{ borderColor: isDragging ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.3)" }}
        />
        <div
          className="absolute inset-x-1 top-0.5 h-1/3 rounded-full bg-gradient-to-b from-white to-transparent"
          style={{ opacity: isDragging ? 0.4 : 0.8 }}
        />
        <div
          className="absolute inset-0 rounded-full overflow-hidden transition-opacity duration-200"
          style={{ opacity: isDragging ? 1 : 0 }}
        >
          <div
            style={{
              background: "radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.6) 0%, transparent 40%), radial-gradient(ellipse at 70% 80%, rgba(255,255,255,0.3) 0%, transparent 30%)"
            }}
            className="w-full h-full"
          />
        </div>
      </div>
    </div>
  );
}