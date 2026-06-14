"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryAgent = exports.CertAgent = exports.BusinessAgent = exports.OfficeAgent = exports.DevAgent = exports.BrowserAgent = exports.CoreAgent = exports.AgentLevel = void 0;
var AgentLevel;
(function (AgentLevel) {
    AgentLevel["CORE"] = "CORE";
    AgentLevel["BROWSER"] = "BROWSER";
    AgentLevel["DEVELOPMENT"] = "DEVELOPMENT";
    AgentLevel["OFFICE"] = "OFFICE";
    AgentLevel["BUSINESS"] = "BUSINESS";
    AgentLevel["CERTIFICATION"] = "CERTIFICATION";
    AgentLevel["DELIVERY"] = "DELIVERY";
})(AgentLevel || (exports.AgentLevel = AgentLevel = {}));
var CoreAgent;
(function (CoreAgent) {
    CoreAgent["MISSION_ORCHESTRATOR"] = "MISSION_ORCHESTRATOR";
    CoreAgent["MISSION_PLANNER"] = "MISSION_PLANNER";
    CoreAgent["TASK_SCHEDULER"] = "TASK_SCHEDULER";
    CoreAgent["MEMORY_MANAGER"] = "MEMORY_MANAGER";
    CoreAgent["RESOURCE_MANAGER"] = "RESOURCE_MANAGER";
    CoreAgent["SECURITY_MANAGER"] = "SECURITY_MANAGER";
    CoreAgent["CERTIFICATION_MANAGER"] = "CERTIFICATION_MANAGER";
    CoreAgent["DELIVERY_MANAGER"] = "DELIVERY_MANAGER";
    CoreAgent["MONITORING_MANAGER"] = "MONITORING_MANAGER";
    CoreAgent["RECOVERY_MANAGER"] = "RECOVERY_MANAGER";
})(CoreAgent || (exports.CoreAgent = CoreAgent = {}));
var BrowserAgent;
(function (BrowserAgent) {
    BrowserAgent["LOGIN"] = "BROWSER_LOGIN";
    BrowserAgent["NAVIGATION"] = "BROWSER_NAVIGATION";
    BrowserAgent["SEARCH"] = "BROWSER_SEARCH";
    BrowserAgent["FORM"] = "BROWSER_FORM";
    BrowserAgent["UPLOAD"] = "BROWSER_UPLOAD";
    BrowserAgent["DOWNLOAD"] = "BROWSER_DOWNLOAD";
    BrowserAgent["SCREENSHOT"] = "BROWSER_SCREENSHOT";
    BrowserAgent["VISION"] = "BROWSER_VISION";
    BrowserAgent["SESSION"] = "BROWSER_SESSION";
    BrowserAgent["COOKIE"] = "BROWSER_COOKIE";
    BrowserAgent["POPUP"] = "BROWSER_POPUP";
    BrowserAgent["OCR"] = "BROWSER_OCR";
})(BrowserAgent || (exports.BrowserAgent = BrowserAgent = {}));
var DevAgent;
(function (DevAgent) {
    DevAgent["ARCHITECT"] = "DEV_ARCHITECT";
    DevAgent["FRONTEND"] = "DEV_FRONTEND";
    DevAgent["BACKEND"] = "DEV_BACKEND";
    DevAgent["DATABASE"] = "DEV_DATABASE";
    DevAgent["API"] = "DEV_API";
    DevAgent["DEVOPS"] = "DEV_DEVOPS";
    DevAgent["DOCKER"] = "DEV_DOCKER";
    DevAgent["KUBERNETES"] = "DEV_KUBERNETES";
    DevAgent["QA"] = "DEV_QA";
    DevAgent["TEST"] = "DEV_TEST";
    DevAgent["DEBUG"] = "DEV_DEBUG";
    DevAgent["DOCUMENTATION"] = "DEV_DOCUMENTATION";
})(DevAgent || (exports.DevAgent = DevAgent = {}));
var OfficeAgent;
(function (OfficeAgent) {
    OfficeAgent["PDF"] = "OFFICE_PDF";
    OfficeAgent["DOCX"] = "OFFICE_DOCX";
    OfficeAgent["EXCEL"] = "OFFICE_EXCEL";
    OfficeAgent["POWERPOINT"] = "OFFICE_POWERPOINT";
    OfficeAgent["OFFICE_OCR"] = "OFFICE_OCR";
    OfficeAgent["SIGNATURE"] = "OFFICE_SIGNATURE";
})(OfficeAgent || (exports.OfficeAgent = OfficeAgent = {}));
var BusinessAgent;
(function (BusinessAgent) {
    BusinessAgent["SEO"] = "BIZ_SEO";
    BusinessAgent["MARKETING"] = "BIZ_MARKETING";
    BusinessAgent["COPYWRITING"] = "BIZ_COPYWRITING";
    BusinessAgent["BRANDING"] = "BIZ_BRANDING";
    BusinessAgent["CRM"] = "BIZ_CRM";
    BusinessAgent["ANALYTICS"] = "BIZ_ANALYTICS";
    BusinessAgent["FINANCE"] = "BIZ_FINANCE";
    BusinessAgent["SALES"] = "BIZ_SALES";
})(BusinessAgent || (exports.BusinessAgent = BusinessAgent = {}));
var CertAgent;
(function (CertAgent) {
    CertAgent["ARCH_CERT"] = "CERT_ARCHITECTURE";
    CertAgent["SECURITY"] = "CERT_SECURITY";
    CertAgent["TESTS"] = "CERT_TESTS";
    CertAgent["REGRESSION"] = "CERT_REGRESSION";
    CertAgent["PERFORMANCE"] = "CERT_PERFORMANCE";
    CertAgent["DOCS"] = "CERT_DOCUMENTATION";
    CertAgent["INTEGRATION"] = "CERT_INTEGRATION";
    CertAgent["COMPLIANCE"] = "CERT_COMPLIANCE";
})(CertAgent || (exports.CertAgent = CertAgent = {}));
var DeliveryAgent;
(function (DeliveryAgent) {
    DeliveryAgent["GITHUB"] = "DELIVERY_GITHUB";
    DeliveryAgent["DELIVERY_DOCKER"] = "DELIVERY_DOCKER";
    DeliveryAgent["VPS"] = "DELIVERY_VPS";
    DeliveryAgent["CLOUD"] = "DELIVERY_CLOUD";
    DeliveryAgent["ZIP"] = "DELIVERY_ZIP";
    DeliveryAgent["PDF_REPORT"] = "DELIVERY_PDF_REPORT";
    DeliveryAgent["NOTIFICATION"] = "DELIVERY_NOTIFICATION";
    DeliveryAgent["DEPLOYMENT"] = "DELIVERY_DEPLOYMENT";
})(DeliveryAgent || (exports.DeliveryAgent = DeliveryAgent = {}));
//# sourceMappingURL=agents-64.interface.js.map