"use client";

import { useEffect } from "react";

/** A fragment survives related-card navigation and reloads without session state. */
export function MapFocusRestore() {
  useEffect(() => {
    function restore() {
      const id = window.location.hash.slice(1);
      if (!/^map-node-[a-z0-9-]+$/.test(id)) return;
      const node = document.getElementById(id);
      if (!(node instanceof HTMLAnchorElement)) return;
      node.scrollIntoView({ block: "center" });
      node.focus({ preventScroll: true });
    }
    restore();
    window.addEventListener("hashchange", restore);
    return () => window.removeEventListener("hashchange", restore);
  }, []);
  return null;
}
