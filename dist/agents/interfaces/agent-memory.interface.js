"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryEncoding = exports.MemoryTier = void 0;
var MemoryTier;
(function (MemoryTier) {
    MemoryTier["WORKING"] = "working";
    MemoryTier["SESSION"] = "session";
    MemoryTier["LONG_TERM"] = "long_term";
    MemoryTier["KNOWLEDGE_GRAPH"] = "knowledge_graph";
    MemoryTier["VECTOR"] = "vector";
})(MemoryTier || (exports.MemoryTier = MemoryTier = {}));
var MemoryEncoding;
(function (MemoryEncoding) {
    MemoryEncoding["JSON"] = "json";
    MemoryEncoding["TEXT"] = "text";
    MemoryEncoding["BINARY"] = "binary";
    MemoryEncoding["EMBEDDING"] = "embedding";
    MemoryEncoding["STRUCTURED"] = "structured";
})(MemoryEncoding || (exports.MemoryEncoding = MemoryEncoding = {}));
//# sourceMappingURL=agent-memory.interface.js.map