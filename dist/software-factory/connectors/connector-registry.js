"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ConnectorRegistry_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectorRegistry = void 0;
const common_1 = require("@nestjs/common");
const interfaces_1 = require("../interfaces");
const development_connector_1 = require("./development-connector");
const browser_connector_1 = require("./browser-connector");
const certification_connector_1 = require("./certification-connector");
const delivery_connector_1 = require("./delivery-connector");
const office_connector_1 = require("./office-connector");
const business_connector_1 = require("./business-connector");
let ConnectorRegistry = ConnectorRegistry_1 = class ConnectorRegistry {
    constructor(devConnector, browserConnector, certConnector, deliveryConnector, officeConnector, businessConnector) {
        this.devConnector = devConnector;
        this.browserConnector = browserConnector;
        this.certConnector = certConnector;
        this.deliveryConnector = deliveryConnector;
        this.officeConnector = officeConnector;
        this.businessConnector = businessConnector;
        this.logger = new common_1.Logger(ConnectorRegistry_1.name);
        this.packConnectors = new Map();
        this.idConnectors = new Map();
        this.registerConnector(this.devConnector);
        this.registerConnector(this.browserConnector);
        this.registerConnector(this.certConnector);
        this.registerConnector(this.deliveryConnector);
        this.registerConnector(this.officeConnector);
        this.registerConnector(this.businessConnector);
        this.logger.log(`Connector Registry initialized with ${this.packConnectors.size} connectors`);
    }
    getConnector(capabilityId) {
        const direct = this.idConnectors.get(capabilityId);
        if (direct)
            return direct;
        for (const connector of this.packConnectors.values()) {
            if (connector.supports(capabilityId)) {
                return connector;
            }
        }
        this.logger.warn(`No connector found for capability: ${capabilityId}`);
        return undefined;
    }
    getConnectorByPack(pack) {
        return this.packConnectors.get(pack);
    }
    hasConnector(capabilityId) {
        return this.getConnector(capabilityId) !== undefined;
    }
    getAllConnectors() {
        return Array.from(this.packConnectors.values());
    }
    getStatistics() {
        return {
            totalConnectors: this.packConnectors.size,
            packs: Array.from(this.packConnectors.keys()),
            capabilitiesCovered: this.idConnectors.size,
        };
    }
    registerConnector(connector) {
        this.packConnectors.set(connector.supportedPack, connector);
        const allCapIds = this.getCapabilityIdsForPack(connector.supportedPack);
        for (const capId of allCapIds) {
            if (connector.supports(capId)) {
                this.idConnectors.set(capId, connector);
            }
        }
    }
    getCapabilityIdsForPack(pack) {
        const { BrowserCapability, DevCapability, OfficeCapability, BusinessCapability, CertCapability, DeliveryCapability, } = require('../interfaces');
        const packMap = {
            [interfaces_1.CapabilityPack.BROWSER]: BrowserCapability,
            [interfaces_1.CapabilityPack.DEVELOPMENT]: DevCapability,
            [interfaces_1.CapabilityPack.OFFICE]: OfficeCapability,
            [interfaces_1.CapabilityPack.BUSINESS]: BusinessCapability,
            [interfaces_1.CapabilityPack.CERTIFICATION]: CertCapability,
            [interfaces_1.CapabilityPack.DELIVERY]: DeliveryCapability,
        };
        const enumObj = packMap[pack];
        if (!enumObj)
            return [];
        return Object.values(enumObj);
    }
};
exports.ConnectorRegistry = ConnectorRegistry;
exports.ConnectorRegistry = ConnectorRegistry = ConnectorRegistry_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [development_connector_1.DevelopmentConnector,
        browser_connector_1.BrowserConnector,
        certification_connector_1.CertificationConnector,
        delivery_connector_1.DeliveryConnector,
        office_connector_1.OfficeConnector,
        business_connector_1.BusinessConnector])
], ConnectorRegistry);
//# sourceMappingURL=connector-registry.js.map