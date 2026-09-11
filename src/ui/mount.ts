import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";

import type { AnalysisResult, UserDecision } from "../types";
import { Overlay } from "./Overlay";
import styles from "./styles.css?inline";

export interface OverlayController {
  showResult(
    result: AnalysisResult,
    showTechnicalByDefault?: boolean,
    canRevoke?: boolean,
  ): void;
  unmount(): void;
}

let mounted: { host: HTMLDivElement; root: Root } | undefined;

export function mountOverlay(
  onDecision: (decision: UserDecision) => void,
): OverlayController {
  removeMountedOverlay();

  const host = document.createElement("div");
  host.id = "plainsign-root";
  Object.assign(host.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
  });
  document.documentElement.append(host);

  const shadow = host.attachShadow({
    mode: import.meta.env?.VITE_E2E === "1" ? "open" : "closed",
  });
  const style = document.createElement("style");
  style.textContent = styles;
  const mountPoint = document.createElement("div");
  shadow.append(style, mountPoint);

  const root = createRoot(mountPoint);
  mounted = { host, root };
  let decided = false;
  const decide = (decision: UserDecision): void => {
    if (decided) return;
    decided = true;
    onDecision(decision);
  };
  flushSync(() => {
    root.render(createElement(Overlay, { onDecision: decide }));
  });

  return {
    showResult(result, showTechnicalByDefault = false, canRevoke = false) {
      if (!decided && mounted?.host === host) {
        root.render(
          createElement(Overlay, {
            result,
            showTechnicalByDefault,
            canRevoke,
            onDecision: decide,
          }),
        );
      }
    },
    unmount() {
      if (mounted?.host === host) removeMountedOverlay();
    },
  };
}

export function removeMountedOverlay(): void {
  if (!mounted) return;
  mounted.root.unmount();
  mounted.host.remove();
  mounted = undefined;
}
