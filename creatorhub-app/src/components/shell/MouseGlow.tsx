"use client";

import { useEffect } from "react";

export function MouseGlow() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    let frame = 0;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let pending = false;

    function flush() {
      pending = false;
      document.documentElement.style.setProperty("--mx", `${x}px`);
      document.documentElement.style.setProperty("--my", `${y}px`);
    }

    function onMove(e: MouseEvent) {
      x = e.clientX;
      y = e.clientY;
      if (!pending) {
        pending = true;
        frame = requestAnimationFrame(flush);
      }
    }

    document.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      document.removeEventListener("mousemove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
