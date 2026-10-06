// Centralized inline-SVG icon set - Lucide (https://lucide.dev, ISC
// license, via the lucide-static package) - replacing the emoji that
// used to stand in for every icon in this app. Each icon is imported
// as a raw SVG string (Vite's `?raw` suffix) and wrapped in a
// `<span class="icon">` by icon() below, so sizing/alignment is
// controlled from one place in style.css instead of per-call-site.
// Lucide's SVGs use stroke="currentColor", so an icon automatically
// matches whatever text color surrounds it - including across the
// light/dark theme switch (see main.js's applyTheme()) - with no extra
// color rules needed here.
import spade from "lucide-static/icons/spade.svg?raw";
import bell from "lucide-static/icons/bell.svg?raw";
import user from "lucide-static/icons/user.svg?raw";
import settings from "lucide-static/icons/settings.svg?raw";
import pkg from "lucide-static/icons/package.svg?raw";
import store from "lucide-static/icons/store.svg?raw";
import wrench from "lucide-static/icons/wrench.svg?raw";
import logOut from "lucide-static/icons/log-out.svg?raw";
import arrowLeft from "lucide-static/icons/arrow-left.svg?raw";
import shoppingBag from "lucide-static/icons/shopping-bag.svg?raw";
import phone from "lucide-static/icons/phone.svg?raw";
import phoneOff from "lucide-static/icons/phone-off.svg?raw";
import armchair from "lucide-static/icons/armchair.svg?raw";
import mic from "lucide-static/icons/mic.svg?raw";
import micOff from "lucide-static/icons/mic-off.svg?raw";
import volume2 from "lucide-static/icons/volume-2.svg?raw";
import volumeX from "lucide-static/icons/volume-x.svg?raw";
import video from "lucide-static/icons/video.svg?raw";
import videoOff from "lucide-static/icons/video-off.svg?raw";
import messageSquare from "lucide-static/icons/message-square.svg?raw";
import sun from "lucide-static/icons/sun.svg?raw";
import moon from "lucide-static/icons/moon.svg?raw";
import maximize2 from "lucide-static/icons/maximize-2.svg?raw";
import minimize2 from "lucide-static/icons/minimize-2.svg?raw";
import x from "lucide-static/icons/x.svg?raw";
import check from "lucide-static/icons/check.svg?raw";
import trophy from "lucide-static/icons/trophy.svg?raw";

const ICONS = {
  spade,
  bell,
  user,
  settings,
  package: pkg,
  store,
  wrench,
  "log-out": logOut,
  "arrow-left": arrowLeft,
  "shopping-bag": shoppingBag,
  phone,
  "phone-off": phoneOff,
  armchair,
  mic,
  "mic-off": micOff,
  "volume-2": volume2,
  "volume-x": volumeX,
  video,
  "video-off": videoOff,
  "message-square": messageSquare,
  sun,
  moon,
  "maximize-2": maximize2,
  "minimize-2": minimize2,
  x,
  check,
  trophy,
};

// Strips the `<!-- @license ... -->` comment each raw .svg file starts
// with - harmless either way, but repeating it in the DOM on every one
// of the many icon() calls across the app is just noise. The license
// itself is unaffected (still ISC, still in node_modules/lucide-static
// and package.json).
function stripLicenseComment(svg) {
  return svg.replace(/^<!--.*?-->\s*/s, "");
}

/**
 * Returns `name`'s SVG markup wrapped in `<span class="icon">`, ready
 * to drop into innerHTML - e.g.:
 *   btn.innerHTML = `${icon("bell")} Notifications`;
 * `extraClass` adds to the wrapper span (e.g. a size override) without
 * needing a one-off wrapper element at the call site.
 */
export function icon(name, extraClass = "") {
  const svg = ICONS[name];
  if (!svg) return "";
  return `<span class="icon${extraClass ? ` ${extraClass}` : ""}">${stripLicenseComment(svg)}</span>`;
}
