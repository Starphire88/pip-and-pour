import { r as __toESM } from "../_runtime.mjs";
import { a as require_jsx_runtime, o as require_react } from "../_libs/@radix-ui/react-collapsible+[...].mjs";
import { t as createClient } from "../_libs/supabase__supabase-js.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/useAuth-72BPIaO7.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var supabase = createClient("https://wytzftxroyrxtvalywlh.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5dHpmdHhyb3lyeHR2YWx5d2xoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExOTM4MTEsImV4cCI6MjA5Njc2OTgxMX0.uz91eQliXxCQJ5XwN11UFd00yrLJL9GQC8e6fd8RaIw");
var AuthContext = (0, import_react.createContext)(null);
function AuthProvider({ children }) {
	const [session, setSession] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(true);
	(0, import_react.useEffect)(() => {
		let mounted = true;
		supabase.auth.getSession().then(({ data }) => {
			if (mounted) {
				setSession(data.session);
				setLoading(false);
			}
		});
		const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
			setSession(nextSession);
			setLoading(false);
		});
		return () => {
			mounted = false;
			subscription.unsubscribe();
		};
	}, []);
	const signOut = (0, import_react.useCallback)(async () => {
		await supabase.auth.signOut();
	}, []);
	const value = (0, import_react.useMemo)(() => ({
		user: session?.user ?? null,
		session,
		loading,
		signOut
	}), [
		session,
		loading,
		signOut
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthContext.Provider, {
		value,
		children
	});
}
function useAuth() {
	const context = (0, import_react.useContext)(AuthContext);
	if (!context) throw new Error("useAuth must be used within an AuthProvider");
	return context;
}
//#endregion
export { supabase as n, useAuth as r, AuthProvider as t };
