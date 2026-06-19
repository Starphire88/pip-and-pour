import { r as __toESM } from "../_runtime.mjs";
import { a as require_jsx_runtime, n as CollapsibleTrigger$1, o as require_react, r as Root, t as CollapsibleContent$1 } from "../_libs/@radix-ui/react-collapsible+[...].mjs";
import { r as useAuth } from "./useAuth-72BPIaO7.mjs";
import { _ as useNavigate, g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Plus, d as ChevronDown, i as Settings, n as Trash2, o as Minus, r as Target, s as LogOut, t as X } from "../_libs/lucide-react.mjs";
import { _ as useUserSettings, a as goalSavedLine, c as setPipLineOverride, d as useHydrationHistory, f as useHydrationStats, g as useUpsertDailyGoal, h as usePipLineOverride, i as formatRelative, l as useAddHydrationLog, m as usePipLine, n as RequireAuth, o as pipLine, p as useLatestLogToday, r as clearPipLineOverride, s as pipMood, t as MobileShell, u as useDeleteHydrationLog } from "./pip-store-Cxqmce5k.mjs";
import { t as PipBubble } from "./PipBubble-DVneX9Rw.mjs";
import { t as PipImage } from "./PipImage-B7H6AkgW.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BwCmCXu_.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Collapsible = Root;
var CollapsibleTrigger = CollapsibleTrigger$1;
var CollapsibleContent = CollapsibleContent$1;
function ProgressRing({ percent, total, goal, size = 200, stroke = 12 }) {
	const radius = (size - stroke) / 2;
	const circ = 2 * Math.PI * radius;
	const offset = circ - Math.min(percent, 100) / 100 * circ;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative inline-flex items-center justify-center",
		style: {
			width: size,
			height: size
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			width: size,
			height: size,
			className: "-rotate-90",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: size / 2,
				cy: size / 2,
				r: radius,
				fill: "none",
				stroke: "#E8E8E8",
				strokeWidth: stroke
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: size / 2,
				cy: size / 2,
				r: radius,
				fill: "none",
				stroke: "#A8D5E2",
				strokeWidth: stroke,
				strokeLinecap: "round",
				strokeDasharray: circ,
				strokeDashoffset: offset,
				style: { transition: "stroke-dashoffset 0.6s ease" }
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "absolute inset-0 flex flex-col items-center justify-center",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				style: { fontFamily: "Nunito, system-ui, sans-serif" },
				className: "text-[32px] font-bold leading-none text-[#1A1A1A]",
				children: [percent, "%"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "mt-1 text-[12px] text-[#6B6B6B]",
				style: { fontFamily: "Inter, system-ui, sans-serif" },
				children: [
					total,
					" / ",
					goal,
					" ml"
				]
			})]
		})]
	});
}
var COLORS = [
	"#A8D5E2",
	"#7BAE7F",
	"#F2C57E",
	"#F4B8B8",
	"#1A1A1A"
];
function Confetti({ show }) {
	const [pieces, setPieces] = (0, import_react.useState)([]);
	(0, import_react.useEffect)(() => {
		if (!show) return;
		setPieces(Array.from({ length: 40 }, (_, i) => ({
			id: i + Date.now(),
			left: Math.random() * 100,
			x: (Math.random() - .5) * 200,
			delay: Math.random() * .4,
			color: COLORS[i % COLORS.length],
			size: 6 + Math.random() * 8
		})));
		const t = setTimeout(() => setPieces([]), 3e3);
		return () => clearTimeout(t);
	}, [show]);
	if (!pieces.length) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "pointer-events-none fixed inset-0 z-50 overflow-hidden",
		children: pieces.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "confetti-piece absolute top-0 rounded-sm",
			style: {
				left: `${p.left}%`,
				width: p.size,
				height: p.size,
				background: p.color,
				animationDelay: `${p.delay}s`,
				["--x"]: `${p.x}px`
			}
		}, p.id))
	});
}
function Onboarding({ onDone, isSubmitting = false }) {
	const [goal, setGoal] = (0, import_react.useState)(2e3);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-40 bg-white flex justify-center overflow-y-auto",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-[440px] px-6 pt-10 pb-12 flex flex-col items-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PipImage, {
					mood: "neutral",
					size: 180,
					className: "pip-float"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6 w-full rounded-2xl border-2 border-[#1A1A1A] bg-white px-5 py-4",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						style: { fontFamily: "Nunito, system-ui, sans-serif" },
						className: "italic text-[15px] leading-relaxed text-[#1A1A1A] text-center",
						children: "\"Oh — hello. You found me. I'm Pip. I will be... emotionally invested in your hydration. Pick a daily goal and we begin.\""
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-8 w-full",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-center text-[12px] uppercase tracking-wider text-[#6B6B6B]",
						style: { fontFamily: "Inter, system-ui, sans-serif" },
						children: "Daily Goal"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 flex items-center justify-center gap-5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setGoal((g) => Math.max(500, g - 250)),
								className: "h-12 w-12 rounded-full bg-[#A8D5E2] flex items-center justify-center active:scale-95 transition",
								"aria-label": "Decrease goal",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, {
									className: "text-[#1A1A1A]",
									size: 20
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-center min-w-[120px]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: { fontFamily: "Nunito, system-ui, sans-serif" },
									className: "text-[40px] font-bold text-[#1A1A1A] leading-none",
									children: goal
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[12px] text-[#6B6B6B] mt-1",
									style: { fontFamily: "Inter, system-ui, sans-serif" },
									children: "milliliters"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setGoal((g) => Math.min(5e3, g + 250)),
								className: "h-12 w-12 rounded-full bg-[#A8D5E2] flex items-center justify-center active:scale-95 transition",
								"aria-label": "Increase goal",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {
									className: "text-[#1A1A1A]",
									size: 20
								})
							})
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => onDone(goal),
					disabled: isSubmitting,
					className: "mt-10 w-full h-12 rounded-xl bg-[#1A1A1A] text-white active:scale-[0.99] transition disabled:opacity-60",
					style: {
						fontFamily: "Nunito, system-ui, sans-serif",
						fontWeight: 700
					},
					children: isSubmitting ? "Saving…" : "Let's go"
				})
			]
		})
	});
}
var MIN_GOAL = 500;
var MAX_GOAL = 5e3;
function validateGoal(value) {
	const trimmed = value.trim();
	if (!trimmed) return "Enter a daily goal";
	const n = Number(trimmed);
	if (!Number.isFinite(n) || !Number.isInteger(n)) return "Enter a whole number";
	if (n < MIN_GOAL || n > MAX_GOAL) return `Goal must be between ${MIN_GOAL} and ${MAX_GOAL} ml`;
	return null;
}
function SettingsModal({ open, onClose }) {
	const { data: settings } = useUserSettings();
	const upsertGoal = useUpsertDailyGoal();
	const [value, setValue] = (0, import_react.useState)("");
	const [validationError, setValidationError] = (0, import_react.useState)(null);
	const [submitError, setSubmitError] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		if (!open) return;
		setValue(settings ? String(settings.daily_goal_ml) : "");
		setValidationError(null);
		setSubmitError(null);
	}, [open, settings?.daily_goal_ml]);
	if (!open) return null;
	const handleSave = () => {
		const error = validateGoal(value);
		if (error) {
			setValidationError(error);
			return;
		}
		setValidationError(null);
		setSubmitError(null);
		upsertGoal.mutate(Number(value.trim()), {
			onSuccess: () => {
				setPipLineOverride(goalSavedLine());
				onClose();
			},
			onError: (err) => {
				setSubmitError(err instanceof Error ? err.message : "Could not save. Try again.");
			}
		});
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "fixed inset-0 z-50 flex items-center justify-center px-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			"aria-label": "Close settings",
			className: "absolute inset-0 bg-black/40",
			onClick: onClose
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			role: "dialog",
			"aria-modal": "true",
			"aria-labelledby": "settings-modal-title",
			className: "relative w-full max-w-[360px] rounded-2xl border-2 border-[#1A1A1A] bg-white px-6 py-6 shadow-lg",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						id: "settings-modal-title",
						style: { fontFamily: "Nunito, system-ui, sans-serif" },
						className: "text-[20px] font-bold text-[#1A1A1A]",
						children: "Edit Daily Goal"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onClose,
						"aria-label": "Close",
						className: "h-8 w-8 rounded-full flex items-center justify-center active:bg-[#F9F9F9]",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {
							size: 18,
							className: "text-[#1A1A1A]"
						})
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-[13px] text-[#6B6B6B]",
					style: { fontFamily: "Inter, system-ui, sans-serif" },
					children: "How much water should Pip expect from you each day?"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							htmlFor: "daily-goal-input",
							className: "text-[12px] uppercase tracking-wider text-[#6B6B6B]",
							style: { fontFamily: "Inter, system-ui, sans-serif" },
							children: "Daily goal (ml)"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "daily-goal-input",
							type: "number",
							min: MIN_GOAL,
							max: MAX_GOAL,
							step: 250,
							value,
							onChange: (e) => {
								setValue(e.target.value);
								if (validationError) setValidationError(null);
								if (submitError) setSubmitError(null);
							},
							className: "mt-2 w-full h-12 rounded-xl border-2 border-[#1A1A1A] px-4 text-[18px] font-bold text-[#1A1A1A] outline-none focus:ring-2 focus:ring-[#A8D5E2]",
							style: { fontFamily: "Nunito, system-ui, sans-serif" }
						}),
						(validationError || submitError) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-[13px] text-red-600",
							style: { fontFamily: "Inter, system-ui, sans-serif" },
							children: validationError ?? submitError
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: handleSave,
					disabled: upsertGoal.isPending,
					className: "mt-6 w-full h-12 rounded-xl bg-[#1A1A1A] text-white active:scale-[0.99] transition disabled:opacity-60",
					style: {
						fontFamily: "Nunito, system-ui, sans-serif",
						fontWeight: 700
					},
					children: upsertGoal.isPending ? "Saving…" : "Save"
				})
			]
		})]
	});
}
function HomePage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RequireAuth, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Home$1, {}) });
}
function Home$1() {
	const navigate = useNavigate();
	const { signOut } = useAuth();
	const settingsQuery = useUserSettings();
	const { total, goal, percent, streak, streakBroken, isLoading } = useHydrationStats();
	const latestLogQuery = useLatestLogToday();
	const addLog = useAddHydrationLog();
	const upsertGoal = useUpsertDailyGoal();
	const [confetti, setConfetti] = (0, import_react.useState)(false);
	const [menuOpen, setMenuOpen] = (0, import_react.useState)(false);
	const [goalModalOpen, setGoalModalOpen] = (0, import_react.useState)(false);
	const settingsRef = (0, import_react.useRef)(null);
	const prev = (0, import_react.useRef)(percent);
	const lineOverride = usePipLineOverride();
	const mood = pipMood(percent, streakBroken);
	const pipLineQuery = usePipLine(percent, streak, mood);
	(0, import_react.useEffect)(() => {
		if (!menuOpen) return;
		const onPointerDown = (e) => {
			if (settingsRef.current && !settingsRef.current.contains(e.target)) setMenuOpen(false);
		};
		document.addEventListener("pointerdown", onPointerDown);
		return () => document.removeEventListener("pointerdown", onPointerDown);
	}, [menuOpen]);
	const handleLogout = async () => {
		setMenuOpen(false);
		await signOut();
		navigate({
			to: "/auth/login",
			replace: true
		});
	};
	const openGoalModal = () => {
		setMenuOpen(false);
		setGoalModalOpen(true);
	};
	(0, import_react.useEffect)(() => {
		clearPipLineOverride();
	}, [total, streakBroken]);
	(0, import_react.useEffect)(() => {
		if (prev.current < 100 && percent >= 100) {
			setConfetti(true);
			const t = setTimeout(() => setConfetti(false), 50);
			return () => clearTimeout(t);
		}
		prev.current = percent;
	}, [percent]);
	if (settingsQuery.isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MobileShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex items-center justify-center min-h-[50vh] text-[#6B6B6B]",
		style: { fontFamily: "Inter, system-ui, sans-serif" },
		children: "Loading…"
	}) });
	if (!settingsQuery.data) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Onboarding, {
		onDone: (dailyGoal) => upsertGoal.mutate(dailyGoal),
		isSubmitting: upsertGoal.isPending
	});
	const fallbackLine = pipLine(percent, total, streakBroken);
	const line = lineOverride ?? (pipLineQuery.isSuccess && pipLineQuery.data ? pipLineQuery.data : fallbackLine);
	const lastLogged = latestLogQuery.data ?? null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(MobileShell, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Confetti, { show: confetti }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingsModal, {
			open: goalModalOpen,
			onClose: () => setGoalModalOpen(false)
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "flex items-center justify-between px-5 pt-5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				style: { fontFamily: "Nunito, system-ui, sans-serif" },
				className: "text-[22px] font-bold text-[#1A1A1A]",
				children: "Pip 🐼"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative",
				ref: settingsRef,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					"aria-label": "Settings",
					"aria-expanded": menuOpen,
					onClick: () => setMenuOpen((open) => !open),
					className: "h-9 w-9 rounded-full flex items-center justify-center active:bg-[#F9F9F9]",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, {
						size: 20,
						className: "text-[#1A1A1A]"
					})
				}), menuOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "absolute right-0 top-11 z-20 min-w-[180px] rounded-xl border border-[#E8E8E8] bg-white py-1 shadow-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: openGoalModal,
						className: "flex w-full items-center gap-2 px-4 py-2.5 text-left text-[14px] text-[#1A1A1A] active:bg-[#F9F9F9]",
						style: { fontFamily: "Inter, system-ui, sans-serif" },
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Target, { size: 16 }), "Edit Daily Goal"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: handleLogout,
						className: "flex w-full items-center gap-2 px-4 py-2.5 text-left text-[14px] text-[#1A1A1A] active:bg-[#F9F9F9]",
						style: { fontFamily: "Inter, system-ui, sans-serif" },
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { size: 16 }), "Log out"]
					})]
				})]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "flex flex-col items-center px-5 mt-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-[200px] w-[200px] flex items-center justify-center",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PipImage, {
						mood,
						size: 200,
						className: "pip-float"
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-3 w-full",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PipBubble, { text: line })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProgressRing, {
						percent,
						total,
						goal,
						size: 200,
						stroke: 12
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => addLog.mutate(250),
					disabled: addLog.isPending || isLoading,
					className: "mt-6 w-full h-12 rounded-xl bg-[#A8D5E2] text-[#1A1A1A] active:scale-[0.99] transition",
					style: {
						fontFamily: "Nunito, system-ui, sans-serif",
						fontWeight: 700
					},
					children: "Log a Drink"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-3 text-center",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/log",
						className: "text-[12px] text-[#6B6B6B] underline",
						style: { fontFamily: "Inter, system-ui, sans-serif" },
						children: "Choose a custom amount"
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 grid grid-cols-3 gap-3 w-full",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
							label: "Streak",
							value: `${streak}d`
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
							label: "Daily Goal",
							value: `${goal}ml`
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
							label: "Last Logged",
							value: formatRelative(lastLogged)
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HydrationHistorySection, {})
			]
		})
	] });
}
function HydrationHistorySection() {
	const historyQuery = useHydrationHistory();
	const deleteLog = useDeleteHydrationLog();
	const [open, setOpen] = (0, import_react.useState)(false);
	const [confirmId, setConfirmId] = (0, import_react.useState)(null);
	const logs = historyQuery.data ?? [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Collapsible, {
		open,
		onOpenChange: setOpen,
		className: "mt-6 w-full",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CollapsibleTrigger, {
			className: "flex w-full items-center justify-between rounded-xl border border-[#E8E8E8] bg-[#F9F9F9] px-4 py-3 active:bg-[#F0F0F0]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-[14px] font-bold text-[#1A1A1A]",
				style: { fontFamily: "Nunito, system-ui, sans-serif" },
				children: "Drink History"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [!historyQuery.isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-[12px] text-[#6B6B6B]",
					style: { fontFamily: "Inter, system-ui, sans-serif" },
					children: logs.length
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, {
					size: 18,
					className: `text-[#6B6B6B] transition-transform duration-200 ${open ? "rotate-180" : ""}`
				})]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CollapsibleContent, {
			className: "mt-2",
			children: historyQuery.isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "px-1 py-2 text-[13px] text-[#6B6B6B]",
				style: { fontFamily: "Inter, system-ui, sans-serif" },
				children: "Loading…"
			}) : logs.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "px-1 py-2 text-[13px] text-[#6B6B6B]",
				style: { fontFamily: "Inter, system-ui, sans-serif" },
				children: "No drinks logged yet."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "max-h-56 overflow-y-auto rounded-xl border border-[#E8E8E8] bg-white divide-y divide-[#E8E8E8]",
				children: logs.map((log) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HydrationHistoryRow, {
					log,
					confirming: confirmId === log.id,
					deleting: deleteLog.isPending && deleteLog.variables === log.id,
					onRequestDelete: () => setConfirmId(log.id),
					onCancelDelete: () => setConfirmId(null),
					onConfirmDelete: () => {
						deleteLog.mutate(log.id, { onSuccess: () => setConfirmId(null) });
					}
				}, log.id))
			})
		})]
	});
}
function HydrationHistoryRow({ log, confirming, deleting, onRequestDelete, onCancelDelete, onConfirmDelete }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center justify-between gap-3 px-4 py-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "min-w-0",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-[15px] font-bold text-[#1A1A1A]",
				style: { fontFamily: "Nunito, system-ui, sans-serif" },
				children: [log.amount_ml, " ml"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-[12px] text-[#6B6B6B]",
				style: { fontFamily: "Inter, system-ui, sans-serif" },
				children: formatRelative(new Date(log.logged_at).getTime())
			})]
		}), confirming ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex shrink-0 items-center gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: onCancelDelete,
				disabled: deleting,
				className: "text-[12px] text-[#6B6B6B] px-2 py-1",
				style: { fontFamily: "Inter, system-ui, sans-serif" },
				children: "Cancel"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: onConfirmDelete,
				disabled: deleting,
				className: "text-[12px] font-semibold text-[#C0392B] px-2 py-1",
				style: { fontFamily: "Inter, system-ui, sans-serif" },
				children: deleting ? "Deleting…" : "Delete"
			})]
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			"aria-label": `Delete ${log.amount_ml} ml log`,
			onClick: onRequestDelete,
			className: "shrink-0 h-8 w-8 flex items-center justify-center rounded-lg text-[#9A9A9A] active:bg-[#F9F9F9]",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 16 })
		})]
	});
}
function StatCard({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl bg-[#F9F9F9] border border-[#E8E8E8] px-3 py-3 text-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-[11px] text-[#6B6B6B]",
			style: { fontFamily: "Inter, system-ui, sans-serif" },
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-1 text-[16px] font-bold text-[#1A1A1A] truncate",
			style: { fontFamily: "Nunito, system-ui, sans-serif" },
			children: value
		})]
	});
}
//#endregion
export { HomePage as component };
