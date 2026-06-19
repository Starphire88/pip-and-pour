import { a as require_jsx_runtime } from "../_libs/@radix-ui/react-collapsible+[...].mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as PipImage } from "./PipImage-B7H6AkgW.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/AuthShell-FIGjdTQ4.js
var import_jsx_runtime = require_jsx_runtime();
function AuthShell({ title, subtitle, children, footer }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "min-h-screen w-full flex justify-center bg-white",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-[440px] px-6 pt-10 pb-12 flex flex-col items-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PipImage, {
					mood: "neutral",
					size: 120,
					className: "pip-float"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-6 text-[22px] font-bold text-[#1A1A1A] text-center",
					style: { fontFamily: "Nunito, system-ui, sans-serif" },
					children: title
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-[14px] text-[#6B6B6B] text-center max-w-[300px]",
					style: { fontFamily: "Inter, system-ui, sans-serif" },
					children: subtitle
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-8 w-full",
					children
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6 text-center",
					children: footer
				})
			]
		})
	});
}
function AuthField({ label, id, type, value, onChange, placeholder, autoComplete }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
		htmlFor: id,
		className: "text-[12px] uppercase tracking-wider text-[#6B6B6B]",
		style: { fontFamily: "Inter, system-ui, sans-serif" },
		children: label
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		id,
		type,
		value,
		onChange: (e) => onChange(e.target.value),
		placeholder,
		autoComplete,
		className: "mt-2 w-full h-12 rounded-xl border-[1.5px] border-[#1A1A1A] bg-white px-4 text-[16px] text-[#1A1A1A] outline-none",
		style: { fontFamily: "Inter, system-ui, sans-serif" }
	})] });
}
function AuthLink({ to, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
		to,
		className: "text-[13px] text-[#6B6B6B] underline",
		style: { fontFamily: "Inter, system-ui, sans-serif" },
		children
	});
}
//#endregion
export { AuthLink as n, AuthShell as r, AuthField as t };
