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
var AgentRegistryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentRegistryService = void 0;
const common_1 = require("@nestjs/common");
const interfaces_1 = require("../interfaces");
let AgentRegistryService = AgentRegistryService_1 = class AgentRegistryService {
    constructor() {
        this.logger = new common_1.Logger(AgentRegistryService_1.name);
        this.definitions = new Map();
        this.registerAllAgents();
        this.logger.log(`Agent Registry initialized: ${this.definitions.size} agents across 7 levels`);
    }
    getDefinition(agentId) {
        return this.definitions.get(agentId);
    }
    getAllDefinitions() {
        return Array.from(this.definitions.values());
    }
    getByLevel(level) {
        return Array.from(this.definitions.values()).filter(d => d.level === level);
    }
    getPermanentAgents() {
        return this.getByLevel(interfaces_1.AgentLevel.CORE);
    }
    getOnDemandAgents() {
        return Array.from(this.definitions.values()).filter(d => !d.permanent);
    }
    getTeamCompositions() {
        return [
            {
                level: interfaces_1.AgentLevel.CORE,
                name: 'Core Orchestration',
                agents: this.getByLevel(interfaces_1.AgentLevel.CORE).map(d => d.id),
                total: 10,
                permanent: true,
            },
            {
                level: interfaces_1.AgentLevel.BROWSER,
                name: 'Browser Team',
                agents: this.getByLevel(interfaces_1.AgentLevel.BROWSER).map(d => d.id),
                total: 12,
                permanent: false,
            },
            {
                level: interfaces_1.AgentLevel.DEVELOPMENT,
                name: 'Development Team',
                agents: this.getByLevel(interfaces_1.AgentLevel.DEVELOPMENT).map(d => d.id),
                total: 12,
                permanent: false,
            },
            {
                level: interfaces_1.AgentLevel.OFFICE,
                name: 'Office Team',
                agents: this.getByLevel(interfaces_1.AgentLevel.OFFICE).map(d => d.id),
                total: 6,
                permanent: false,
            },
            {
                level: interfaces_1.AgentLevel.BUSINESS,
                name: 'Business Team',
                agents: this.getByLevel(interfaces_1.AgentLevel.BUSINESS).map(d => d.id),
                total: 8,
                permanent: false,
            },
            {
                level: interfaces_1.AgentLevel.CERTIFICATION,
                name: 'Certification Team',
                agents: this.getByLevel(interfaces_1.AgentLevel.CERTIFICATION).map(d => d.id),
                total: 8,
                permanent: false,
            },
            {
                level: interfaces_1.AgentLevel.DELIVERY,
                name: 'Delivery Team',
                agents: this.getByLevel(interfaces_1.AgentLevel.DELIVERY).map(d => d.id),
                total: 8,
                permanent: false,
            },
        ];
    }
    findBySkill(skill) {
        return Array.from(this.definitions.values()).filter(d => d.skills.some(s => s.toLowerCase().includes(skill.toLowerCase())));
    }
    findAgentsForMission(missionDescription) {
        const desc = missionDescription.toLowerCase();
        const needed = [];
        needed.push(interfaces_1.CoreAgent.MISSION_ORCHESTRATOR, interfaces_1.CoreAgent.MISSION_PLANNER);
        if (/navigate|browser|site|web|page|url|http/i.test(desc)) {
            needed.push(interfaces_1.BrowserAgent.NAVIGATION, interfaces_1.BrowserAgent.SESSION);
        }
        if (/login|auth|sign.?in|connect/i.test(desc)) {
            needed.push(interfaces_1.BrowserAgent.LOGIN);
        }
        if (/search|find|recherch/i.test(desc)) {
            needed.push(interfaces_1.BrowserAgent.SEARCH);
        }
        if (/form|fill|submit|saisir|remplir/i.test(desc)) {
            needed.push(interfaces_1.BrowserAgent.FORM);
        }
        if (/upload|télécharg.*fichier/i.test(desc)) {
            needed.push(interfaces_1.BrowserAgent.UPLOAD);
        }
        if (/download|télécharg/i.test(desc)) {
            needed.push(interfaces_1.BrowserAgent.DOWNLOAD);
        }
        if (/screenshot|capture|photo/i.test(desc)) {
            needed.push(interfaces_1.BrowserAgent.SCREENSHOT);
        }
        if (/vision|analyz.*image|voir/i.test(desc)) {
            needed.push(interfaces_1.BrowserAgent.VISION);
        }
        if (/cookie|session/i.test(desc) && !needed.includes(interfaces_1.BrowserAgent.SESSION)) {
            needed.push(interfaces_1.BrowserAgent.COOKIE);
        }
        if (/popup|pop.?up|alert/i.test(desc)) {
            needed.push(interfaces_1.BrowserAgent.POPUP);
        }
        if (/ocr|text.*image|reconnaiss/i.test(desc)) {
            needed.push(interfaces_1.BrowserAgent.OCR);
        }
        if (/créer|create|develop|build|saas|app|application|développ/i.test(desc)) {
            needed.push(interfaces_1.DevAgent.ARCHITECT, interfaces_1.DevAgent.FRONTEND, interfaces_1.DevAgent.BACKEND);
            needed.push(interfaces_1.CoreAgent.TASK_SCHEDULER);
        }
        if (/frontend|react|vue|angular|ui|interface/i.test(desc)) {
            needed.push(interfaces_1.DevAgent.FRONTEND);
        }
        if (/backend|api|serveur|server/i.test(desc)) {
            needed.push(interfaces_1.DevAgent.BACKEND, interfaces_1.DevAgent.API);
        }
        if (/database|base.*données|postgres|mysql|mongodb/i.test(desc)) {
            needed.push(interfaces_1.DevAgent.DATABASE);
        }
        if (/docker|contain/i.test(desc)) {
            needed.push(interfaces_1.DevAgent.DOCKER);
        }
        if (/kubernetes|k8s|orchestrat/i.test(desc)) {
            needed.push(interfaces_1.DevAgent.KUBERNETES);
        }
        if (/devops|ci.?cd|pipeline/i.test(desc)) {
            needed.push(interfaces_1.DevAgent.DEVOPS);
        }
        if (/test|qa|qualit/i.test(desc)) {
            needed.push(interfaces_1.DevAgent.QA, interfaces_1.DevAgent.TEST);
        }
        if (/debug|fix|corriger|repair/i.test(desc)) {
            needed.push(interfaces_1.DevAgent.DEBUG);
        }
        if (/document|readme|doc/i.test(desc)) {
            needed.push(interfaces_1.DevAgent.DOCUMENTATION);
        }
        if (/pdf|rapport|report/i.test(desc)) {
            needed.push(interfaces_1.OfficeAgent.PDF);
        }
        if (/docx|word|document.*trait/i.test(desc)) {
            needed.push(interfaces_1.OfficeAgent.DOCX);
        }
        if (/excel|spreadsheet|tableur|csv/i.test(desc)) {
            needed.push(interfaces_1.OfficeAgent.EXCEL);
        }
        if (/powerpoint|présentation|slide/i.test(desc)) {
            needed.push(interfaces_1.OfficeAgent.POWERPOINT);
        }
        if (/signature|sign.*numériq/i.test(desc)) {
            needed.push(interfaces_1.OfficeAgent.SIGNATURE);
        }
        if (/seo|référenc|search.*engine/i.test(desc)) {
            needed.push(interfaces_1.BusinessAgent.SEO);
        }
        if (/marketing|campagne|campaign/i.test(desc)) {
            needed.push(interfaces_1.BusinessAgent.MARKETING);
        }
        if (/copywrit|contenu|content.*writ/i.test(desc)) {
            needed.push(interfaces_1.BusinessAgent.COPYWRITING);
        }
        if (/brand|marque|identit/i.test(desc)) {
            needed.push(interfaces_1.BusinessAgent.BRANDING);
        }
        if (/crm|client|customer/i.test(desc)) {
            needed.push(interfaces_1.BusinessAgent.CRM);
        }
        if (/analytics|stat|metric|kpi/i.test(desc)) {
            needed.push(interfaces_1.BusinessAgent.ANALYTICS);
        }
        if (/financ|budget|compt/i.test(desc)) {
            needed.push(interfaces_1.BusinessAgent.FINANCE);
        }
        if (/sales|vente|commercial/i.test(desc)) {
            needed.push(interfaces_1.BusinessAgent.SALES);
        }
        if (/audit|certif|sécur|security/i.test(desc) || needed.length > 5) {
            needed.push(interfaces_1.CertAgent.SECURITY, interfaces_1.CertAgent.TESTS);
            needed.push(interfaces_1.CoreAgent.CERTIFICATION_MANAGER);
        }
        if (/performance|load|stress/i.test(desc)) {
            needed.push(interfaces_1.CertAgent.PERFORMANCE);
        }
        if (/regression|non.*regress/i.test(desc)) {
            needed.push(interfaces_1.CertAgent.REGRESSION);
        }
        if (/compliance|conform|rgpd|gdpr/i.test(desc)) {
            needed.push(interfaces_1.CertAgent.COMPLIANCE);
        }
        if (/deploy|déploy|mise.*en.*ligne/i.test(desc)) {
            needed.push(interfaces_1.DeliveryAgent.DEPLOYMENT);
            needed.push(interfaces_1.CoreAgent.DELIVERY_MANAGER);
        }
        if (/github|git|repo/i.test(desc)) {
            needed.push(interfaces_1.DeliveryAgent.GITHUB);
        }
        if (/vps|server|serveur.*dédi/i.test(desc)) {
            needed.push(interfaces_1.DeliveryAgent.VPS);
        }
        if (/cloud|aws|gcp|azure/i.test(desc)) {
            needed.push(interfaces_1.DeliveryAgent.CLOUD);
        }
        if (/zip|archive|pack/i.test(desc)) {
            needed.push(interfaces_1.DeliveryAgent.ZIP);
        }
        if (needed.length > 8) {
            needed.push(interfaces_1.CoreAgent.MEMORY_MANAGER, interfaces_1.CoreAgent.RESOURCE_MANAGER);
            needed.push(interfaces_1.CoreAgent.MONITORING_MANAGER, interfaces_1.CoreAgent.RECOVERY_MANAGER);
        }
        const unique = [...new Set(needed)];
        return unique.map(id => this.definitions.get(id)).filter((d) => !!d);
    }
    getTotalCount() {
        const permanent = this.getPermanentAgents().length;
        const onDemand = this.getOnDemandAgents().length;
        return { permanent, onDemand, total: permanent + onDemand };
    }
    registerAllAgents() {
        this.register({
            id: interfaces_1.CoreAgent.MISSION_ORCHESTRATOR,
            name: 'Mission Orchestrator',
            level: interfaces_1.AgentLevel.CORE,
            permanent: true,
            description: 'Chef d\'orchestre — coordinates all agents and manages mission lifecycle',
            skills: ['orchestration', 'coordination', 'mission_management', 'pipeline_control'],
            tools: ['mission_control', 'pipeline_engine', 'state_machine'],
            dependencies: [],
            maxConcurrentTasks: 5,
            estimatedCostPerTask: 0.1,
        });
        this.register({
            id: interfaces_1.CoreAgent.MISSION_PLANNER,
            name: 'Mission Planner',
            level: interfaces_1.AgentLevel.CORE,
            permanent: true,
            description: 'Décompose la mission en phases et assigne les agents nécessaires',
            skills: ['mission_decomposition', 'task_planning', 'resource_allocation', 'dependency_analysis'],
            tools: ['planner_engine', 'task_graph', 'gantt_chart'],
            dependencies: [interfaces_1.CoreAgent.MISSION_ORCHESTRATOR],
            maxConcurrentTasks: 3,
            estimatedCostPerTask: 0.15,
        });
        this.register({
            id: interfaces_1.CoreAgent.TASK_SCHEDULER,
            name: 'Task Scheduler',
            level: interfaces_1.AgentLevel.CORE,
            permanent: true,
            description: 'Planifie l\'exécution des tâches dans l\'ordre optimal',
            skills: ['scheduling', 'priority_management', 'parallel_execution', 'deadline_tracking'],
            tools: ['scheduler_engine', 'priority_queue', 'timeline'],
            dependencies: [interfaces_1.CoreAgent.MISSION_PLANNER],
            maxConcurrentTasks: 10,
            estimatedCostPerTask: 0.05,
        });
        this.register({
            id: interfaces_1.CoreAgent.MEMORY_MANAGER,
            name: 'Memory Manager',
            level: interfaces_1.AgentLevel.CORE,
            permanent: true,
            description: 'Gère la mémoire partagée, le contexte mission et l\'historique',
            skills: ['memory_management', 'context_storage', 'rag_pipeline', 'knowledge_retrieval'],
            tools: ['memory_store', 'rag_engine', 'context_cache'],
            dependencies: [],
            maxConcurrentTasks: 20,
            estimatedCostPerTask: 0.02,
        });
        this.register({
            id: interfaces_1.CoreAgent.RESOURCE_MANAGER,
            name: 'Resource Manager',
            level: interfaces_1.AgentLevel.CORE,
            permanent: true,
            description: 'Choisit les LLM, modèles et outils optimaux pour chaque tâche',
            skills: ['resource_optimization', 'model_selection', 'cost_management', 'load_balancing'],
            tools: ['resource_allocator', 'model_registry', 'cost_tracker'],
            dependencies: [],
            maxConcurrentTasks: 10,
            estimatedCostPerTask: 0.03,
        });
        this.register({
            id: interfaces_1.CoreAgent.SECURITY_MANAGER,
            name: 'Security Manager',
            level: interfaces_1.AgentLevel.CORE,
            permanent: true,
            description: 'Vérifie les permissions, valide les actions sensibles, applique les règles',
            skills: ['permission_check', 'action_validation', 'constitutional_rules', 'safety_gates'],
            tools: ['permission_engine', 'rule_checker', 'audit_logger'],
            dependencies: [],
            maxConcurrentTasks: 15,
            estimatedCostPerTask: 0.02,
        });
        this.register({
            id: interfaces_1.CoreAgent.CERTIFICATION_MANAGER,
            name: 'Certification Manager',
            level: interfaces_1.AgentLevel.CORE,
            permanent: true,
            description: 'Lance les audits et valide la qualité avant livraison',
            skills: ['quality_gate', 'audit_coordination', 'certification_workflow', 'compliance_check'],
            tools: ['certification_engine', 'quality_scorer', 'audit_runner'],
            dependencies: [],
            maxConcurrentTasks: 5,
            estimatedCostPerTask: 0.1,
        });
        this.register({
            id: interfaces_1.CoreAgent.DELIVERY_MANAGER,
            name: 'Delivery Manager',
            level: interfaces_1.AgentLevel.CORE,
            permanent: true,
            description: 'Coordonne la préparation et la livraison des artefacts finaux',
            skills: ['delivery_coordination', 'artifact_packaging', 'client_communication', 'release_management'],
            tools: ['delivery_engine', 'packager', 'release_tracker'],
            dependencies: [],
            maxConcurrentTasks: 5,
            estimatedCostPerTask: 0.08,
        });
        this.register({
            id: interfaces_1.CoreAgent.MONITORING_MANAGER,
            name: 'Monitoring Manager',
            level: interfaces_1.AgentLevel.CORE,
            permanent: true,
            description: 'Surveille la plateforme, les coûts, les performances et la santé',
            skills: ['platform_monitoring', 'cost_tracking', 'performance_metrics', 'health_checks'],
            tools: ['monitoring_dashboard', 'metrics_collector', 'alerting_engine'],
            dependencies: [],
            maxConcurrentTasks: 20,
            estimatedCostPerTask: 0.01,
        });
        this.register({
            id: interfaces_1.CoreAgent.RECOVERY_MANAGER,
            name: 'Recovery Manager',
            level: interfaces_1.AgentLevel.CORE,
            permanent: true,
            description: 'Gère les erreurs, les retry, les rollback et la reprise',
            skills: ['error_recovery', 'retry_management', 'rollback_strategy', 'circuit_breaker'],
            tools: ['recovery_engine', 'retry_scheduler', 'rollback_manager'],
            dependencies: [],
            maxConcurrentTasks: 10,
            estimatedCostPerTask: 0.05,
        });
        this.registerBrowserTeam();
        this.registerDevTeam();
        this.registerOfficeTeam();
        this.registerBusinessTeam();
        this.registerCertTeam();
        this.registerDeliveryTeam();
    }
    register(def) {
        this.definitions.set(def.id, def);
    }
    registerBrowserTeam() {
        const agents = [
            { id: interfaces_1.BrowserAgent.LOGIN, name: 'Login Agent', level: interfaces_1.AgentLevel.BROWSER, permanent: false, description: 'Gère les connexions, authentifications et sessions sur les sites web', skills: ['authentication', 'login_automation', '2fa_handling', 'session_management'], tools: ['playwright', 'credential_manager'], dependencies: [interfaces_1.BrowserAgent.SESSION], maxConcurrentTasks: 3, estimatedCostPerTask: 0.2 },
            { id: interfaces_1.BrowserAgent.NAVIGATION, name: 'Navigation Agent', level: interfaces_1.AgentLevel.BROWSER, permanent: false, description: 'Navigue sur les sites, suit les liens, gère l\'historique', skills: ['web_navigation', 'link_following', 'page_traversal', 'url_management'], tools: ['playwright', 'navigation_tracker'], dependencies: [], maxConcurrentTasks: 5, estimatedCostPerTask: 0.15 },
            { id: interfaces_1.BrowserAgent.SEARCH, name: 'Search Agent', level: interfaces_1.AgentLevel.BROWSER, permanent: false, description: 'Effectue des recherches web, extrait et classe les résultats', skills: ['web_search', 'result_extraction', 'search_engine_automation', 'query_optimization'], tools: ['playwright', 'search_engine_api'], dependencies: [interfaces_1.BrowserAgent.NAVIGATION], maxConcurrentTasks: 5, estimatedCostPerTask: 0.15 },
            { id: interfaces_1.BrowserAgent.FORM, name: 'Form Agent', level: interfaces_1.AgentLevel.BROWSER, permanent: false, description: 'Remplit et soumet des formulaires web automatiquement', skills: ['form_filling', 'field_detection', 'validation_handling', 'submit_automation'], tools: ['playwright', 'form_analyzer'], dependencies: [interfaces_1.BrowserAgent.NAVIGATION], maxConcurrentTasks: 3, estimatedCostPerTask: 0.2 },
            { id: interfaces_1.BrowserAgent.UPLOAD, name: 'Upload Agent', level: interfaces_1.AgentLevel.BROWSER, permanent: false, description: 'Téléverse des fichiers sur des plateformes web', skills: ['file_upload', 'drag_drop_handling', 'multi_file_upload', 'progress_monitoring'], tools: ['playwright', 'file_manager'], dependencies: [interfaces_1.BrowserAgent.NAVIGATION], maxConcurrentTasks: 3, estimatedCostPerTask: 0.15 },
            { id: interfaces_1.BrowserAgent.DOWNLOAD, name: 'Download Agent', level: interfaces_1.AgentLevel.BROWSER, permanent: false, description: 'Télécharge des fichiers depuis des sites web', skills: ['file_download', 'download_monitoring', 'format_detection', 'integrity_check'], tools: ['playwright', 'download_manager'], dependencies: [interfaces_1.BrowserAgent.NAVIGATION], maxConcurrentTasks: 5, estimatedCostPerTask: 0.1 },
            { id: interfaces_1.BrowserAgent.SCREENSHOT, name: 'Screenshot Agent', level: interfaces_1.AgentLevel.BROWSER, permanent: false, description: 'Capture des screenshots de pages web et d\'éléments spécifiques', skills: ['screenshot_capture', 'full_page_screenshot', 'element_screenshot', 'comparison_visual'], tools: ['playwright', 'image_processor'], dependencies: [interfaces_1.BrowserAgent.NAVIGATION], maxConcurrentTasks: 10, estimatedCostPerTask: 0.05 },
            { id: interfaces_1.BrowserAgent.VISION, name: 'Vision Agent', level: interfaces_1.AgentLevel.BROWSER, permanent: false, description: 'Analyse visuellement les pages web avec des modèles de vision', skills: ['visual_analysis', 'layout_understanding', 'element_detection', 'accessibility_audit'], tools: ['vision_model', 'playwright'], dependencies: [interfaces_1.BrowserAgent.SCREENSHOT], maxConcurrentTasks: 3, estimatedCostPerTask: 0.3 },
            { id: interfaces_1.BrowserAgent.SESSION, name: 'Session Agent', level: interfaces_1.AgentLevel.BROWSER, permanent: false, description: 'Gère les sessions navigateur, cookies et état de connexion', skills: ['session_management', 'cookie_handling', 'state_persistence', 'proxy_management'], tools: ['playwright', 'session_store'], dependencies: [], maxConcurrentTasks: 5, estimatedCostPerTask: 0.1 },
            { id: interfaces_1.BrowserAgent.COOKIE, name: 'Cookie Agent', level: interfaces_1.AgentLevel.BROWSER, permanent: false, description: 'Gère les cookies : acceptation, modification, extraction', skills: ['cookie_management', 'consent_handling', 'cookie_extraction', 'privacy_compliance'], tools: ['playwright', 'cookie_manager'], dependencies: [interfaces_1.BrowserAgent.SESSION], maxConcurrentTasks: 5, estimatedCostPerTask: 0.1 },
            { id: interfaces_1.BrowserAgent.POPUP, name: 'Popup Agent', level: interfaces_1.AgentLevel.BROWSER, permanent: false, description: 'Gère les popups, modals, alerts et dialogues', skills: ['popup_handling', 'dialog_management', 'modal_interaction', 'alert_dismissal'], tools: ['playwright', 'dialog_handler'], dependencies: [interfaces_1.BrowserAgent.NAVIGATION], maxConcurrentTasks: 5, estimatedCostPerTask: 0.1 },
            { id: interfaces_1.BrowserAgent.OCR, name: 'OCR Agent', level: interfaces_1.AgentLevel.BROWSER, permanent: false, description: 'Extrait le texte des images et captures d\'écran web', skills: ['ocr_extraction', 'image_to_text', 'document_scanning', 'captcha_reading'], tools: ['ocr_engine', 'image_processor'], dependencies: [interfaces_1.BrowserAgent.SCREENSHOT], maxConcurrentTasks: 5, estimatedCostPerTask: 0.2 },
        ];
        agents.forEach(a => this.register(a));
    }
    registerDevTeam() {
        const agents = [
            { id: interfaces_1.DevAgent.ARCHITECT, name: 'Architect Agent', level: interfaces_1.AgentLevel.DEVELOPMENT, permanent: false, description: 'Conçoit l\'architecture technique et choisit les technologies', skills: ['system_design', 'architecture_patterns', 'technology_selection', 'component_diagram'], tools: ['design_tools', 'diagram_generator'], dependencies: [], maxConcurrentTasks: 2, estimatedCostPerTask: 0.3 },
            { id: interfaces_1.DevAgent.FRONTEND, name: 'Frontend Agent', level: interfaces_1.AgentLevel.DEVELOPMENT, permanent: false, description: 'Développe les interfaces utilisateur avec React/Next.js', skills: ['react', 'nextjs', 'typescript', 'css', 'responsive_design', 'ui_components'], tools: ['code_editor', 'design_system'], dependencies: [interfaces_1.DevAgent.ARCHITECT], maxConcurrentTasks: 3, estimatedCostPerTask: 0.4 },
            { id: interfaces_1.DevAgent.BACKEND, name: 'Backend Agent', level: interfaces_1.AgentLevel.DEVELOPMENT, permanent: false, description: 'Développe les APIs et la logique serveur', skills: ['nodejs', 'nestjs', 'python', 'api_design', 'microservices'], tools: ['code_editor', 'api_tester'], dependencies: [interfaces_1.DevAgent.ARCHITECT], maxConcurrentTasks: 3, estimatedCostPerTask: 0.4 },
            { id: interfaces_1.DevAgent.DATABASE, name: 'Database Agent', level: interfaces_1.AgentLevel.DEVELOPMENT, permanent: false, description: 'Conçoit et implémente les schémas de base de données', skills: ['sql', 'nosql', 'schema_design', 'migration', 'orm', 'prisma'], tools: ['schema_designer', 'migration_tool'], dependencies: [interfaces_1.DevAgent.ARCHITECT], maxConcurrentTasks: 2, estimatedCostPerTask: 0.3 },
            { id: interfaces_1.DevAgent.API, name: 'API Agent', level: interfaces_1.AgentLevel.DEVELOPMENT, permanent: false, description: 'Crée et documente les APIs REST et GraphQL', skills: ['rest_api', 'graphql', 'openapi', 'api_documentation', 'versioning'], tools: ['api_designer', 'swagger_generator'], dependencies: [interfaces_1.DevAgent.BACKEND], maxConcurrentTasks: 3, estimatedCostPerTask: 0.3 },
            { id: interfaces_1.DevAgent.DEVOPS, name: 'DevOps Agent', level: interfaces_1.AgentLevel.DEVELOPMENT, permanent: false, description: 'Configure les pipelines CI/CD et l\'infrastructure', skills: ['cicd', 'github_actions', 'infrastructure_as_code', 'terraform', 'monitoring'], tools: ['pipeline_editor', 'infra_manager'], dependencies: [], maxConcurrentTasks: 2, estimatedCostPerTask: 0.3 },
            { id: interfaces_1.DevAgent.DOCKER, name: 'Docker Agent', level: interfaces_1.AgentLevel.DEVELOPMENT, permanent: false, description: 'Crée les images Docker et les configurations de conteneurs', skills: ['docker', 'docker_compose', 'containerization', 'multi_stage_build', 'optimization'], tools: ['docker_cli', 'compose_editor'], dependencies: [interfaces_1.DevAgent.DEVOPS], maxConcurrentTasks: 3, estimatedCostPerTask: 0.2 },
            { id: interfaces_1.DevAgent.KUBERNETES, name: 'Kubernetes Agent', level: interfaces_1.AgentLevel.DEVELOPMENT, permanent: false, description: 'Déploie et gère les clusters Kubernetes', skills: ['kubernetes', 'helm', 'kustomize', 'service_mesh', 'scaling'], tools: ['kubectl', 'helm_chart'], dependencies: [interfaces_1.DevAgent.DOCKER], maxConcurrentTasks: 2, estimatedCostPerTask: 0.3 },
            { id: interfaces_1.DevAgent.QA, name: 'QA Agent', level: interfaces_1.AgentLevel.DEVELOPMENT, permanent: false, description: 'Assure la qualité globale du code et des fonctionnalités', skills: ['quality_assurance', 'code_review', 'best_practices', 'linting'], tools: ['linter', 'code_reviewer'], dependencies: [interfaces_1.DevAgent.FRONTEND, interfaces_1.DevAgent.BACKEND], maxConcurrentTasks: 5, estimatedCostPerTask: 0.15 },
            { id: interfaces_1.DevAgent.TEST, name: 'Test Agent', level: interfaces_1.AgentLevel.DEVELOPMENT, permanent: false, description: 'Écrit et exécute les tests unitaires, intégration et E2E', skills: ['unit_testing', 'integration_testing', 'e2e_testing', 'jest', 'playwright_test'], tools: ['test_runner', 'coverage_analyzer'], dependencies: [interfaces_1.DevAgent.QA], maxConcurrentTasks: 5, estimatedCostPerTask: 0.2 },
            { id: interfaces_1.DevAgent.DEBUG, name: 'Debug Agent', level: interfaces_1.AgentLevel.DEVELOPMENT, permanent: false, description: 'Analyse et corrige les bugs et erreurs', skills: ['debugging', 'error_analysis', 'log_analysis', 'root_cause_analysis', 'fix_generation'], tools: ['debugger', 'log_analyzer'], dependencies: [], maxConcurrentTasks: 3, estimatedCostPerTask: 0.25 },
            { id: interfaces_1.DevAgent.DOCUMENTATION, name: 'Documentation Agent', level: interfaces_1.AgentLevel.DEVELOPMENT, permanent: false, description: 'Génère la documentation technique et les READMEs', skills: ['technical_writing', 'readme_generation', 'api_documentation', 'code_comments'], tools: ['doc_generator', 'markdown_editor'], dependencies: [], maxConcurrentTasks: 5, estimatedCostPerTask: 0.15 },
        ];
        agents.forEach(a => this.register(a));
    }
    registerOfficeTeam() {
        const agents = [
            { id: interfaces_1.OfficeAgent.PDF, name: 'PDF Agent', level: interfaces_1.AgentLevel.OFFICE, permanent: false, description: 'Génère des rapports et documents PDF professionnels', skills: ['pdf_generation', 'report_design', 'charts_in_pdf', 'template_engine'], tools: ['pdf_generator', 'chart_renderer'], dependencies: [], maxConcurrentTasks: 5, estimatedCostPerTask: 0.1 },
            { id: interfaces_1.OfficeAgent.DOCX, name: 'DOCX Agent', level: interfaces_1.AgentLevel.OFFICE, permanent: false, description: 'Crée et édite des documents Word', skills: ['docx_generation', 'document_formatting', 'template_filling', 'mail_merge'], tools: ['docx_generator', 'template_engine'], dependencies: [], maxConcurrentTasks: 5, estimatedCostPerTask: 0.1 },
            { id: interfaces_1.OfficeAgent.EXCEL, name: 'Excel Agent', level: interfaces_1.AgentLevel.OFFICE, permanent: false, description: 'Génère des tableurs Excel avec formules et graphiques', skills: ['spreadsheet_generation', 'formula_creation', 'chart_generation', 'data_pivot'], tools: ['excel_generator', 'data_processor'], dependencies: [], maxConcurrentTasks: 5, estimatedCostPerTask: 0.1 },
            { id: interfaces_1.OfficeAgent.POWERPOINT, name: 'PowerPoint Agent', level: interfaces_1.AgentLevel.OFFICE, permanent: false, description: 'Crée des présentations PowerPoint professionnelles', skills: ['presentation_design', 'slide_generation', 'visual_layout', 'animation'], tools: ['pptx_generator', 'design_engine'], dependencies: [], maxConcurrentTasks: 3, estimatedCostPerTask: 0.15 },
            { id: interfaces_1.OfficeAgent.OFFICE_OCR, name: 'Office OCR Agent', level: interfaces_1.AgentLevel.OFFICE, permanent: false, description: 'Extrait le texte de documents scannés et images', skills: ['document_ocr', 'handwriting_recognition', 'table_extraction', 'format_preservation'], tools: ['ocr_engine', 'document_processor'], dependencies: [], maxConcurrentTasks: 5, estimatedCostPerTask: 0.1 },
            { id: interfaces_1.OfficeAgent.SIGNATURE, name: 'Signature Agent', level: interfaces_1.AgentLevel.OFFICE, permanent: false, description: 'Gère les signatures numériques de documents', skills: ['digital_signature', 'document_certification', 'timestamp_authority', 'verification'], tools: ['signature_engine', 'certificate_manager'], dependencies: [], maxConcurrentTasks: 3, estimatedCostPerTask: 0.05 },
        ];
        agents.forEach(a => this.register(a));
    }
    registerBusinessTeam() {
        const agents = [
            { id: interfaces_1.BusinessAgent.SEO, name: 'SEO Agent', level: interfaces_1.AgentLevel.BUSINESS, permanent: false, description: 'Optimise le référencement et la visibilité web', skills: ['seo_optimization', 'keyword_analysis', 'meta_tags', 'sitemap_generation', 'schema_markup'], tools: ['seo_analyzer', 'keyword_tool'], dependencies: [], maxConcurrentTasks: 3, estimatedCostPerTask: 0.2 },
            { id: interfaces_1.BusinessAgent.MARKETING, name: 'Marketing Agent', level: interfaces_1.AgentLevel.BUSINESS, permanent: false, description: 'Crée et gère des campagnes marketing', skills: ['campaign_creation', 'audience_targeting', 'ad_copy', 'budget_allocation', 'a_b_testing'], tools: ['campaign_manager', 'ad_platform_api'], dependencies: [], maxConcurrentTasks: 3, estimatedCostPerTask: 0.25 },
            { id: interfaces_1.BusinessAgent.COPYWRITING, name: 'Copywriting Agent', level: interfaces_1.AgentLevel.BUSINESS, permanent: false, description: 'Rédige du contenu marketing et des copies persuasives', skills: ['content_writing', 'persuasion', 'brand_voice', 'cta_optimization', 'storytelling'], tools: ['text_generator', 'tone_analyzer'], dependencies: [], maxConcurrentTasks: 5, estimatedCostPerTask: 0.15 },
            { id: interfaces_1.BusinessAgent.BRANDING, name: 'Branding Agent', level: interfaces_1.AgentLevel.BUSINESS, permanent: false, description: 'Développe l\'identité de marque et les guidelines', skills: ['brand_identity', 'visual_guidelines', 'tone_of_voice', 'brand_strategy'], tools: ['brand_toolkit', 'style_generator'], dependencies: [], maxConcurrentTasks: 2, estimatedCostPerTask: 0.2 },
            { id: interfaces_1.BusinessAgent.CRM, name: 'CRM Agent', level: interfaces_1.AgentLevel.BUSINESS, permanent: false, description: 'Gère les relations clients et les données CRM', skills: ['crm_management', 'customer_segmentation', 'lead_scoring', 'pipeline_management'], tools: ['crm_api', 'segmentation_engine'], dependencies: [], maxConcurrentTasks: 3, estimatedCostPerTask: 0.15 },
            { id: interfaces_1.BusinessAgent.ANALYTICS, name: 'Analytics Agent', level: interfaces_1.AgentLevel.BUSINESS, permanent: false, description: 'Analyse les données business et génère des insights', skills: ['data_analysis', 'metric_tracking', 'dashboard_creation', 'trend_analysis', 'kpi_reporting'], tools: ['analytics_engine', 'dashboard_builder'], dependencies: [], maxConcurrentTasks: 5, estimatedCostPerTask: 0.15 },
            { id: interfaces_1.BusinessAgent.FINANCE, name: 'Finance Agent', level: interfaces_1.AgentLevel.BUSINESS, permanent: false, description: 'Analyse les données financières et gère les budgets', skills: ['financial_analysis', 'budget_management', 'roi_calculation', 'forecasting'], tools: ['financial_model', 'budget_tracker'], dependencies: [], maxConcurrentTasks: 3, estimatedCostPerTask: 0.2 },
            { id: interfaces_1.BusinessAgent.SALES, name: 'Sales Agent', level: interfaces_1.AgentLevel.BUSINESS, permanent: false, description: 'Gère les processus de vente et les propositions commerciales', skills: ['sales_process', 'proposal_generation', 'pricing_strategy', 'negotiation'], tools: ['proposal_generator', 'pricing_engine'], dependencies: [], maxConcurrentTasks: 3, estimatedCostPerTask: 0.2 },
        ];
        agents.forEach(a => this.register(a));
    }
    registerCertTeam() {
        const agents = [
            { id: interfaces_1.CertAgent.ARCH_CERT, name: 'Architecture Cert Agent', level: interfaces_1.AgentLevel.CERTIFICATION, permanent: false, description: 'Valide l\'architecture technique et les choix de conception', skills: ['architecture_review', 'pattern_validation', 'scalability_check', 'design_principles'], tools: ['architecture_linter', 'dependency_analyzer'], dependencies: [], maxConcurrentTasks: 2, estimatedCostPerTask: 0.2 },
            { id: interfaces_1.CertAgent.SECURITY, name: 'Security Cert Agent', level: interfaces_1.AgentLevel.CERTIFICATION, permanent: false, description: 'Audite la sécurité du code et de l\'infrastructure', skills: ['vulnerability_scanning', 'penetration_testing', 'dependency_audit', 'owasp_compliance'], tools: ['security_scanner', 'vulnerability_db'], dependencies: [], maxConcurrentTasks: 3, estimatedCostPerTask: 0.3 },
            { id: interfaces_1.CertAgent.TESTS, name: 'Test Cert Agent', level: interfaces_1.AgentLevel.CERTIFICATION, permanent: false, description: 'Vérifie la couverture et la qualité des tests', skills: ['coverage_analysis', 'test_quality_review', 'edge_case_detection', 'test_completeness'], tools: ['coverage_analyzer', 'test_linter'], dependencies: [], maxConcurrentTasks: 5, estimatedCostPerTask: 0.15 },
            { id: interfaces_1.CertAgent.REGRESSION, name: 'Regression Cert Agent', level: interfaces_1.AgentLevel.CERTIFICATION, permanent: false, description: 'Vérifie l\'absence de régressions fonctionnelles', skills: ['regression_testing', 'snapshot_testing', 'compatibility_check', 'baseline_comparison'], tools: ['regression_runner', 'snapshot_comparator'], dependencies: [interfaces_1.CertAgent.TESTS], maxConcurrentTasks: 3, estimatedCostPerTask: 0.2 },
            { id: interfaces_1.CertAgent.PERFORMANCE, name: 'Performance Cert Agent', level: interfaces_1.AgentLevel.CERTIFICATION, permanent: false, description: 'Teste les performances et la charge du système', skills: ['load_testing', 'stress_testing', 'benchmarking', 'profiling', 'memory_leak_detection'], tools: ['load_tester', 'profiler'], dependencies: [], maxConcurrentTasks: 2, estimatedCostPerTask: 0.3 },
            { id: interfaces_1.CertAgent.DOCS, name: 'Documentation Cert Agent', level: interfaces_1.AgentLevel.CERTIFICATION, permanent: false, description: 'Valide la complétude et la qualité de la documentation', skills: ['documentation_review', 'completeness_check', 'accuracy_validation', 'readability_score'], tools: ['doc_checker', 'link_validator'], dependencies: [], maxConcurrentTasks: 5, estimatedCostPerTask: 0.1 },
            { id: interfaces_1.CertAgent.INTEGRATION, name: 'Integration Cert Agent', level: interfaces_1.AgentLevel.CERTIFICATION, permanent: false, description: 'Vérifie l\'intégration entre les composants du système', skills: ['integration_testing', 'api_contract_testing', 'end_to_end_validation', 'service_mesh_testing'], tools: ['integration_tester', 'contract_validator'], dependencies: [interfaces_1.CertAgent.TESTS], maxConcurrentTasks: 3, estimatedCostPerTask: 0.2 },
            { id: interfaces_1.CertAgent.COMPLIANCE, name: 'Compliance Cert Agent', level: interfaces_1.AgentLevel.CERTIFICATION, permanent: false, description: 'Vérifie la conformité réglementaire (RGPD, accessibilité, etc.)', skills: ['gdpr_compliance', 'accessibility_audit', 'data_protection', 'regulatory_check'], tools: ['compliance_checker', 'accessibility_auditor'], dependencies: [], maxConcurrentTasks: 3, estimatedCostPerTask: 0.2 },
        ];
        agents.forEach(a => this.register(a));
    }
    registerDeliveryTeam() {
        const agents = [
            { id: interfaces_1.DeliveryAgent.GITHUB, name: 'GitHub Delivery Agent', level: interfaces_1.AgentLevel.DELIVERY, permanent: false, description: 'Pousse le code sur GitHub et gère les releases', skills: ['git_operations', 'github_api', 'release_management', 'branch_strategy'], tools: ['git_cli', 'github_api'], dependencies: [], maxConcurrentTasks: 3, estimatedCostPerTask: 0.05 },
            { id: interfaces_1.DeliveryAgent.DELIVERY_DOCKER, name: 'Docker Delivery Agent', level: interfaces_1.AgentLevel.DELIVERY, permanent: false, description: 'Build et pousse les images Docker sur les registres', skills: ['docker_build', 'docker_push', 'registry_management', 'image_optimization'], tools: ['docker_cli', 'registry_api'], dependencies: [], maxConcurrentTasks: 3, estimatedCostPerTask: 0.1 },
            { id: interfaces_1.DeliveryAgent.VPS, name: 'VPS Delivery Agent', level: interfaces_1.AgentLevel.DELIVERY, permanent: false, description: 'Déploie sur des serveurs VPS dédiés', skills: ['vps_deployment', 'ssh_automation', 'nginx_configuration', 'ssl_setup'], tools: ['ssh_client', 'deploy_script'], dependencies: [], maxConcurrentTasks: 2, estimatedCostPerTask: 0.15 },
            { id: interfaces_1.DeliveryAgent.CLOUD, name: 'Cloud Delivery Agent', level: interfaces_1.AgentLevel.DELIVERY, permanent: false, description: 'Déploie sur les plateformes cloud (AWS, GCP, Azure)', skills: ['aws_deployment', 'gcp_deployment', 'azure_deployment', 'serverless'], tools: ['cloud_cli', 'terraform'], dependencies: [], maxConcurrentTasks: 2, estimatedCostPerTask: 0.2 },
            { id: interfaces_1.DeliveryAgent.ZIP, name: 'ZIP Delivery Agent', level: interfaces_1.AgentLevel.DELIVERY, permanent: false, description: 'Crée des archives ZIP des livrables', skills: ['archive_creation', 'file_organization', 'checksum_generation', 'manifest_creation'], tools: ['archiver', 'checksum_tool'], dependencies: [], maxConcurrentTasks: 5, estimatedCostPerTask: 0.02 },
            { id: interfaces_1.DeliveryAgent.PDF_REPORT, name: 'PDF Report Delivery Agent', level: interfaces_1.AgentLevel.DELIVERY, permanent: false, description: 'Génère le rapport de livraison final en PDF', skills: ['delivery_report', 'summary_generation', 'quality_summary', 'mission_summary'], tools: ['pdf_generator', 'report_engine'], dependencies: [], maxConcurrentTasks: 3, estimatedCostPerTask: 0.1 },
            { id: interfaces_1.DeliveryAgent.NOTIFICATION, name: 'Notification Delivery Agent', level: interfaces_1.AgentLevel.DELIVERY, permanent: false, description: 'Envoie les notifications de livraison (email, webhook, Slack)', skills: ['email_notification', 'webhook_delivery', 'slack_integration', 'status_update'], tools: ['notification_engine', 'email_sender'], dependencies: [], maxConcurrentTasks: 10, estimatedCostPerTask: 0.01 },
            { id: interfaces_1.DeliveryAgent.DEPLOYMENT, name: 'Deployment Delivery Agent', level: interfaces_1.AgentLevel.DELIVERY, permanent: false, description: 'Exécute le déploiement final sur l\'environnement cible', skills: ['deployment_execution', 'health_verification', 'rollback_capability', 'blue_green_deployment'], tools: ['deploy_engine', 'health_checker'], dependencies: [], maxConcurrentTasks: 2, estimatedCostPerTask: 0.15 },
        ];
        agents.forEach(a => this.register(a));
    }
};
exports.AgentRegistryService = AgentRegistryService;
exports.AgentRegistryService = AgentRegistryService = AgentRegistryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], AgentRegistryService);
//# sourceMappingURL=agent-registry.service.js.map