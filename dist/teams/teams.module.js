"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamsModule = void 0;
const common_1 = require("@nestjs/common");
const browser_team_module_1 = require("./browser-team/browser-team.module");
const development_team_module_1 = require("./development-team/development-team.module");
const business_team_module_1 = require("./business-team/business-team.module");
const memory_team_module_1 = require("./memory-team/memory-team.module");
const certification_team_module_1 = require("./certification-team/certification-team.module");
const delivery_team_module_1 = require("./delivery-team/delivery-team.module");
let TeamsModule = class TeamsModule {
};
exports.TeamsModule = TeamsModule;
exports.TeamsModule = TeamsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            browser_team_module_1.BrowserTeamModule,
            development_team_module_1.DevelopmentTeamModule,
            business_team_module_1.BusinessTeamModule,
            memory_team_module_1.MemoryTeamModule,
            certification_team_module_1.CertificationTeamModule,
            delivery_team_module_1.DeliveryTeamModule,
        ],
        exports: [
            browser_team_module_1.BrowserTeamModule,
            development_team_module_1.DevelopmentTeamModule,
            business_team_module_1.BusinessTeamModule,
            memory_team_module_1.MemoryTeamModule,
            certification_team_module_1.CertificationTeamModule,
            delivery_team_module_1.DeliveryTeamModule,
        ],
    })
], TeamsModule);
//# sourceMappingURL=teams.module.js.map