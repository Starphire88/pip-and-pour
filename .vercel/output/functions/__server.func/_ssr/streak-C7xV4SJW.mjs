import { a as require_jsx_runtime } from "../_libs/@radix-ui/react-collapsible+[...].mjs";
import { f as useHydrationStats, n as RequireAuth, s as pipMood, t as MobileShell } from "./pip-store-Cxqmce5k.mjs";
import { t as PipImage } from "./PipImage-B7H6AkgW.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/streak-C7xV4SJW.js
var import_jsx_runtime = require_jsx_runtime();
function StreakRoute() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RequireAuth, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StreakPage, {}) });
}
var STAGES = [
	{
		key: "cub",
		name: "Baby Cub",
		minDays: 0,
		quote: "I'm new here. Be gentle."
	},
	{
		key: "teen",
		name: "Teen Panda",
		minDays: 3,
		quote: "Okay, I see you. Keep going."
	},
	{
		key: "adult",
		name: "Adult Panda",
		minDays: 7,
		quote: "We are a hydration machine now."
	},
	{
		key: "elder",
		name: "Elder Sage",
		minDays: 30,
		quote: "Wise. Hydrated. Untouchable."
	}
];
function currentStageIndex(days) {
	let idx = 0;
	STAGES.forEach((s, i) => {
		if (days >= s.minDays) idx = i;
	});
	return idx;
}
function StreakPage() {
	const { percent, streak, streakBroken } = useHydrationStats();
	const stageIdx = currentStageIndex(streak);
	const stage = STAGES[stageIdx];
	const mood = streakBroken ? "collapsed" : pipMood(percent, false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(MobileShell, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "px-5 pt-5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				style: { fontFamily: "Nunito, system-ui, sans-serif" },
				className: "text-[22px] font-bold text-[#1A1A1A]",
				children: "Streak & Evolution"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[13px] text-[#6B6B6B] mt-1",
				style: { fontFamily: "Inter, system-ui, sans-serif" },
				children: streakBroken ? "The streak was lost. Begin again." : "Pip levels up the longer you stay hydrated."
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
			className: "px-5 mt-5",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-2xl border border-[#E8E8E8] bg-white p-5 flex flex-col items-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PipImage, {
					mood,
					size: 180,
					className: "pip-float"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							style: { fontFamily: "Nunito, system-ui, sans-serif" },
							className: "text-[18px] font-bold text-[#1A1A1A]",
							children: streakBroken ? "Fallen Sage" : stage.name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-[14px] text-[#6B6B6B] mt-1",
							style: { fontFamily: "Inter, system-ui, sans-serif" },
							children: [streak, " day streak"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-3 italic text-[13px] text-[#1A1A1A] max-w-[260px] mx-auto",
							style: { fontFamily: "Nunito, system-ui, sans-serif" },
							children: [
								"\"",
								streakBroken ? "The streak is gone. It's fine. Today is a new day." : stage.quote,
								"\""
							]
						})
					]
				})]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "px-5 mt-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[12px] uppercase tracking-wider text-[#6B6B6B] mb-3",
				style: { fontFamily: "Inter, system-ui, sans-serif" },
				children: "Milestones"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute left-0 right-0 top-3 h-[2px] bg-[#E8E8E8]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "relative grid grid-cols-4 gap-2",
					children: STAGES.map((s, i) => {
						const active = i === stageIdx && !streakBroken;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-col items-center text-center",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `h-7 w-7 rounded-full border-2 ${active ? "bg-[#A8D5E2] border-[#1A1A1A]" : i <= stageIdx && !streakBroken ? "bg-[#1A1A1A] border-[#1A1A1A]" : "bg-white border-[#E8E8E8]"}` }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: `mt-2 text-[11px] leading-tight ${active ? "text-[#1A1A1A] font-semibold" : "text-[#9A9A9A]"}`,
									style: { fontFamily: "Inter, system-ui, sans-serif" },
									children: s.name
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-[10px] text-[#9A9A9A] mt-0.5",
									style: { fontFamily: "Inter, system-ui, sans-serif" },
									children: [s.minDays, "d"]
								})
							]
						}, s.key);
					})
				})]
			})]
		})
	] });
}
//#endregion
export { StreakRoute as component };
