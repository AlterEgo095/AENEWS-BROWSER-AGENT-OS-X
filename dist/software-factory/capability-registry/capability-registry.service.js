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
var CapabilityRegistryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapabilityRegistryService = void 0;
const common_1 = require("@nestjs/common");
const interfaces_1 = require("../interfaces");
let CapabilityRegistryService = CapabilityRegistryService_1 = class CapabilityRegistryService {
    constructor() {
        this.logger = new common_1.Logger(CapabilityRegistryService_1.name);
        this.capabilities = new Map();
        this.packIndex = new Map();
        this.initializeBrowserPack();
        this.initializeDevelopmentPack();
        this.initializeOfficePack();
        this.initializeBusinessPack();
        this.initializeCertificationPack();
        this.initializeDeliveryPack();
        this.logger.log(`Capability Registry initialized: ${this.capabilities.size} capabilities across ${this.packIndex.size} packs`);
    }
    getCapability(id) {
        return this.capabilities.get(id);
    }
    getPack(pack) {
        const ids = this.packIndex.get(pack) || [];
        return ids.map((id) => this.capabilities.get(id)).filter(Boolean);
    }
    getAllCapabilities() {
        return Array.from(this.capabilities.values());
    }
    getPackOverview() {
        const overview = {};
        for (const [pack, ids] of this.packIndex) {
            overview[pack] = {
                name: this.getPackName(pack),
                count: ids.length,
                capabilities: ids,
            };
        }
        return overview;
    }
    searchByKeyword(keyword) {
        const lower = keyword.toLowerCase();
        return Array.from(this.capabilities.values()).filter((cap) => cap.keywords.some((k) => k.includes(lower)) ||
            cap.name.toLowerCase().includes(lower) ||
            cap.description.toLowerCase().includes(lower));
    }
    findCapabilitiesForMission(missionText) {
        const lower = missionText.toLowerCase();
        const matches = [];
        for (const cap of this.capabilities.values()) {
            const keywordMatch = cap.keywords.some((k) => lower.includes(k));
            if (keywordMatch) {
                matches.push(cap);
            }
        }
        return matches;
    }
    getTotalCount() {
        return this.capabilities.size;
    }
    getPackName(pack) {
        const names = {
            [interfaces_1.CapabilityPack.BROWSER]: 'Browser Capability Pack',
            [interfaces_1.CapabilityPack.DEVELOPMENT]: 'Development Capability Pack',
            [interfaces_1.CapabilityPack.OFFICE]: 'Office Capability Pack',
            [interfaces_1.CapabilityPack.BUSINESS]: 'Business Capability Pack',
            [interfaces_1.CapabilityPack.CERTIFICATION]: 'Certification Capability Pack',
            [interfaces_1.CapabilityPack.DELIVERY]: 'Delivery Capability Pack',
        };
        return names[pack];
    }
    register(definition) {
        this.capabilities.set(definition.id, definition);
        const packIds = this.packIndex.get(definition.pack) || [];
        packIds.push(definition.id);
        this.packIndex.set(definition.pack, packIds);
    }
    initializeBrowserPack() {
        const pack = interfaces_1.CapabilityPack.BROWSER;
        const cost = {
            estimatedUsdPerExecution: 0.02,
            computeMinutesPerExecution: 0.5,
        };
        const latency = { estimatedMs: 3000, minMs: 500, maxMs: 15000 };
        const capabilities = [
            {
                id: interfaces_1.BrowserCapability.LOGIN,
                name: 'Login',
                description: 'Authenticate to web applications via credentials, SSO, or tokens',
                tools: ['playwright', 'puppeteer'],
                permissions: ['network', 'credentials'],
                cost,
                latency,
                requirements: ['browser_runtime'],
                keywords: ['login', 'auth', 'authenticate', 'sign in', 'connexion', 'connexion'],
            },
            {
                id: interfaces_1.BrowserCapability.NAVIGATION,
                name: 'Navigation',
                description: 'Navigate web pages, follow links, handle redirects and SPA routing',
                tools: ['playwright'],
                permissions: ['network'],
                cost,
                latency,
                requirements: ['browser_runtime'],
                keywords: ['navigate', 'browse', 'surf', 'page', 'url', 'naviguer', 'parcourir'],
            },
            {
                id: interfaces_1.BrowserCapability.SEARCH,
                name: 'Search',
                description: 'Perform web searches, extract results from search engines',
                tools: ['playwright', 'web_search'],
                permissions: ['network'],
                cost,
                latency,
                requirements: ['browser_runtime'],
                keywords: ['search', 'find', 'google', 'bing', 'rechercher', 'chercher', 'trouver'],
            },
            {
                id: interfaces_1.BrowserCapability.FORM,
                name: 'Form',
                description: 'Fill and submit web forms, handle dropdowns, checkboxes, file inputs',
                tools: ['playwright'],
                permissions: ['network', 'form_data'],
                cost,
                latency,
                requirements: ['browser_runtime'],
                keywords: ['form', 'fill', 'submit', 'input', 'formulaire', 'remplir', 'soumettre'],
            },
            {
                id: interfaces_1.BrowserCapability.UPLOAD,
                name: 'Upload',
                description: 'Upload files to web applications, handle progress and drag-drop',
                tools: ['playwright'],
                permissions: ['network', 'filesystem_read'],
                cost,
                latency,
                requirements: ['browser_runtime'],
                keywords: ['upload', 'file upload', 'téléverser', 'envoyer'],
            },
            {
                id: interfaces_1.BrowserCapability.DOWNLOAD,
                name: 'Download',
                description: 'Download files from web pages, handle download dialogs',
                tools: ['playwright'],
                permissions: ['network', 'filesystem_write'],
                cost,
                latency,
                requirements: ['browser_runtime'],
                keywords: ['download', 'save', 'télécharger', 'sauvegarder'],
            },
            {
                id: interfaces_1.BrowserCapability.SCREENSHOT,
                name: 'Screenshot',
                description: 'Capture page screenshots, full-page or element-specific',
                tools: ['playwright'],
                permissions: ['filesystem_write'],
                cost: { ...cost, estimatedUsdPerExecution: 0.01 },
                latency: { ...latency, estimatedMs: 1000 },
                requirements: ['browser_runtime'],
                keywords: ['screenshot', 'capture', 'snapshot', 'image', "capture d'écran"],
            },
            {
                id: interfaces_1.BrowserCapability.VISION,
                name: 'Vision',
                description: 'Analyze page visuals, detect UI elements, read charts and images',
                tools: ['playwright', 'vlm'],
                permissions: ['network'],
                cost: { ...cost, estimatedUsdPerExecution: 0.05 },
                latency: { ...latency, estimatedMs: 5000 },
                requirements: ['browser_runtime', 'vlm_model'],
                keywords: ['vision', 'visual', 'see', 'analyze page', 'visuel', 'voir'],
            },
            {
                id: interfaces_1.BrowserCapability.SESSION,
                name: 'Session',
                description: 'Manage browser sessions, persist state across page loads',
                tools: ['playwright'],
                permissions: ['network', 'session_storage'],
                cost,
                latency,
                requirements: ['browser_runtime'],
                keywords: ['session', 'state', 'persist', 'session', 'état'],
            },
            {
                id: interfaces_1.BrowserCapability.COOKIE,
                name: 'Cookie',
                description: 'Read, write, and manage browser cookies for authentication state',
                tools: ['playwright'],
                permissions: ['network', 'cookie_storage'],
                cost,
                latency,
                requirements: ['browser_runtime'],
                keywords: ['cookie', 'session cookie', 'auth cookie', 'cookie'],
            },
            {
                id: interfaces_1.BrowserCapability.POPUP,
                name: 'Popup',
                description: 'Handle popups, modals, dialogs, and new browser windows',
                tools: ['playwright'],
                permissions: ['network'],
                cost,
                latency,
                requirements: ['browser_runtime'],
                keywords: ['popup', 'modal', 'dialog', 'alert', 'fenêtre', 'boîte de dialogue'],
            },
            {
                id: interfaces_1.BrowserCapability.OCR,
                name: 'OCR',
                description: 'Extract text from images, screenshots, and scanned documents',
                tools: ['tesseract', 'vlm'],
                permissions: ['filesystem_read'],
                cost: { ...cost, estimatedUsdPerExecution: 0.03 },
                latency: { ...latency, estimatedMs: 8000 },
                requirements: ['ocr_engine'],
                keywords: ['ocr', 'text extraction', 'image to text', 'reconnaissance', 'extraction texte'],
            },
        ];
        for (const cap of capabilities) {
            this.register({ ...cap, pack });
        }
    }
    initializeDevelopmentPack() {
        const pack = interfaces_1.CapabilityPack.DEVELOPMENT;
        const cost = { estimatedUsdPerExecution: 0.1, computeMinutesPerExecution: 5 };
        const latency = { estimatedMs: 30000, minMs: 5000, maxMs: 300000 };
        const capabilities = [
            {
                id: interfaces_1.DevCapability.ARCHITECTURE,
                name: 'Architecture',
                description: 'Design system architecture, select tech stack, define component boundaries',
                tools: ['llm', 'diagram_generator'],
                permissions: ['codebase_read'],
                cost: { ...cost, estimatedUsdPerExecution: 0.15 },
                latency,
                requirements: ['llm_model'],
                keywords: [
                    'architecture',
                    'design',
                    'system design',
                    'tech stack',
                    'conception',
                    'architecture système',
                ],
            },
            {
                id: interfaces_1.DevCapability.FRONTEND,
                name: 'Frontend',
                description: 'Build user interfaces, components, pages with React/Next.js/Vue',
                tools: ['llm', 'code_runner'],
                permissions: ['codebase_write', 'npm'],
                cost,
                latency,
                requirements: ['llm_model', 'node_runtime'],
                keywords: [
                    'frontend',
                    'react',
                    'nextjs',
                    'vue',
                    'ui',
                    'interface',
                    'composant',
                    'page web',
                ],
            },
            {
                id: interfaces_1.DevCapability.BACKEND,
                name: 'Backend',
                description: 'Build server-side logic, APIs, services with Node.js/Python/Go',
                tools: ['llm', 'code_runner'],
                permissions: ['codebase_write', 'npm', 'pip'],
                cost,
                latency,
                requirements: ['llm_model', 'node_runtime'],
                keywords: ['backend', 'server', 'api', 'service', 'serveur', 'endpoint', 'route'],
            },
            {
                id: interfaces_1.DevCapability.DATABASE,
                name: 'Database',
                description: 'Design schemas, write migrations, optimize queries for SQL/NoSQL databases',
                tools: ['llm', 'db_client'],
                permissions: ['codebase_write', 'database'],
                cost,
                latency,
                requirements: ['llm_model', 'db_runtime'],
                keywords: [
                    'database',
                    'sql',
                    'nosql',
                    'schema',
                    'migration',
                    'base de données',
                    'table',
                    'requête',
                ],
            },
            {
                id: interfaces_1.DevCapability.API,
                name: 'API',
                description: 'Design and implement REST/GraphQL APIs, handle authentication, rate limiting',
                tools: ['llm', 'code_runner', 'api_tester'],
                permissions: ['codebase_write', 'network'],
                cost,
                latency,
                requirements: ['llm_model', 'node_runtime'],
                keywords: ['api', 'rest', 'graphql', 'endpoint', 'swagger', 'openapi'],
            },
            {
                id: interfaces_1.DevCapability.DEVOPS,
                name: 'DevOps',
                description: 'Set up CI/CD pipelines, build automation, infrastructure as code',
                tools: ['llm', 'cli'],
                permissions: ['codebase_write', 'cicd'],
                cost,
                latency,
                requirements: ['llm_model'],
                keywords: ['devops', 'cicd', 'pipeline', 'ci/cd', 'automatisation', 'integration'],
            },
            {
                id: interfaces_1.DevCapability.DOCKER,
                name: 'Docker',
                description: 'Create Dockerfiles, docker-compose configs, optimize container images',
                tools: ['llm', 'docker_cli'],
                permissions: ['codebase_write', 'docker'],
                cost,
                latency,
                requirements: ['llm_model', 'docker_runtime'],
                keywords: ['docker', 'container', 'dockerfile', 'compose', 'conteneur', 'image'],
            },
            {
                id: interfaces_1.DevCapability.KUBERNETES,
                name: 'Kubernetes',
                description: 'Create K8s manifests, Helm charts, configure deployments and services',
                tools: ['llm', 'kubectl'],
                permissions: ['codebase_write', 'kubernetes'],
                cost,
                latency,
                requirements: ['llm_model'],
                keywords: ['kubernetes', 'k8s', 'helm', 'cluster', 'pod', 'deployment'],
            },
            {
                id: interfaces_1.DevCapability.QA,
                name: 'QA',
                description: 'Design test strategies, create test plans, validate quality criteria',
                tools: ['llm', 'test_runner'],
                permissions: ['codebase_read'],
                cost,
                latency,
                requirements: ['llm_model'],
                keywords: ['qa', 'quality', 'validation', 'test plan', 'qualité', 'plan de test'],
            },
            {
                id: interfaces_1.DevCapability.TEST,
                name: 'Test',
                description: 'Write and execute unit, integration, E2E tests with coverage tracking',
                tools: ['llm', 'test_runner', 'coverage'],
                permissions: ['codebase_write', 'codebase_read'],
                cost,
                latency,
                requirements: ['llm_model', 'test_framework'],
                keywords: [
                    'test',
                    'unit test',
                    'integration',
                    'e2e',
                    'coverage',
                    'test unitaire',
                    'couverture',
                ],
            },
            {
                id: interfaces_1.DevCapability.DEBUG,
                name: 'Debug',
                description: 'Analyze errors, trace bugs, identify root causes, suggest fixes',
                tools: ['llm', 'debugger'],
                permissions: ['codebase_read', 'logs'],
                cost,
                latency,
                requirements: ['llm_model'],
                keywords: ['debug', 'fix', 'bug', 'error', 'erreur', 'correction', 'débogage'],
            },
            {
                id: interfaces_1.DevCapability.DOCUMENTATION,
                name: 'Documentation',
                description: 'Generate technical docs, API references, README, architecture docs',
                tools: ['llm', 'doc_generator'],
                permissions: ['codebase_read', 'codebase_write'],
                cost: { ...cost, estimatedUsdPerExecution: 0.05 },
                latency,
                requirements: ['llm_model'],
                keywords: [
                    'documentation',
                    'readme',
                    'docs',
                    'api doc',
                    'technical writing',
                    'document technique',
                ],
            },
        ];
        for (const cap of capabilities) {
            this.register({ ...cap, pack });
        }
    }
    initializeOfficePack() {
        const pack = interfaces_1.CapabilityPack.OFFICE;
        const cost = { estimatedUsdPerExecution: 0.03, computeMinutesPerExecution: 1 };
        const latency = { estimatedMs: 5000, minMs: 1000, maxMs: 30000 };
        const capabilities = [
            {
                id: interfaces_1.OfficeCapability.PDF,
                name: 'PDF',
                description: 'Generate, merge, split, and convert PDF documents',
                tools: ['reportlab', 'pdfkit'],
                permissions: ['filesystem_write'],
                cost,
                latency,
                requirements: ['pdf_engine'],
                keywords: ['pdf', 'document', 'report pdf', 'rapport pdf', 'generate pdf'],
            },
            {
                id: interfaces_1.OfficeCapability.DOCX,
                name: 'DOCX',
                description: 'Create and edit Word documents with formatting, tables, and images',
                tools: ['docx', 'pandoc'],
                permissions: ['filesystem_write'],
                cost,
                latency,
                requirements: ['docx_engine'],
                keywords: ['docx', 'word', 'document word', 'rapport word', 'generate docx'],
            },
            {
                id: interfaces_1.OfficeCapability.EXCEL,
                name: 'Excel',
                description: 'Create spreadsheets with formulas, charts, and data analysis',
                tools: ['openpyxl', 'xlsxwriter'],
                permissions: ['filesystem_write'],
                cost,
                latency,
                requirements: ['xlsx_engine'],
                keywords: ['excel', 'spreadsheet', 'xlsx', 'tableur', 'classeur'],
            },
            {
                id: interfaces_1.OfficeCapability.POWERPOINT,
                name: 'PowerPoint',
                description: 'Create presentations with slides, charts, and visual layouts',
                tools: ['python-pptx'],
                permissions: ['filesystem_write'],
                cost,
                latency,
                requirements: ['pptx_engine'],
                keywords: ['powerpoint', 'presentation', 'pptx', 'slides', 'présentation', 'diapositive'],
            },
            {
                id: interfaces_1.OfficeCapability.OCR,
                name: 'OCR',
                description: 'Extract text from scanned documents and images for document processing',
                tools: ['tesseract', 'paddleocr'],
                permissions: ['filesystem_read'],
                cost,
                latency,
                requirements: ['ocr_engine'],
                keywords: ['ocr', 'scan', 'text from image', 'extraction texte', 'numérisation'],
            },
            {
                id: interfaces_1.OfficeCapability.SIGNATURE,
                name: 'Signature',
                description: 'Apply digital signatures to documents, verify signature validity',
                tools: ['signpdf', 'openssl'],
                permissions: ['filesystem_write', 'keystore'],
                cost,
                latency,
                requirements: ['signature_engine'],
                keywords: ['signature', 'sign', 'digital sign', 'signer', 'signature numérique'],
            },
            {
                id: interfaces_1.OfficeCapability.EMAIL,
                name: 'Email',
                description: 'Send formatted emails with attachments, templates, and scheduling',
                tools: ['nodemailer', 'smtp'],
                permissions: ['network', 'email_send'],
                cost,
                latency,
                requirements: ['smtp_config'],
                keywords: ['email', 'mail', 'send email', 'courriel', 'envoyer email'],
            },
            {
                id: interfaces_1.OfficeCapability.CALENDAR,
                name: 'Calendar',
                description: 'Create calendar events, schedule meetings, manage availability',
                tools: ['ical'],
                permissions: ['network', 'calendar_write'],
                cost,
                latency,
                requirements: ['calendar_api'],
                keywords: [
                    'calendar',
                    'schedule',
                    'event',
                    'meeting',
                    'calendrier',
                    'réunion',
                    'planifier',
                ],
            },
        ];
        for (const cap of capabilities) {
            this.register({ ...cap, pack });
        }
    }
    initializeBusinessPack() {
        const pack = interfaces_1.CapabilityPack.BUSINESS;
        const cost = { estimatedUsdPerExecution: 0.05, computeMinutesPerExecution: 2 };
        const latency = { estimatedMs: 10000, minMs: 2000, maxMs: 60000 };
        const capabilities = [
            {
                id: interfaces_1.BusinessCapability.SEO,
                name: 'SEO',
                description: 'Optimize content for search engines, keyword research, meta tags',
                tools: ['llm', 'seo_analyzer'],
                permissions: ['network'],
                cost,
                latency,
                requirements: ['llm_model'],
                keywords: ['seo', 'search engine', 'keyword', 'ranking', 'référencement', 'mots-clés'],
            },
            {
                id: interfaces_1.BusinessCapability.MARKETING,
                name: 'Marketing',
                description: 'Create marketing strategies, campaigns, content calendars',
                tools: ['llm'],
                permissions: [],
                cost,
                latency,
                requirements: ['llm_model'],
                keywords: ['marketing', 'campaign', 'promotion', 'stratégie marketing', 'campagne'],
            },
            {
                id: interfaces_1.BusinessCapability.COPYWRITING,
                name: 'Copywriting',
                description: 'Write compelling copy for landing pages, ads, emails, product descriptions',
                tools: ['llm'],
                permissions: [],
                cost,
                latency,
                requirements: ['llm_model'],
                keywords: ['copywriting', 'copy', 'content writing', 'rédaction', 'contenu', 'texte'],
            },
            {
                id: interfaces_1.BusinessCapability.BRANDING,
                name: 'Branding',
                description: 'Define brand identity, style guides, visual language, tone of voice',
                tools: ['llm', 'image_gen'],
                permissions: [],
                cost,
                latency,
                requirements: ['llm_model'],
                keywords: ['branding', 'brand', 'identity', 'logo', 'marque', 'identité'],
            },
            {
                id: interfaces_1.BusinessCapability.CRM,
                name: 'CRM',
                description: 'Manage customer relationships, pipeline, leads, contact databases',
                tools: ['llm', 'crm_api'],
                permissions: ['network', 'crm_access'],
                cost,
                latency,
                requirements: ['crm_config'],
                keywords: ['crm', 'customer', 'leads', 'pipeline', 'client', 'prospect'],
            },
            {
                id: interfaces_1.BusinessCapability.ANALYTICS,
                name: 'Analytics',
                description: 'Analyze data, generate insights, create dashboards and reports',
                tools: ['llm', 'analytics_engine'],
                permissions: ['data_access'],
                cost,
                latency,
                requirements: ['llm_model', 'analytics'],
                keywords: ['analytics', 'data analysis', 'metrics', 'kpi', 'analyse', 'tableau de bord'],
            },
            {
                id: interfaces_1.BusinessCapability.FINANCE,
                name: 'Finance',
                description: 'Financial modeling, budgeting, cost analysis, revenue projections',
                tools: ['llm', 'spreadsheet'],
                permissions: ['data_access'],
                cost,
                latency,
                requirements: ['llm_model'],
                keywords: ['finance', 'budget', 'cost', 'revenue', 'financial', 'financier', 'budget'],
            },
            {
                id: interfaces_1.BusinessCapability.SALES,
                name: 'Sales',
                description: 'Create sales strategies, proposals, pricing models, competitive analysis',
                tools: ['llm'],
                permissions: [],
                cost,
                latency,
                requirements: ['llm_model'],
                keywords: ['sales', 'proposal', 'pricing', 'vente', 'proposition', 'tarification'],
            },
            {
                id: interfaces_1.BusinessCapability.LEGAL,
                name: 'Legal',
                description: 'Generate legal documents, terms of service, privacy policies, compliance',
                tools: ['llm'],
                permissions: [],
                cost: { ...cost, estimatedUsdPerExecution: 0.1 },
                latency,
                requirements: ['llm_model'],
                keywords: [
                    'legal',
                    'terms',
                    'privacy',
                    'compliance',
                    'juridique',
                    'conditions',
                    'confidentialité',
                ],
            },
            {
                id: interfaces_1.BusinessCapability.PARTNERSHIP,
                name: 'Partnership',
                description: 'Draft partnership agreements, collaboration proposals, MOUs',
                tools: ['llm'],
                permissions: [],
                cost,
                latency,
                requirements: ['llm_model'],
                keywords: [
                    'partnership',
                    'collaboration',
                    'agreement',
                    'partenariat',
                    'collaboration',
                    'accord',
                ],
            },
        ];
        for (const cap of capabilities) {
            this.register({ ...cap, pack });
        }
    }
    initializeCertificationPack() {
        const pack = interfaces_1.CapabilityPack.CERTIFICATION;
        const cost = { estimatedUsdPerExecution: 0.05, computeMinutesPerExecution: 3 };
        const latency = { estimatedMs: 15000, minMs: 5000, maxMs: 120000 };
        const capabilities = [
            {
                id: interfaces_1.CertCapability.ARCHITECTURE_REVIEW,
                name: 'Architecture Review',
                description: 'Review system architecture for scalability, maintainability, best practices',
                tools: ['llm', 'diagram_analyzer'],
                permissions: ['codebase_read'],
                cost,
                latency,
                requirements: ['llm_model'],
                keywords: [
                    'architecture review',
                    'architecture',
                    'design review',
                    'révision architecture',
                    'revue architecture',
                ],
            },
            {
                id: interfaces_1.CertCapability.SECURITY_AUDIT,
                name: 'Security Audit',
                description: 'Scan for vulnerabilities, OWASP top 10, dependency vulnerabilities',
                tools: ['snyk', 'sonarqube', 'llm'],
                permissions: ['codebase_read', 'network'],
                cost: { ...cost, estimatedUsdPerExecution: 0.1 },
                latency,
                requirements: ['llm_model', 'security_scanner'],
                keywords: [
                    'security audit',
                    'security',
                    'vulnerability',
                    'audit sécurité',
                    'vulnérabilité',
                ],
            },
            {
                id: interfaces_1.CertCapability.TEST_COVERAGE,
                name: 'Test Coverage',
                description: 'Verify test coverage meets threshold, identify untested code paths',
                tools: ['coverage', 'llm'],
                permissions: ['codebase_read'],
                cost,
                latency,
                requirements: ['coverage_tool'],
                keywords: ['test coverage', 'coverage', 'test', 'couverture test', 'couverture'],
            },
            {
                id: interfaces_1.CertCapability.REGRESSION,
                name: 'Regression',
                description: 'Run regression test suites, detect breaking changes',
                tools: ['test_runner', 'diff_analyzer'],
                permissions: ['codebase_read'],
                cost,
                latency,
                requirements: ['test_framework'],
                keywords: ['regression', 'regression test', 'breaking change', 'test de régression'],
            },
            {
                id: interfaces_1.CertCapability.PERFORMANCE,
                name: 'Performance',
                description: 'Run load tests, benchmarks, identify performance bottlenecks',
                tools: ['k6', 'artillery', 'llm'],
                permissions: ['codebase_read', 'network'],
                cost,
                latency,
                requirements: ['load_tester'],
                keywords: ['performance', 'load test', 'benchmark', 'stress test', 'test de charge'],
            },
            {
                id: interfaces_1.CertCapability.DOC_REVIEW,
                name: 'Doc Review',
                description: 'Review documentation quality, completeness, accuracy',
                tools: ['llm'],
                permissions: ['codebase_read'],
                cost,
                latency,
                requirements: ['llm_model'],
                keywords: ['doc review', 'documentation', 'doc quality', 'revue documentation'],
            },
            {
                id: interfaces_1.CertCapability.INTEGRATION,
                name: 'Integration',
                description: 'Verify integration points, API contracts, service compatibility',
                tools: ['llm', 'api_tester'],
                permissions: ['codebase_read', 'network'],
                cost,
                latency,
                requirements: ['llm_model'],
                keywords: ['integration', 'integration test', 'api contract', 'test intégration'],
            },
            {
                id: interfaces_1.CertCapability.COMPLIANCE,
                name: 'Compliance',
                description: 'Check regulatory compliance, GDPR, HIPAA, SOC2 requirements',
                tools: ['llm', 'compliance_checker'],
                permissions: ['codebase_read'],
                cost: { ...cost, estimatedUsdPerExecution: 0.08 },
                latency,
                requirements: ['llm_model'],
                keywords: ['compliance', 'gdpr', 'regulation', 'conformité', 'rgpd'],
            },
            {
                id: interfaces_1.CertCapability.ACCESSIBILITY,
                name: 'Accessibility',
                description: 'Test WCAG compliance, screen reader compatibility, keyboard navigation',
                tools: ['axe', 'llm'],
                permissions: ['codebase_read', 'network'],
                cost,
                latency,
                requirements: ['a11y_tool'],
                keywords: ['accessibility', 'wcag', 'a11y', 'accessibilité'],
            },
            {
                id: interfaces_1.CertCapability.DATA_PRIVACY,
                name: 'Data Privacy',
                description: 'Scan for PII exposure, data flow analysis, privacy impact assessment',
                tools: ['llm', 'data_scanner'],
                permissions: ['codebase_read'],
                cost: { ...cost, estimatedUsdPerExecution: 0.08 },
                latency,
                requirements: ['llm_model'],
                keywords: ['data privacy', 'privacy', 'pii', 'confidentialité', 'données personnelles'],
            },
        ];
        for (const cap of capabilities) {
            this.register({ ...cap, pack });
        }
    }
    initializeDeliveryPack() {
        const pack = interfaces_1.CapabilityPack.DELIVERY;
        const cost = { estimatedUsdPerExecution: 0.03, computeMinutesPerExecution: 2 };
        const latency = { estimatedMs: 10000, minMs: 2000, maxMs: 60000 };
        const capabilities = [
            {
                id: interfaces_1.DeliveryCapability.GITHUB,
                name: 'GitHub',
                description: 'Push code to GitHub repositories, create releases, manage PRs',
                tools: ['git', 'github_api'],
                permissions: ['git_access', 'codebase_read'],
                cost,
                latency,
                requirements: ['git_cli', 'github_token'],
                keywords: ['github', 'git push', 'repository', 'dépôt', 'push', 'release'],
            },
            {
                id: interfaces_1.DeliveryCapability.DOCKER_REGISTRY,
                name: 'Docker Registry',
                description: 'Build and push Docker images to container registries',
                tools: ['docker_cli'],
                permissions: ['docker', 'network'],
                cost: { ...cost, estimatedUsdPerExecution: 0.05 },
                latency,
                requirements: ['docker_runtime', 'registry_access'],
                keywords: ['docker registry', 'docker push', 'container image', 'image docker', 'registre'],
            },
            {
                id: interfaces_1.DeliveryCapability.VPS,
                name: 'VPS',
                description: 'Deploy to virtual private servers via SSH, configure services',
                tools: ['ssh', 'ansible'],
                permissions: ['ssh_access', 'network'],
                cost,
                latency,
                requirements: ['ssh_key', 'vps_config'],
                keywords: ['vps', 'server', 'ssh', 'deploy server', 'serveur', 'déploiement'],
            },
            {
                id: interfaces_1.DeliveryCapability.CLOUD,
                name: 'Cloud',
                description: 'Deploy to cloud providers (AWS, GCP, Azure) with IaC',
                tools: ['terraform', 'cloud_cli'],
                permissions: ['cloud_access', 'network'],
                cost: { ...cost, estimatedUsdPerExecution: 0.1 },
                latency,
                requirements: ['cloud_credentials'],
                keywords: ['cloud', 'aws', 'gcp', 'azure', 'nuage', 'infrastructure'],
            },
            {
                id: interfaces_1.DeliveryCapability.ZIP,
                name: 'ZIP',
                description: 'Package artifacts into ZIP archives for download',
                tools: ['archiver'],
                permissions: ['filesystem_write'],
                cost: { ...cost, estimatedUsdPerExecution: 0.01 },
                latency: { ...latency, estimatedMs: 2000 },
                requirements: [],
                keywords: ['zip', 'archive', 'package', 'compress', 'compresser', 'archiver'],
            },
            {
                id: interfaces_1.DeliveryCapability.PDF_REPORT,
                name: 'PDF Report',
                description: 'Generate final delivery report as formatted PDF',
                tools: ['reportlab', 'pdfkit'],
                permissions: ['filesystem_write'],
                cost,
                latency,
                requirements: ['pdf_engine'],
                keywords: ['pdf report', 'report', 'rapport', 'delivery report', 'livrable'],
            },
            {
                id: interfaces_1.DeliveryCapability.NOTIFICATION,
                name: 'Notification',
                description: 'Send delivery notifications via email, Slack, webhook',
                tools: ['nodemailer', 'webhook'],
                permissions: ['network', 'email_send'],
                cost,
                latency,
                requirements: ['notification_config'],
                keywords: ['notification', 'alert', 'notify', 'notification', 'alerte', 'avertir'],
            },
            {
                id: interfaces_1.DeliveryCapability.DEPLOYMENT,
                name: 'Deployment',
                description: 'Execute deployment scripts, verify health checks, roll out updates',
                tools: ['cli', 'ssh'],
                permissions: ['network', 'deployment_access'],
                cost: { ...cost, estimatedUsdPerExecution: 0.08 },
                latency,
                requirements: ['deployment_config'],
                keywords: ['deployment', 'deploy', 'rollout', 'déploiement', 'mise en production'],
            },
            {
                id: interfaces_1.DeliveryCapability.CDN,
                name: 'CDN',
                description: 'Configure content delivery networks, cache invalidation, edge deployment',
                tools: ['cdn_cli'],
                permissions: ['network', 'cdn_access'],
                cost,
                latency,
                requirements: ['cdn_credentials'],
                keywords: ['cdn', 'cache', 'edge', 'content delivery'],
            },
            {
                id: interfaces_1.DeliveryCapability.BACKUP,
                name: 'Backup',
                description: 'Create backups of deliverables, database dumps, configuration snapshots',
                tools: ['cli', 'archiver'],
                permissions: ['filesystem_write', 'database'],
                cost,
                latency,
                requirements: ['backup_storage'],
                keywords: ['backup', 'snapshot', 'sauvegarde', 'copie'],
            },
            {
                id: interfaces_1.DeliveryCapability.MONITORING_SETUP,
                name: 'Monitoring Setup',
                description: 'Configure monitoring, alerting, logging for deployed applications',
                tools: ['prometheus', 'grafana'],
                permissions: ['network', 'monitoring_access'],
                cost,
                latency,
                requirements: ['monitoring_config'],
                keywords: ['monitoring', 'alerting', 'logs', 'surveillance', 'supervision'],
            },
            {
                id: interfaces_1.DeliveryCapability.LOAD_BALANCER,
                name: 'Load Balancer',
                description: 'Configure load balancing, health checks, traffic routing',
                tools: ['nginx', 'haproxy'],
                permissions: ['network', 'lb_access'],
                cost,
                latency,
                requirements: ['lb_config'],
                keywords: ['load balancer', 'lb', 'nginx', 'traffic', 'équilibreur', 'répartition'],
            },
        ];
        for (const cap of capabilities) {
            this.register({ ...cap, pack });
        }
    }
};
exports.CapabilityRegistryService = CapabilityRegistryService;
exports.CapabilityRegistryService = CapabilityRegistryService = CapabilityRegistryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], CapabilityRegistryService);
//# sourceMappingURL=capability-registry.service.js.map