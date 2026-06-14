"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EqiMilestone = exports.CertificationDomain = exports.CertificationLevel = void 0;
var CertificationLevel;
(function (CertificationLevel) {
    CertificationLevel["PLATINUM"] = "PLATINUM";
    CertificationLevel["GOLD"] = "GOLD";
    CertificationLevel["SILVER"] = "SILVER";
    CertificationLevel["REJECTED"] = "REJECTED";
})(CertificationLevel || (exports.CertificationLevel = CertificationLevel = {}));
var CertificationDomain;
(function (CertificationDomain) {
    CertificationDomain["ARCHITECTURE"] = "architecture";
    CertificationDomain["TESTS"] = "tests";
    CertificationDomain["ORCHESTRATION"] = "orchestration";
    CertificationDomain["AGENTS"] = "agents";
    CertificationDomain["BROWSER"] = "browser";
    CertificationDomain["MEMORY"] = "memory";
    CertificationDomain["SECURITY"] = "security";
    CertificationDomain["PERFORMANCE"] = "performance";
    CertificationDomain["DOCUMENTATION"] = "documentation";
    CertificationDomain["OBSERVABILITY"] = "observability";
})(CertificationDomain || (exports.CertificationDomain = CertificationDomain = {}));
var EqiMilestone;
(function (EqiMilestone) {
    EqiMilestone[EqiMilestone["ARCHITECTURE_STABLE"] = 75] = "ARCHITECTURE_STABLE";
    EqiMilestone[EqiMilestone["MVP_ENTERPRISE"] = 85] = "MVP_ENTERPRISE";
    EqiMilestone[EqiMilestone["SILVER"] = 90] = "SILVER";
    EqiMilestone[EqiMilestone["GOLD"] = 95] = "GOLD";
    EqiMilestone[EqiMilestone["PLATINUM"] = 98] = "PLATINUM";
    EqiMilestone[EqiMilestone["AUTONOMOUS_ENTERPRISE"] = 99.5] = "AUTONOMOUS_ENTERPRISE";
})(EqiMilestone || (exports.EqiMilestone = EqiMilestone = {}));
//# sourceMappingURL=types.js.map