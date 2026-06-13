"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliverableType = exports.MissionQuality = void 0;
var MissionQuality;
(function (MissionQuality) {
    MissionQuality["DRAFT"] = "draft";
    MissionQuality["STANDARD"] = "standard";
    MissionQuality["PROFESSIONAL"] = "professional";
    MissionQuality["ENTERPRISE"] = "enterprise";
    MissionQuality["MISSION_CRITICAL"] = "mission_critical";
})(MissionQuality || (exports.MissionQuality = MissionQuality = {}));
var DeliverableType;
(function (DeliverableType) {
    DeliverableType["SOURCE_CODE"] = "source_code";
    DeliverableType["DOCKER_IMAGE"] = "docker_image";
    DeliverableType["PDF_REPORT"] = "pdf_report";
    DeliverableType["TEST_SUITE"] = "test_suite";
    DeliverableType["DOCUMENTATION"] = "documentation";
    DeliverableType["DEPLOYMENT"] = "deployment";
    DeliverableType["README"] = "readme";
    DeliverableType["ARCHIVE_ZIP"] = "archive_zip";
    DeliverableType["DATABASE_SCRIPT"] = "database_script";
    DeliverableType["API_SPEC"] = "api_spec";
    DeliverableType["CONFIGURATION"] = "configuration";
    DeliverableType["PRESENTATION"] = "presentation";
    DeliverableType["SPREADSHEET"] = "spreadsheet";
    DeliverableType["VIDEO"] = "video";
    DeliverableType["CUSTOM"] = "custom";
})(DeliverableType || (exports.DeliverableType = DeliverableType = {}));
//# sourceMappingURL=mission-contract.interface.js.map