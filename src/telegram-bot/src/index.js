"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTelegramUpdate = handleTelegramUpdate;
const handlers_1 = require("./handlers");
// Initialize all the handlers
(0, handlers_1.initializeHandlers)();
async function handleTelegramUpdate(update, context) {
    const response = await (0, handlers_1.processTelegramUpdate)(update, context);
    if (response) {
        return new Response(JSON.stringify(response), {
            headers: { 'Content-Type': 'application/json' },
        });
    }
    return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
    });
}
__exportStar(require("./types"), exports);
//# sourceMappingURL=index.js.map