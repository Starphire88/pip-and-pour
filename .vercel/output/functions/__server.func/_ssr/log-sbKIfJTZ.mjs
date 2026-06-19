import { r as __toESM } from "../_runtime.mjs";
import { a as require_jsx_runtime, o as require_react } from "../_libs/@radix-ui/react-collapsible+[...].mjs";
import { f as useHydrationStats, l as useAddHydrationLog, n as RequireAuth, o as pipLine, t as MobileShell } from "./pip-store-Cxqmce5k.mjs";
import { t as PipBubble } from "./PipBubble-DVneX9Rw.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/log-sbKIfJTZ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var QUICK = [
	150,
	250,
	350,
	500
];
function LogRoute() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RequireAuth, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogPage, {}) });
}
function LogPage() {
	const { total, goal, percent, streakBroken } = useHydrationStats();
	const addLog = useAddHydrationLog();
	const [custom, setCustom] = (0, import_react.useState)("");
	const [tapped, setTapped] = (0, import_react.useState)(null);
	const handleAdd = (amount) => {
		if (!amount || amount <= 0) return;
		setTapped(amount);
		addLog.mutate(amount);
		setTimeout(() => setTapped(null), 220);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(MobileShell, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "px-5 pt-5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				style: { fontFamily: "Nunito, system-ui, sans-serif" },
				className: "text-[22px] font-bold text-[#1A1A1A]",
				children: "Log a Drink"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-[13px] text-[#6B6B6B] mt-1",
				style: { fontFamily: "Inter, system-ui, sans-serif" },
				children: [
					total,
					" of ",
					goal,
					" ml today · ",
					percent,
					"%"
				]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
			className: "px-5 mt-5",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PipBubble, { text: pipLine(percent, total, streakBroken) })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
			className: "px-5 mt-6",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-2 gap-3",
				children: QUICK.map((amt) => {
					const isActive = tapped === amt;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => handleAdd(amt),
						disabled: addLog.isPending,
						className: `h-24 rounded-2xl border-[1.5px] border-[#1A1A1A] transition active:scale-[0.98] ${isActive ? "bg-[#A8D5E2]" : "bg-white"}`,
						style: { fontFamily: "Nunito, system-ui, sans-serif" },
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[26px] font-bold text-[#1A1A1A] leading-none",
							children: amt
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[12px] text-[#6B6B6B] mt-1",
							style: { fontFamily: "Inter, system-ui, sans-serif" },
							children: "milliliters"
						})]
					}, amt);
				})
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "px-5 mt-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				className: "text-[12px] uppercase tracking-wider text-[#6B6B6B]",
				style: { fontFamily: "Inter, system-ui, sans-serif" },
				children: "Custom Amount"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-2 flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					inputMode: "numeric",
					pattern: "[0-9]*",
					value: custom,
					onChange: (e) => setCustom(e.target.value.replace(/\D/g, "")),
					placeholder: "ml",
					className: "flex-1 h-12 rounded-xl border-[1.5px] border-[#1A1A1A] bg-white px-4 text-[16px] outline-none",
					style: { fontFamily: "Inter, system-ui, sans-serif" }
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => {
						const n = parseInt(custom, 10);
						if (n > 0) {
							handleAdd(n);
							setCustom("");
						}
					},
					disabled: addLog.isPending,
					className: "h-12 px-5 rounded-xl bg-[#1A1A1A] text-white",
					style: {
						fontFamily: "Nunito, system-ui, sans-serif",
						fontWeight: 700
					},
					children: "Add"
				})]
			})]
		})
	] });
}
//#endregion
export { LogRoute as component };
