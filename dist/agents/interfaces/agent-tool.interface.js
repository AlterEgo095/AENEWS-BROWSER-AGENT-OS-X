"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolCategory = exports.ToolStatus = void 0;
var ToolStatus;
(function (ToolStatus) {
    ToolStatus["AVAILABLE"] = "available";
    ToolStatus["BUSY"] = "busy";
    ToolStatus["ERROR"] = "error";
    ToolStatus["DISABLED"] = "disabled";
    ToolStatus["MAINTENANCE"] = "maintenance";
})(ToolStatus || (exports.ToolStatus = ToolStatus = {}));
var ToolCategory;
(function (ToolCategory) {
    ToolCategory["BROWSER"] = "browser";
    ToolCategory["FILE_SYSTEM"] = "file_system";
    ToolCategory["NETWORK"] = "network";
    ToolCategory["DATABASE"] = "database";
    ToolCategory["AI"] = "ai";
    ToolCategory["COMMUNICATION"] = "communication";
    ToolCategory["COMPUTATION"] = "computation";
    ToolCategory["DATA_PROCESSING"] = "data_processing";
    ToolCategory["SECURITY"] = "security";
    ToolCategory["MONITORING"] = "monitoring";
    ToolCategory["UTILITY"] = "utility";
})(ToolCategory || (exports.ToolCategory = ToolCategory = {}));
//# sourceMappingURL=agent-tool.interface.js.map