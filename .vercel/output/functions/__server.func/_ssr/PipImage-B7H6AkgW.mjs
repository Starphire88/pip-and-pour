import { a as require_jsx_runtime } from "../_libs/@radix-ui/react-collapsible+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/PipImage-B7H6AkgW.js
var import_jsx_runtime = require_jsx_runtime();
var map = {
	neutral: "/assets/pip-neutral-BcfbLMpd.png",
	happy: "/assets/pip-happy-BwkJOob4.png",
	sad: "/assets/pip-sad-BcTw4VVt.png",
	collapsed: "/assets/pip-collapsed-Qw2w-ilM.png"
};
function PipImage({ mood, size = 200, className = "" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
		src: map[mood],
		alt: `Pip the panda — ${mood}`,
		width: size,
		height: size,
		style: {
			width: size,
			height: size
		},
		className: `block object-contain select-none ${className}`,
		draggable: false
	});
}
//#endregion
export { PipImage as t };
