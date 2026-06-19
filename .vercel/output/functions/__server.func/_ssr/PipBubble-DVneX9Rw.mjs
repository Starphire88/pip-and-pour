import { a as require_jsx_runtime } from "../_libs/@radix-ui/react-collapsible+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/PipBubble-DVneX9Rw.js
var import_jsx_runtime = require_jsx_runtime();
function PipBubble({ text }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative max-w-[320px] mx-auto bubble-in",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			"aria-hidden": true,
			className: "absolute left-1/2 -top-[9px] -translate-x-1/2 w-4 h-4 rotate-45 bg-white border-l-2 border-t-2 border-[#1A1A1A]"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "relative rounded-2xl border-2 border-[#1A1A1A] bg-white px-4 py-3",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				style: { fontFamily: "Nunito, system-ui, sans-serif" },
				className: "italic text-[14px] leading-snug text-[#1A1A1A] text-center",
				children: text
			})
		})]
	}, text);
}
//#endregion
export { PipBubble as t };
