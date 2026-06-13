export declare enum CapabilityPack {
    BROWSER = "BROWSER",
    DEVELOPMENT = "DEVELOPMENT",
    OFFICE = "OFFICE",
    BUSINESS = "BUSINESS",
    CERTIFICATION = "CERTIFICATION",
    DELIVERY = "DELIVERY"
}
export declare enum BrowserCapability {
    LOGIN = "browser.login",
    NAVIGATION = "browser.navigation",
    SEARCH = "browser.search",
    FORM = "browser.form",
    UPLOAD = "browser.upload",
    DOWNLOAD = "browser.download",
    SCREENSHOT = "browser.screenshot",
    VISION = "browser.vision",
    SESSION = "browser.session",
    COOKIE = "browser.cookie",
    POPUP = "browser.popup",
    OCR = "browser.ocr"
}
export declare enum DevCapability {
    ARCHITECTURE = "dev.architecture",
    FRONTEND = "dev.frontend",
    BACKEND = "dev.backend",
    DATABASE = "dev.database",
    API = "dev.api",
    DEVOPS = "dev.devops",
    DOCKER = "dev.docker",
    KUBERNETES = "dev.kubernetes",
    QA = "dev.qa",
    TEST = "dev.test",
    DEBUG = "dev.debug",
    DOCUMENTATION = "dev.documentation"
}
export declare enum OfficeCapability {
    PDF = "office.pdf",
    DOCX = "office.docx",
    EXCEL = "office.excel",
    POWERPOINT = "office.powerpoint",
    OCR = "office.ocr",
    SIGNATURE = "office.signature",
    EMAIL = "office.email",
    CALENDAR = "office.calendar"
}
export declare enum BusinessCapability {
    SEO = "business.seo",
    MARKETING = "business.marketing",
    COPYWRITING = "business.copywriting",
    BRANDING = "business.branding",
    CRM = "business.crm",
    ANALYTICS = "business.analytics",
    FINANCE = "business.finance",
    SALES = "business.sales",
    LEGAL = "business.legal",
    PARTNERSHIP = "business.partnership"
}
export declare enum CertCapability {
    ARCHITECTURE_REVIEW = "cert.architecture_review",
    SECURITY_AUDIT = "cert.security_audit",
    TEST_COVERAGE = "cert.test_coverage",
    REGRESSION = "cert.regression",
    PERFORMANCE = "cert.performance",
    DOC_REVIEW = "cert.doc_review",
    INTEGRATION = "cert.integration",
    COMPLIANCE = "cert.compliance",
    ACCESSIBILITY = "cert.accessibility",
    DATA_PRIVACY = "cert.data_privacy"
}
export declare enum DeliveryCapability {
    GITHUB = "delivery.github",
    DOCKER_REGISTRY = "delivery.docker_registry",
    VPS = "delivery.vps",
    CLOUD = "delivery.cloud",
    ZIP = "delivery.zip",
    PDF_REPORT = "delivery.pdf_report",
    NOTIFICATION = "delivery.notification",
    DEPLOYMENT = "delivery.deployment",
    CDN = "delivery.cdn",
    BACKUP = "delivery.backup",
    MONITORING_SETUP = "delivery.monitoring_setup",
    LOAD_BALANCER = "delivery.load_balancer"
}
export type CapabilityId = BrowserCapability | DevCapability | OfficeCapability | BusinessCapability | CertCapability | DeliveryCapability;
export interface CapabilityDefinition {
    id: CapabilityId;
    name: string;
    description: string;
    pack: CapabilityPack;
    tools: string[];
    permissions: string[];
    cost: CapabilityCost;
    latency: CapabilityLatency;
    requirements: string[];
    keywords: string[];
}
export interface CapabilityCost {
    estimatedUsdPerExecution: number;
    computeMinutesPerExecution: number;
}
export interface CapabilityLatency {
    estimatedMs: number;
    minMs: number;
    maxMs: number;
}
export interface ResolvedCapability {
    capabilityId: CapabilityId;
    definition: CapabilityDefinition;
    priority: number;
    reason: string;
    dependencies: CapabilityId[];
}
export interface CapabilityResolution {
    missionId: string;
    requiredCapabilities: ResolvedCapability[];
    packsNeeded: CapabilityPack[];
    estimatedTotalCost: number;
    estimatedTotalDurationMs: number;
    confidence: number;
}
export interface CapabilityExecutionResult {
    capabilityId: CapabilityId;
    success: boolean;
    output: any;
    artifacts: string[];
    durationMs: number;
    costUsd: number;
    error?: string;
    metadata: Record<string, any>;
}
