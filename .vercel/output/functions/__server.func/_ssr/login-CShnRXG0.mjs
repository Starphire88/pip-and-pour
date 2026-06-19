import { r as __toESM } from "../_runtime.mjs";
import { a as require_jsx_runtime, o as require_react } from "../_libs/@radix-ui/react-collapsible+[...].mjs";
import { n as supabase, r as useAuth } from "./useAuth-72BPIaO7.mjs";
import { _ as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as AuthLink, r as AuthShell, t as AuthField } from "./AuthShell-FIGjdTQ4.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-CShnRXG0.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function LoginPage() {
	const navigate = useNavigate();
	const { user, loading } = useAuth();
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)(null);
	const [submitting, setSubmitting] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (!loading && user) navigate({
			to: "/",
			replace: true
		});
	}, [
		user,
		loading,
		navigate
	]);
	const handleSubmit = async (e) => {
		e.preventDefault();
		setError(null);
		setSubmitting(true);
		const { error: signInError } = await supabase.auth.signInWithPassword({
			email,
			password
		});
		setSubmitting(false);
		if (signInError) {
			setError(signInError.message);
			return;
		}
		navigate({
			to: "/",
			replace: true
		});
	};
	if (loading || user) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthShell, {
		title: "Welcome back",
		subtitle: "Log in to keep Pip hydrated and your streak alive.",
		footer: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: ["No account? ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthLink, {
			to: "/auth/signup",
			children: "Sign up"
		})] }),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit: handleSubmit,
			className: "space-y-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthField, {
					label: "Email",
					id: "email",
					type: "email",
					value: email,
					onChange: setEmail,
					placeholder: "you@example.com",
					autoComplete: "email"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthField, {
					label: "Password",
					id: "password",
					type: "password",
					value: password,
					onChange: setPassword,
					placeholder: "Your password",
					autoComplete: "current-password"
				}),
				error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[13px] text-[#C44]",
					style: { fontFamily: "Inter, system-ui, sans-serif" },
					children: error
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "submit",
					disabled: submitting || !email || !password,
					className: "mt-2 w-full h-12 rounded-xl bg-[#A8D5E2] text-[#1A1A1A] active:scale-[0.99] transition disabled:opacity-50",
					style: {
						fontFamily: "Nunito, system-ui, sans-serif",
						fontWeight: 700
					},
					children: submitting ? "Logging in…" : "Log in"
				})
			]
		})
	});
}
//#endregion
export { LoginPage as component };
