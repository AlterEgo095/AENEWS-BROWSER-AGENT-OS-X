/**
 * AENEWS Software Factory — Capability Registry
 * 
 * The catalog of all capabilities the platform knows how to do.
 * NOT a registry of agents — a registry of CAPABILITIES.
 * 
 * 6 Capability Packs, 64 capabilities total:
 *   Browser:     12 capabilities
 *   Development: 12 capabilities
 *   Office:       8 capabilities
 *   Business:    10 capabilities
 *   Certification: 10 capabilities
 *   Delivery:    12 capabilities
 * 
 * Workers are ephemeral. Capabilities are permanent.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  CapabilityPack,
  CapabilityDefinition,
  CapabilityId,
  CapabilityCost,
  CapabilityLatency,
  BrowserCapability,
  DevCapability,
  OfficeCapability,
  BusinessCapability,
  CertCapability,
  DeliveryCapability,
} from '../interfaces';

@Injectable()
export class CapabilityRegistryService {
  private readonly logger = new Logger(CapabilityRegistryService.name);
  private readonly capabilities = new Map<CapabilityId, CapabilityDefinition>();
  private readonly packIndex = new Map<CapabilityPack, CapabilityId[]>();

  constructor() {
    this.initializeBrowserPack();
    this.initializeDevelopmentPack();
    this.initializeOfficePack();
    this.initializeBusinessPack();
    this.initializeCertificationPack();
    this.initializeDeliveryPack();
    this.logger.log(`Capability Registry initialized: ${this.capabilities.size} capabilities across ${this.packIndex.size} packs`);
  }

  // ─── Query Methods ──────────────────────────────────────────

  /**
   * Get a capability definition by ID
   */
  getCapability(id: CapabilityId): CapabilityDefinition | undefined {
    return this.capabilities.get(id);
  }

  /**
   * Get all capabilities in a pack
   */
  getPack(pack: CapabilityPack): CapabilityDefinition[] {
    const ids = this.packIndex.get(pack) || [];
    return ids.map(id => this.capabilities.get(id)!).filter(Boolean);
  }

  /**
   * Get all capability definitions
   */
  getAllCapabilities(): CapabilityDefinition[] {
    return Array.from(this.capabilities.values());
  }

  /**
   * Get all pack names with their capability counts
   */
  getPackOverview(): Record<CapabilityPack, { name: string; count: number; capabilities: string[] }> {
    const overview: any = {};
    for (const [pack, ids] of this.packIndex) {
      overview[pack] = {
        name: this.getPackName(pack),
        count: ids.length,
        capabilities: ids,
      };
    }
    return overview;
  }

  /**
   * Search capabilities by keyword
   */
  searchByKeyword(keyword: string): CapabilityDefinition[] {
    const lower = keyword.toLowerCase();
    return Array.from(this.capabilities.values()).filter(cap =>
      cap.keywords.some(k => k.includes(lower)) ||
      cap.name.toLowerCase().includes(lower) ||
      cap.description.toLowerCase().includes(lower),
    );
  }

  /**
   * Find capabilities needed for a mission description
   */
  findCapabilitiesForMission(missionText: string): CapabilityDefinition[] {
    const lower = missionText.toLowerCase();
    const matches: CapabilityDefinition[] = [];

    for (const cap of this.capabilities.values()) {
      const keywordMatch = cap.keywords.some(k => lower.includes(k));
      if (keywordMatch) {
        matches.push(cap);
      }
    }

    return matches;
  }

  /**
   * Get total count of registered capabilities
   */
  getTotalCount(): number {
    return this.capabilities.size;
  }

  // ─── Pack Names ─────────────────────────────────────────────

  private getPackName(pack: CapabilityPack): string {
    const names: Record<CapabilityPack, string> = {
      [CapabilityPack.BROWSER]: 'Browser Capability Pack',
      [CapabilityPack.DEVELOPMENT]: 'Development Capability Pack',
      [CapabilityPack.OFFICE]: 'Office Capability Pack',
      [CapabilityPack.BUSINESS]: 'Business Capability Pack',
      [CapabilityPack.CERTIFICATION]: 'Certification Capability Pack',
      [CapabilityPack.DELIVERY]: 'Delivery Capability Pack',
    };
    return names[pack];
  }

  // ─── Registration Helper ────────────────────────────────────

  private register(definition: CapabilityDefinition): void {
    this.capabilities.set(definition.id, definition);
    const packIds = this.packIndex.get(definition.pack) || [];
    packIds.push(definition.id);
    this.packIndex.set(definition.pack, packIds);
  }

  // ─── Browser Capability Pack (12) ───────────────────────────

  private initializeBrowserPack(): void {
    const pack = CapabilityPack.BROWSER;
    const cost: CapabilityCost = { estimatedUsdPerExecution: 0.02, computeMinutesPerExecution: 0.5 };
    const latency: CapabilityLatency = { estimatedMs: 3000, minMs: 500, maxMs: 15000 };

    const capabilities: Omit<CapabilityDefinition, 'pack'>[] = [
      { id: BrowserCapability.LOGIN, name: 'Login', description: 'Authenticate to web applications via credentials, SSO, or tokens', tools: ['playwright', 'puppeteer'], permissions: ['network', 'credentials'], cost, latency, requirements: ['browser_runtime'], keywords: ['login', 'auth', 'authenticate', 'sign in', 'connexion', 'connexion'] },
      { id: BrowserCapability.NAVIGATION, name: 'Navigation', description: 'Navigate web pages, follow links, handle redirects and SPA routing', tools: ['playwright'], permissions: ['network'], cost, latency, requirements: ['browser_runtime'], keywords: ['navigate', 'browse', 'surf', 'page', 'url', 'naviguer', 'parcourir'] },
      { id: BrowserCapability.SEARCH, name: 'Search', description: 'Perform web searches, extract results from search engines', tools: ['playwright', 'web_search'], permissions: ['network'], cost, latency, requirements: ['browser_runtime'], keywords: ['search', 'find', 'google', 'bing', 'rechercher', 'chercher', 'trouver'] },
      { id: BrowserCapability.FORM, name: 'Form', description: 'Fill and submit web forms, handle dropdowns, checkboxes, file inputs', tools: ['playwright'], permissions: ['network', 'form_data'], cost, latency, requirements: ['browser_runtime'], keywords: ['form', 'fill', 'submit', 'input', 'formulaire', 'remplir', 'soumettre'] },
      { id: BrowserCapability.UPLOAD, name: 'Upload', description: 'Upload files to web applications, handle progress and drag-drop', tools: ['playwright'], permissions: ['network', 'filesystem_read'], cost, latency, requirements: ['browser_runtime'], keywords: ['upload', 'file upload', 'téléverser', 'envoyer'] },
      { id: BrowserCapability.DOWNLOAD, name: 'Download', description: 'Download files from web pages, handle download dialogs', tools: ['playwright'], permissions: ['network', 'filesystem_write'], cost, latency, requirements: ['browser_runtime'], keywords: ['download', 'save', 'télécharger', 'sauvegarder'] },
      { id: BrowserCapability.SCREENSHOT, name: 'Screenshot', description: 'Capture page screenshots, full-page or element-specific', tools: ['playwright'], permissions: ['filesystem_write'], cost: { ...cost, estimatedUsdPerExecution: 0.01 }, latency: { ...latency, estimatedMs: 1000 }, requirements: ['browser_runtime'], keywords: ['screenshot', 'capture', 'snapshot', 'image', 'capture d\'écran'] },
      { id: BrowserCapability.VISION, name: 'Vision', description: 'Analyze page visuals, detect UI elements, read charts and images', tools: ['playwright', 'vlm'], permissions: ['network'], cost: { ...cost, estimatedUsdPerExecution: 0.05 }, latency: { ...latency, estimatedMs: 5000 }, requirements: ['browser_runtime', 'vlm_model'], keywords: ['vision', 'visual', 'see', 'analyze page', 'visuel', 'voir'] },
      { id: BrowserCapability.SESSION, name: 'Session', description: 'Manage browser sessions, persist state across page loads', tools: ['playwright'], permissions: ['network', 'session_storage'], cost, latency, requirements: ['browser_runtime'], keywords: ['session', 'state', 'persist', 'session', 'état'] },
      { id: BrowserCapability.COOKIE, name: 'Cookie', description: 'Read, write, and manage browser cookies for authentication state', tools: ['playwright'], permissions: ['network', 'cookie_storage'], cost, latency, requirements: ['browser_runtime'], keywords: ['cookie', 'session cookie', 'auth cookie', 'cookie'] },
      { id: BrowserCapability.POPUP, name: 'Popup', description: 'Handle popups, modals, dialogs, and new browser windows', tools: ['playwright'], permissions: ['network'], cost, latency, requirements: ['browser_runtime'], keywords: ['popup', 'modal', 'dialog', 'alert', 'fenêtre', 'boîte de dialogue'] },
      { id: BrowserCapability.OCR, name: 'OCR', description: 'Extract text from images, screenshots, and scanned documents', tools: ['tesseract', 'vlm'], permissions: ['filesystem_read'], cost: { ...cost, estimatedUsdPerExecution: 0.03 }, latency: { ...latency, estimatedMs: 8000 }, requirements: ['ocr_engine'], keywords: ['ocr', 'text extraction', 'image to text', 'reconnaissance', 'extraction texte'] },
    ];

    for (const cap of capabilities) {
      this.register({ ...cap, pack });
    }
  }

  // ─── Development Capability Pack (12) ───────────────────────

  private initializeDevelopmentPack(): void {
    const pack = CapabilityPack.DEVELOPMENT;
    const cost: CapabilityCost = { estimatedUsdPerExecution: 0.10, computeMinutesPerExecution: 5 };
    const latency: CapabilityLatency = { estimatedMs: 30000, minMs: 5000, maxMs: 300000 };

    const capabilities: Omit<CapabilityDefinition, 'pack'>[] = [
      { id: DevCapability.ARCHITECTURE, name: 'Architecture', description: 'Design system architecture, select tech stack, define component boundaries', tools: ['llm', 'diagram_generator'], permissions: ['codebase_read'], cost: { ...cost, estimatedUsdPerExecution: 0.15 }, latency, requirements: ['llm_model'], keywords: ['architecture', 'design', 'system design', 'tech stack', 'conception', 'architecture système'] },
      { id: DevCapability.FRONTEND, name: 'Frontend', description: 'Build user interfaces, components, pages with React/Next.js/Vue', tools: ['llm', 'code_runner'], permissions: ['codebase_write', 'npm'], cost, latency, requirements: ['llm_model', 'node_runtime'], keywords: ['frontend', 'react', 'nextjs', 'vue', 'ui', 'interface', 'composant', 'page web'] },
      { id: DevCapability.BACKEND, name: 'Backend', description: 'Build server-side logic, APIs, services with Node.js/Python/Go', tools: ['llm', 'code_runner'], permissions: ['codebase_write', 'npm', 'pip'], cost, latency, requirements: ['llm_model', 'node_runtime'], keywords: ['backend', 'server', 'api', 'service', 'serveur', 'endpoint', 'route'] },
      { id: DevCapability.DATABASE, name: 'Database', description: 'Design schemas, write migrations, optimize queries for SQL/NoSQL databases', tools: ['llm', 'db_client'], permissions: ['codebase_write', 'database'], cost, latency, requirements: ['llm_model', 'db_runtime'], keywords: ['database', 'sql', 'nosql', 'schema', 'migration', 'base de données', 'table', 'requête'] },
      { id: DevCapability.API, name: 'API', description: 'Design and implement REST/GraphQL APIs, handle authentication, rate limiting', tools: ['llm', 'code_runner', 'api_tester'], permissions: ['codebase_write', 'network'], cost, latency, requirements: ['llm_model', 'node_runtime'], keywords: ['api', 'rest', 'graphql', 'endpoint', 'swagger', 'openapi'] },
      { id: DevCapability.DEVOPS, name: 'DevOps', description: 'Set up CI/CD pipelines, build automation, infrastructure as code', tools: ['llm', 'cli'], permissions: ['codebase_write', 'cicd'], cost, latency, requirements: ['llm_model'], keywords: ['devops', 'cicd', 'pipeline', 'ci/cd', 'automatisation', 'integration'] },
      { id: DevCapability.DOCKER, name: 'Docker', description: 'Create Dockerfiles, docker-compose configs, optimize container images', tools: ['llm', 'docker_cli'], permissions: ['codebase_write', 'docker'], cost, latency, requirements: ['llm_model', 'docker_runtime'], keywords: ['docker', 'container', 'dockerfile', 'compose', 'conteneur', 'image'] },
      { id: DevCapability.KUBERNETES, name: 'Kubernetes', description: 'Create K8s manifests, Helm charts, configure deployments and services', tools: ['llm', 'kubectl'], permissions: ['codebase_write', 'kubernetes'], cost, latency, requirements: ['llm_model'], keywords: ['kubernetes', 'k8s', 'helm', 'cluster', 'pod', 'deployment'] },
      { id: DevCapability.QA, name: 'QA', description: 'Design test strategies, create test plans, validate quality criteria', tools: ['llm', 'test_runner'], permissions: ['codebase_read'], cost, latency, requirements: ['llm_model'], keywords: ['qa', 'quality', 'validation', 'test plan', 'qualité', 'plan de test'] },
      { id: DevCapability.TEST, name: 'Test', description: 'Write and execute unit, integration, E2E tests with coverage tracking', tools: ['llm', 'test_runner', 'coverage'], permissions: ['codebase_write', 'codebase_read'], cost, latency, requirements: ['llm_model', 'test_framework'], keywords: ['test', 'unit test', 'integration', 'e2e', 'coverage', 'test unitaire', 'couverture'] },
      { id: DevCapability.DEBUG, name: 'Debug', description: 'Analyze errors, trace bugs, identify root causes, suggest fixes', tools: ['llm', 'debugger'], permissions: ['codebase_read', 'logs'], cost, latency, requirements: ['llm_model'], keywords: ['debug', 'fix', 'bug', 'error', 'erreur', 'correction', 'débogage'] },
      { id: DevCapability.DOCUMENTATION, name: 'Documentation', description: 'Generate technical docs, API references, README, architecture docs', tools: ['llm', 'doc_generator'], permissions: ['codebase_read', 'codebase_write'], cost: { ...cost, estimatedUsdPerExecution: 0.05 }, latency, requirements: ['llm_model'], keywords: ['documentation', 'readme', 'docs', 'api doc', 'technical writing', 'document technique'] },
    ];

    for (const cap of capabilities) {
      this.register({ ...cap, pack });
    }
  }

  // ─── Office Capability Pack (8) ─────────────────────────────

  private initializeOfficePack(): void {
    const pack = CapabilityPack.OFFICE;
    const cost: CapabilityCost = { estimatedUsdPerExecution: 0.03, computeMinutesPerExecution: 1 };
    const latency: CapabilityLatency = { estimatedMs: 5000, minMs: 1000, maxMs: 30000 };

    const capabilities: Omit<CapabilityDefinition, 'pack'>[] = [
      { id: OfficeCapability.PDF, name: 'PDF', description: 'Generate, merge, split, and convert PDF documents', tools: ['reportlab', 'pdfkit'], permissions: ['filesystem_write'], cost, latency, requirements: ['pdf_engine'], keywords: ['pdf', 'document', 'report pdf', 'rapport pdf', 'generate pdf'] },
      { id: OfficeCapability.DOCX, name: 'DOCX', description: 'Create and edit Word documents with formatting, tables, and images', tools: ['docx', 'pandoc'], permissions: ['filesystem_write'], cost, latency, requirements: ['docx_engine'], keywords: ['docx', 'word', 'document word', 'rapport word', 'generate docx'] },
      { id: OfficeCapability.EXCEL, name: 'Excel', description: 'Create spreadsheets with formulas, charts, and data analysis', tools: ['openpyxl', 'xlsxwriter'], permissions: ['filesystem_write'], cost, latency, requirements: ['xlsx_engine'], keywords: ['excel', 'spreadsheet', 'xlsx', 'tableur', 'classeur'] },
      { id: OfficeCapability.POWERPOINT, name: 'PowerPoint', description: 'Create presentations with slides, charts, and visual layouts', tools: ['python-pptx'], permissions: ['filesystem_write'], cost, latency, requirements: ['pptx_engine'], keywords: ['powerpoint', 'presentation', 'pptx', 'slides', 'présentation', 'diapositive'] },
      { id: OfficeCapability.OCR, name: 'OCR', description: 'Extract text from scanned documents and images for document processing', tools: ['tesseract', 'paddleocr'], permissions: ['filesystem_read'], cost, latency, requirements: ['ocr_engine'], keywords: ['ocr', 'scan', 'text from image', 'extraction texte', 'numérisation'] },
      { id: OfficeCapability.SIGNATURE, name: 'Signature', description: 'Apply digital signatures to documents, verify signature validity', tools: ['signpdf', 'openssl'], permissions: ['filesystem_write', 'keystore'], cost, latency, requirements: ['signature_engine'], keywords: ['signature', 'sign', 'digital sign', 'signer', 'signature numérique'] },
      { id: OfficeCapability.EMAIL, name: 'Email', description: 'Send formatted emails with attachments, templates, and scheduling', tools: ['nodemailer', 'smtp'], permissions: ['network', 'email_send'], cost, latency, requirements: ['smtp_config'], keywords: ['email', 'mail', 'send email', 'courriel', 'envoyer email'] },
      { id: OfficeCapability.CALENDAR, name: 'Calendar', description: 'Create calendar events, schedule meetings, manage availability', tools: ['ical'], permissions: ['network', 'calendar_write'], cost, latency, requirements: ['calendar_api'], keywords: ['calendar', 'schedule', 'event', 'meeting', 'calendrier', 'réunion', 'planifier'] },
    ];

    for (const cap of capabilities) {
      this.register({ ...cap, pack });
    }
  }

  // ─── Business Capability Pack (10) ──────────────────────────

  private initializeBusinessPack(): void {
    const pack = CapabilityPack.BUSINESS;
    const cost: CapabilityCost = { estimatedUsdPerExecution: 0.05, computeMinutesPerExecution: 2 };
    const latency: CapabilityLatency = { estimatedMs: 10000, minMs: 2000, maxMs: 60000 };

    const capabilities: Omit<CapabilityDefinition, 'pack'>[] = [
      { id: BusinessCapability.SEO, name: 'SEO', description: 'Optimize content for search engines, keyword research, meta tags', tools: ['llm', 'seo_analyzer'], permissions: ['network'], cost, latency, requirements: ['llm_model'], keywords: ['seo', 'search engine', 'keyword', 'ranking', 'référencement', 'mots-clés'] },
      { id: BusinessCapability.MARKETING, name: 'Marketing', description: 'Create marketing strategies, campaigns, content calendars', tools: ['llm'], permissions: [], cost, latency, requirements: ['llm_model'], keywords: ['marketing', 'campaign', 'promotion', 'stratégie marketing', 'campagne'] },
      { id: BusinessCapability.COPYWRITING, name: 'Copywriting', description: 'Write compelling copy for landing pages, ads, emails, product descriptions', tools: ['llm'], permissions: [], cost, latency, requirements: ['llm_model'], keywords: ['copywriting', 'copy', 'content writing', 'rédaction', 'contenu', 'texte'] },
      { id: BusinessCapability.BRANDING, name: 'Branding', description: 'Define brand identity, style guides, visual language, tone of voice', tools: ['llm', 'image_gen'], permissions: [], cost, latency, requirements: ['llm_model'], keywords: ['branding', 'brand', 'identity', 'logo', 'marque', 'identité'] },
      { id: BusinessCapability.CRM, name: 'CRM', description: 'Manage customer relationships, pipeline, leads, contact databases', tools: ['llm', 'crm_api'], permissions: ['network', 'crm_access'], cost, latency, requirements: ['crm_config'], keywords: ['crm', 'customer', 'leads', 'pipeline', 'client', 'prospect'] },
      { id: BusinessCapability.ANALYTICS, name: 'Analytics', description: 'Analyze data, generate insights, create dashboards and reports', tools: ['llm', 'analytics_engine'], permissions: ['data_access'], cost, latency, requirements: ['llm_model', 'analytics'], keywords: ['analytics', 'data analysis', 'metrics', 'kpi', 'analyse', 'tableau de bord'] },
      { id: BusinessCapability.FINANCE, name: 'Finance', description: 'Financial modeling, budgeting, cost analysis, revenue projections', tools: ['llm', 'spreadsheet'], permissions: ['data_access'], cost, latency, requirements: ['llm_model'], keywords: ['finance', 'budget', 'cost', 'revenue', 'financial', 'financier', 'budget'] },
      { id: BusinessCapability.SALES, name: 'Sales', description: 'Create sales strategies, proposals, pricing models, competitive analysis', tools: ['llm'], permissions: [], cost, latency, requirements: ['llm_model'], keywords: ['sales', 'proposal', 'pricing', 'vente', 'proposition', 'tarification'] },
      { id: BusinessCapability.LEGAL, name: 'Legal', description: 'Generate legal documents, terms of service, privacy policies, compliance', tools: ['llm'], permissions: [], cost: { ...cost, estimatedUsdPerExecution: 0.10 }, latency, requirements: ['llm_model'], keywords: ['legal', 'terms', 'privacy', 'compliance', 'juridique', 'conditions', 'confidentialité'] },
      { id: BusinessCapability.PARTNERSHIP, name: 'Partnership', description: 'Draft partnership agreements, collaboration proposals, MOUs', tools: ['llm'], permissions: [], cost, latency, requirements: ['llm_model'], keywords: ['partnership', 'collaboration', 'agreement', 'partenariat', 'collaboration', 'accord'] },
    ];

    for (const cap of capabilities) {
      this.register({ ...cap, pack });
    }
  }

  // ─── Certification Capability Pack (10) ─────────────────────

  private initializeCertificationPack(): void {
    const pack = CapabilityPack.CERTIFICATION;
    const cost: CapabilityCost = { estimatedUsdPerExecution: 0.05, computeMinutesPerExecution: 3 };
    const latency: CapabilityLatency = { estimatedMs: 15000, minMs: 5000, maxMs: 120000 };

    const capabilities: Omit<CapabilityDefinition, 'pack'>[] = [
      { id: CertCapability.ARCHITECTURE_REVIEW, name: 'Architecture Review', description: 'Review system architecture for scalability, maintainability, best practices', tools: ['llm', 'diagram_analyzer'], permissions: ['codebase_read'], cost, latency, requirements: ['llm_model'], keywords: ['architecture review', 'architecture', 'design review', 'révision architecture', 'revue architecture'] },
      { id: CertCapability.SECURITY_AUDIT, name: 'Security Audit', description: 'Scan for vulnerabilities, OWASP top 10, dependency vulnerabilities', tools: ['snyk', 'sonarqube', 'llm'], permissions: ['codebase_read', 'network'], cost: { ...cost, estimatedUsdPerExecution: 0.10 }, latency, requirements: ['llm_model', 'security_scanner'], keywords: ['security audit', 'security', 'vulnerability', 'audit sécurité', 'vulnérabilité'] },
      { id: CertCapability.TEST_COVERAGE, name: 'Test Coverage', description: 'Verify test coverage meets threshold, identify untested code paths', tools: ['coverage', 'llm'], permissions: ['codebase_read'], cost, latency, requirements: ['coverage_tool'], keywords: ['test coverage', 'coverage', 'test', 'couverture test', 'couverture'] },
      { id: CertCapability.REGRESSION, name: 'Regression', description: 'Run regression test suites, detect breaking changes', tools: ['test_runner', 'diff_analyzer'], permissions: ['codebase_read'], cost, latency, requirements: ['test_framework'], keywords: ['regression', 'regression test', 'breaking change', 'test de régression'] },
      { id: CertCapability.PERFORMANCE, name: 'Performance', description: 'Run load tests, benchmarks, identify performance bottlenecks', tools: ['k6', 'artillery', 'llm'], permissions: ['codebase_read', 'network'], cost, latency, requirements: ['load_tester'], keywords: ['performance', 'load test', 'benchmark', 'stress test', 'test de charge'] },
      { id: CertCapability.DOC_REVIEW, name: 'Doc Review', description: 'Review documentation quality, completeness, accuracy', tools: ['llm'], permissions: ['codebase_read'], cost, latency, requirements: ['llm_model'], keywords: ['doc review', 'documentation', 'doc quality', 'revue documentation'] },
      { id: CertCapability.INTEGRATION, name: 'Integration', description: 'Verify integration points, API contracts, service compatibility', tools: ['llm', 'api_tester'], permissions: ['codebase_read', 'network'], cost, latency, requirements: ['llm_model'], keywords: ['integration', 'integration test', 'api contract', 'test intégration'] },
      { id: CertCapability.COMPLIANCE, name: 'Compliance', description: 'Check regulatory compliance, GDPR, HIPAA, SOC2 requirements', tools: ['llm', 'compliance_checker'], permissions: ['codebase_read'], cost: { ...cost, estimatedUsdPerExecution: 0.08 }, latency, requirements: ['llm_model'], keywords: ['compliance', 'gdpr', 'regulation', 'conformité', 'rgpd'] },
      { id: CertCapability.ACCESSIBILITY, name: 'Accessibility', description: 'Test WCAG compliance, screen reader compatibility, keyboard navigation', tools: ['axe', 'llm'], permissions: ['codebase_read', 'network'], cost, latency, requirements: ['a11y_tool'], keywords: ['accessibility', 'wcag', 'a11y', 'accessibilité'] },
      { id: CertCapability.DATA_PRIVACY, name: 'Data Privacy', description: 'Scan for PII exposure, data flow analysis, privacy impact assessment', tools: ['llm', 'data_scanner'], permissions: ['codebase_read'], cost: { ...cost, estimatedUsdPerExecution: 0.08 }, latency, requirements: ['llm_model'], keywords: ['data privacy', 'privacy', 'pii', 'confidentialité', 'données personnelles'] },
    ];

    for (const cap of capabilities) {
      this.register({ ...cap, pack });
    }
  }

  // ─── Delivery Capability Pack (12) ──────────────────────────

  private initializeDeliveryPack(): void {
    const pack = CapabilityPack.DELIVERY;
    const cost: CapabilityCost = { estimatedUsdPerExecution: 0.03, computeMinutesPerExecution: 2 };
    const latency: CapabilityLatency = { estimatedMs: 10000, minMs: 2000, maxMs: 60000 };

    const capabilities: Omit<CapabilityDefinition, 'pack'>[] = [
      { id: DeliveryCapability.GITHUB, name: 'GitHub', description: 'Push code to GitHub repositories, create releases, manage PRs', tools: ['git', 'github_api'], permissions: ['git_access', 'codebase_read'], cost, latency, requirements: ['git_cli', 'github_token'], keywords: ['github', 'git push', 'repository', 'dépôt', 'push', 'release'] },
      { id: DeliveryCapability.DOCKER_REGISTRY, name: 'Docker Registry', description: 'Build and push Docker images to container registries', tools: ['docker_cli'], permissions: ['docker', 'network'], cost: { ...cost, estimatedUsdPerExecution: 0.05 }, latency, requirements: ['docker_runtime', 'registry_access'], keywords: ['docker registry', 'docker push', 'container image', 'image docker', 'registre'] },
      { id: DeliveryCapability.VPS, name: 'VPS', description: 'Deploy to virtual private servers via SSH, configure services', tools: ['ssh', 'ansible'], permissions: ['ssh_access', 'network'], cost, latency, requirements: ['ssh_key', 'vps_config'], keywords: ['vps', 'server', 'ssh', 'deploy server', 'serveur', 'déploiement'] },
      { id: DeliveryCapability.CLOUD, name: 'Cloud', description: 'Deploy to cloud providers (AWS, GCP, Azure) with IaC', tools: ['terraform', 'cloud_cli'], permissions: ['cloud_access', 'network'], cost: { ...cost, estimatedUsdPerExecution: 0.10 }, latency, requirements: ['cloud_credentials'], keywords: ['cloud', 'aws', 'gcp', 'azure', 'nuage', 'infrastructure'] },
      { id: DeliveryCapability.ZIP, name: 'ZIP', description: 'Package artifacts into ZIP archives for download', tools: ['archiver'], permissions: ['filesystem_write'], cost: { ...cost, estimatedUsdPerExecution: 0.01 }, latency: { ...latency, estimatedMs: 2000 }, requirements: [], keywords: ['zip', 'archive', 'package', 'compress', 'compresser', 'archiver'] },
      { id: DeliveryCapability.PDF_REPORT, name: 'PDF Report', description: 'Generate final delivery report as formatted PDF', tools: ['reportlab', 'pdfkit'], permissions: ['filesystem_write'], cost, latency, requirements: ['pdf_engine'], keywords: ['pdf report', 'report', 'rapport', 'delivery report', 'livrable'] },
      { id: DeliveryCapability.NOTIFICATION, name: 'Notification', description: 'Send delivery notifications via email, Slack, webhook', tools: ['nodemailer', 'webhook'], permissions: ['network', 'email_send'], cost, latency, requirements: ['notification_config'], keywords: ['notification', 'alert', 'notify', 'notification', 'alerte', 'avertir'] },
      { id: DeliveryCapability.DEPLOYMENT, name: 'Deployment', description: 'Execute deployment scripts, verify health checks, roll out updates', tools: ['cli', 'ssh'], permissions: ['network', 'deployment_access'], cost: { ...cost, estimatedUsdPerExecution: 0.08 }, latency, requirements: ['deployment_config'], keywords: ['deployment', 'deploy', 'rollout', 'déploiement', 'mise en production'] },
      { id: DeliveryCapability.CDN, name: 'CDN', description: 'Configure content delivery networks, cache invalidation, edge deployment', tools: ['cdn_cli'], permissions: ['network', 'cdn_access'], cost, latency, requirements: ['cdn_credentials'], keywords: ['cdn', 'cache', 'edge', 'content delivery'] },
      { id: DeliveryCapability.BACKUP, name: 'Backup', description: 'Create backups of deliverables, database dumps, configuration snapshots', tools: ['cli', 'archiver'], permissions: ['filesystem_write', 'database'], cost, latency, requirements: ['backup_storage'], keywords: ['backup', 'snapshot', 'sauvegarde', 'copie'] },
      { id: DeliveryCapability.MONITORING_SETUP, name: 'Monitoring Setup', description: 'Configure monitoring, alerting, logging for deployed applications', tools: ['prometheus', 'grafana'], permissions: ['network', 'monitoring_access'], cost, latency, requirements: ['monitoring_config'], keywords: ['monitoring', 'alerting', 'logs', 'surveillance', 'supervision'] },
      { id: DeliveryCapability.LOAD_BALANCER, name: 'Load Balancer', description: 'Configure load balancing, health checks, traffic routing', tools: ['nginx', 'haproxy'], permissions: ['network', 'lb_access'], cost, latency, requirements: ['lb_config'], keywords: ['load balancer', 'lb', 'nginx', 'traffic', 'équilibreur', 'répartition'] },
    ];

    for (const cap of capabilities) {
      this.register({ ...cap, pack });
    }
  }
}
