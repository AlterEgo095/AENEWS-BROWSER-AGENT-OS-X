"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_TEAM = exports.TEAM_ROLES = exports.AgentRole = exports.TeamType = void 0;
var TeamType;
(function (TeamType) {
    TeamType["PLANNING"] = "PLANNING";
    TeamType["EXECUTION"] = "EXECUTION";
    TeamType["CERTIFICATION"] = "CERTIFICATION";
})(TeamType || (exports.TeamType = TeamType = {}));
var AgentRole;
(function (AgentRole) {
    AgentRole["RESEARCHER"] = "RESEARCHER";
    AgentRole["ARCHITECT"] = "ARCHITECT";
    AgentRole["BUSINESS_ANALYST"] = "BUSINESS_ANALYST";
    AgentRole["MARKETING_STRATEGIST"] = "MARKETING_STRATEGIST";
    AgentRole["BROWSER_OPERATOR"] = "BROWSER_OPERATOR";
    AgentRole["CODER"] = "CODER";
    AgentRole["OFFICE_OPERATOR"] = "OFFICE_OPERATOR";
    AgentRole["DEPLOYER"] = "DEPLOYER";
    AgentRole["QA_TESTER"] = "QA_TESTER";
    AgentRole["SECURITY_AUDITOR"] = "SECURITY_AUDITOR";
    AgentRole["PERFORMANCE_TESTER"] = "PERFORMANCE_TESTER";
    AgentRole["DOCUMENTATION_WRITER"] = "DOCUMENTATION_WRITER";
})(AgentRole || (exports.AgentRole = AgentRole = {}));
exports.TEAM_ROLES = {
    [TeamType.PLANNING]: [
        AgentRole.RESEARCHER,
        AgentRole.ARCHITECT,
        AgentRole.BUSINESS_ANALYST,
        AgentRole.MARKETING_STRATEGIST,
    ],
    [TeamType.EXECUTION]: [
        AgentRole.BROWSER_OPERATOR,
        AgentRole.CODER,
        AgentRole.OFFICE_OPERATOR,
        AgentRole.DEPLOYER,
    ],
    [TeamType.CERTIFICATION]: [
        AgentRole.QA_TESTER,
        AgentRole.SECURITY_AUDITOR,
        AgentRole.PERFORMANCE_TESTER,
        AgentRole.DOCUMENTATION_WRITER,
    ],
};
exports.ROLE_TEAM = {
    [AgentRole.RESEARCHER]: TeamType.PLANNING,
    [AgentRole.ARCHITECT]: TeamType.PLANNING,
    [AgentRole.BUSINESS_ANALYST]: TeamType.PLANNING,
    [AgentRole.MARKETING_STRATEGIST]: TeamType.PLANNING,
    [AgentRole.BROWSER_OPERATOR]: TeamType.EXECUTION,
    [AgentRole.CODER]: TeamType.EXECUTION,
    [AgentRole.OFFICE_OPERATOR]: TeamType.EXECUTION,
    [AgentRole.DEPLOYER]: TeamType.EXECUTION,
    [AgentRole.QA_TESTER]: TeamType.CERTIFICATION,
    [AgentRole.SECURITY_AUDITOR]: TeamType.CERTIFICATION,
    [AgentRole.PERFORMANCE_TESTER]: TeamType.CERTIFICATION,
    [AgentRole.DOCUMENTATION_WRITER]: TeamType.CERTIFICATION,
};
//# sourceMappingURL=team.interface.js.map