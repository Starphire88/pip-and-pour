import { r as __toESM } from "../_runtime.mjs";
import { a as require_jsx_runtime, o as require_react } from "../_libs/@radix-ui/react-collapsible+[...].mjs";
import { n as supabase, r as useAuth } from "./useAuth-72BPIaO7.mjs";
import { _ as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as AuthLink, r as AuthShell, t as AuthField } from "./AuthShell-FIGjdTQ4.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/signup-CNAOe51F.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function SignupPage() {
	const navigate = useNavigate();
	const { user, loading } = useAuth();
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [confirmPassword, setConfirmPassword] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)(null);
	const [success, setSuccess] = (0, import_react.useState)(null);
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
		setSuccess(null);
		if (password !== confirmPassword) {
			setError("Passwords do not match.");
			return;
		}
		if (password.length < 6) {
			setError("Password must be at least 6 characters.");
			return;
		}
		setSubmitting(true);
		const { data, error: signUpError } = await supabase.auth.signUp({
			email,
			password
		});
		setSubmitting(false);
		if (signUpError) {
			setError(signUpError.message);
			return;
		}
		if (data.session) {
			navigate({
				to: "/",
				replace: true
			});
			return;
		}
		setSuccess("Check your email to confirm your account, then log in.");
	};
	if (loading || user) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthShell, {
		title: "Join Pip",
		subtitle: "Create an account and start your hydration journey.",
		footer: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: ["Already have an account? ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthLink, {
			to: "/auth/login",
			children: "Log in"
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
					placeholder: "At least 6 characters",
					autoComplete: "new-password"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthField, {
					label: "Confirm password",
					id: "confirm-password",
					type: "password",
					value: confirmPassword,
					onChange: setConfirmPassword,
					placeholder: "Repeat your password",
					autoComplete: "new-password"
				}),
				error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[13px] text-[#C44]",
					style: { fontFamily: "Inter, system-ui, sans-serif" },
					children: error
				}),
				success && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[13px] text-[#7BAE7F]",
					style: { fontFamily: "Inter, system-ui, sans-serif" },
					children: success
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "submit",
					disabled: submitting || !email || !password || !confirmPassword,
					className: "mt-2 w-full h-12 rounded-xl bg-[#A8D5E2] text-[#1A1A1A] active:scale-[0.99] transition disabled:opacity-50",
					style: {
						fontFamily: "Nunito, system-ui, sans-serif",
						fontWeight: 700
					},
					children: submitting ? "Creating account…" : "Sign up"
				})
			]
		})
	});
}
//#endregion
export { SignupPage as component };
