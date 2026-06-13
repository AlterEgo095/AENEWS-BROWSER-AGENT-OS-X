"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodingClusterModule = void 0;
const common_1 = require("@nestjs/common");
const base_agent_module_1 = require("../base/base-agent.module");
const code_generation_agent_service_1 = require("./code-generation/code-generation-agent.service");
const code_review_agent_service_1 = require("./code-review/code-review-agent.service");
const testing_agent_service_1 = require("./testing/testing-agent.service");
const debugging_agent_service_1 = require("./debugging/debugging-agent.service");
const documentation_agent_service_1 = require("./documentation/documentation-agent.service");
const dependency_agent_service_1 = require("./dependency/dependency-agent.service");
const version_control_agent_service_1 = require("./version-control/version-control-agent.service");
const build_agent_service_1 = require("./build/build-agent.service");
let CodingClusterModule = class CodingClusterModule {
};
exports.CodingClusterModule = CodingClusterModule;
exports.CodingClusterModule = CodingClusterModule = __decorate([
    (0, common_1.Module)({
        imports: [base_agent_module_1.BaseAgentModule],
        providers: [
            code_generation_agent_service_1.CodeGenerationAgentService,
            code_review_agent_service_1.CodeReviewAgentService,
            testing_agent_service_1.TestingAgentService,
            debugging_agent_service_1.DebuggingAgentService,
            documentation_agent_service_1.DocumentationAgentService,
            dependency_agent_service_1.DependencyAgentService,
            version_control_agent_service_1.VersionControlAgentService,
            build_agent_service_1.BuildAgentService,
        ],
        exports: [
            code_generation_agent_service_1.CodeGenerationAgentService,
            code_review_agent_service_1.CodeReviewAgentService,
            testing_agent_service_1.TestingAgentService,
            debugging_agent_service_1.DebuggingAgentService,
            documentation_agent_service_1.DocumentationAgentService,
            dependency_agent_service_1.DependencyAgentService,
            version_control_agent_service_1.VersionControlAgentService,
            build_agent_service_1.BuildAgentService,
        ],
    })
], CodingClusterModule);
//# sourceMappingURL=coding-cluster.module.js.map