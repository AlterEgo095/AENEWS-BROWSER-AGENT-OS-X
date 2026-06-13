/**
 * AENEWS Software Factory — Agent Registry
 * 
 * Complete definition of all 64 agents across 7 levels.
 * This is the single source of truth for agent capabilities.
 * The AgentPool uses this registry to spawn agents on-demand.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  AgentDefinition,
  AgentLevel,
  CoreAgent,
  BrowserAgent,
  DevAgent,
  OfficeAgent,
  BusinessAgent,
  CertAgent,
  DeliveryAgent,
  SpecializedAgentId,
  TeamComposition,
} from '../interfaces';

@Injectable()
export class AgentRegistryService {
  private readonly logger = new Logger(AgentRegistryService.name);
  private readonly definitions = new Map<SpecializedAgentId, AgentDefinition>();

  constructor() {
    this.registerAllAgents();
    this.logger.log(`Agent Registry initialized: ${this.definitions.size} agents across 7 levels`);
  }

  /**
   * Get an agent definition by ID
   */
  getDefinition(agentId: SpecializedAgentId): AgentDefinition | undefined {
    return this.definitions.get(agentId);
  }

  /**
   * Get all agent definitions
   */
  getAllDefinitions(): AgentDefinition[] {
    return Array.from(this.definitions.values());
  }

  /**
   * Get agents by level
   */
  getByLevel(level: AgentLevel): AgentDefinition[] {
    return Array.from(this.definitions.values()).filter(d => d.level === level);
  }

  /**
   * Get only permanent agents (Core level)
   */
  getPermanentAgents(): AgentDefinition[] {
    return this.getByLevel(AgentLevel.CORE);
  }

  /**
   * Get only on-demand agents
   */
  getOnDemandAgents(): AgentDefinition[] {
    return Array.from(this.definitions.values()).filter(d => !d.permanent);
  }

  /**
   * Get team compositions
   */
  getTeamCompositions(): TeamComposition[] {
    return [
      {
        level: AgentLevel.CORE,
        name: 'Core Orchestration',
        agents: this.getByLevel(AgentLevel.CORE).map(d => d.id),
        total: 10,
        permanent: true,
      },
      {
        level: AgentLevel.BROWSER,
        name: 'Browser Team',
        agents: this.getByLevel(AgentLevel.BROWSER).map(d => d.id),
        total: 12,
        permanent: false,
      },
      {
        level: AgentLevel.DEVELOPMENT,
        name: 'Development Team',
        agents: this.getByLevel(AgentLevel.DEVELOPMENT).map(d => d.id),
        total: 12,
        permanent: false,
      },
      {
        level: AgentLevel.OFFICE,
        name: 'Office Team',
        agents: this.getByLevel(AgentLevel.OFFICE).map(d => d.id),
        total: 6,
        permanent: false,
      },
      {
        level: AgentLevel.BUSINESS,
        name: 'Business Team',
        agents: this.getByLevel(AgentLevel.BUSINESS).map(d => d.id),
        total: 8,
        permanent: false,
      },
      {
        level: AgentLevel.CERTIFICATION,
        name: 'Certification Team',
        agents: this.getByLevel(AgentLevel.CERTIFICATION).map(d => d.id),
        total: 8,
        permanent: false,
      },
      {
        level: AgentLevel.DELIVERY,
        name: 'Delivery Team',
        agents: this.getByLevel(AgentLevel.DELIVERY).map(d => d.id),
        total: 8,
        permanent: false,
      },
    ];
  }

  /**
   * Find agents by skill
   */
  findBySkill(skill: string): AgentDefinition[] {
    return Array.from(this.definitions.values()).filter(d =>
      d.skills.some(s => s.toLowerCase().includes(skill.toLowerCase())),
    );
  }

  /**
   * Find agents needed for a mission based on keywords
   */
  findAgentsForMission(missionDescription: string): AgentDefinition[] {
    const desc = missionDescription.toLowerCase();
    const needed: SpecializedAgentId[] = [];

    // Core agents are always needed for orchestration
    needed.push(CoreAgent.MISSION_ORCHESTRATOR, CoreAgent.MISSION_PLANNER);

    // Browser agents
    if (/navigate|browser|site|web|page|url|http/i.test(desc)) {
      needed.push(BrowserAgent.NAVIGATION, BrowserAgent.SESSION);
    }
    if (/login|auth|sign.?in|connect/i.test(desc)) {
      needed.push(BrowserAgent.LOGIN);
    }
    if (/search|find|recherch/i.test(desc)) {
      needed.push(BrowserAgent.SEARCH);
    }
    if (/form|fill|submit|saisir|remplir/i.test(desc)) {
      needed.push(BrowserAgent.FORM);
    }
    if (/upload|télécharg.*fichier/i.test(desc)) {
      needed.push(BrowserAgent.UPLOAD);
    }
    if (/download|télécharg/i.test(desc)) {
      needed.push(BrowserAgent.DOWNLOAD);
    }
    if (/screenshot|capture|photo/i.test(desc)) {
      needed.push(BrowserAgent.SCREENSHOT);
    }
    if (/vision|analyz.*image|voir/i.test(desc)) {
      needed.push(BrowserAgent.VISION);
    }
    if (/cookie|session/i.test(desc) && !needed.includes(BrowserAgent.SESSION)) {
      needed.push(BrowserAgent.COOKIE);
    }
    if (/popup|pop.?up|alert/i.test(desc)) {
      needed.push(BrowserAgent.POPUP);
    }
    if (/ocr|text.*image|reconnaiss/i.test(desc)) {
      needed.push(BrowserAgent.OCR);
    }

    // Development agents
    if (/créer|create|develop|build|saas|app|application|développ/i.test(desc)) {
      needed.push(DevAgent.ARCHITECT, DevAgent.FRONTEND, DevAgent.BACKEND);
      needed.push(CoreAgent.TASK_SCHEDULER);
    }
    if (/frontend|react|vue|angular|ui|interface/i.test(desc)) {
      needed.push(DevAgent.FRONTEND);
    }
    if (/backend|api|serveur|server/i.test(desc)) {
      needed.push(DevAgent.BACKEND, DevAgent.API);
    }
    if (/database|base.*données|postgres|mysql|mongodb/i.test(desc)) {
      needed.push(DevAgent.DATABASE);
    }
    if (/docker|contain/i.test(desc)) {
      needed.push(DevAgent.DOCKER);
    }
    if (/kubernetes|k8s|orchestrat/i.test(desc)) {
      needed.push(DevAgent.KUBERNETES);
    }
    if (/devops|ci.?cd|pipeline/i.test(desc)) {
      needed.push(DevAgent.DEVOPS);
    }
    if (/test|qa|qualit/i.test(desc)) {
      needed.push(DevAgent.QA, DevAgent.TEST);
    }
    if (/debug|fix|corriger|repair/i.test(desc)) {
      needed.push(DevAgent.DEBUG);
    }
    if (/document|readme|doc/i.test(desc)) {
      needed.push(DevAgent.DOCUMENTATION);
    }

    // Office agents
    if (/pdf|rapport|report/i.test(desc)) {
      needed.push(OfficeAgent.PDF);
    }
    if (/docx|word|document.*trait/i.test(desc)) {
      needed.push(OfficeAgent.DOCX);
    }
    if (/excel|spreadsheet|tableur|csv/i.test(desc)) {
      needed.push(OfficeAgent.EXCEL);
    }
    if (/powerpoint|présentation|slide/i.test(desc)) {
      needed.push(OfficeAgent.POWERPOINT);
    }
    if (/signature|sign.*numériq/i.test(desc)) {
      needed.push(OfficeAgent.SIGNATURE);
    }

    // Business agents
    if (/seo|référenc|search.*engine/i.test(desc)) {
      needed.push(BusinessAgent.SEO);
    }
    if (/marketing|campagne|campaign/i.test(desc)) {
      needed.push(BusinessAgent.MARKETING);
    }
    if (/copywrit|contenu|content.*writ/i.test(desc)) {
      needed.push(BusinessAgent.COPYWRITING);
    }
    if (/brand|marque|identit/i.test(desc)) {
      needed.push(BusinessAgent.BRANDING);
    }
    if (/crm|client|customer/i.test(desc)) {
      needed.push(BusinessAgent.CRM);
    }
    if (/analytics|stat|metric|kpi/i.test(desc)) {
      needed.push(BusinessAgent.ANALYTICS);
    }
    if (/financ|budget|compt/i.test(desc)) {
      needed.push(BusinessAgent.FINANCE);
    }
    if (/sales|vente|commercial/i.test(desc)) {
      needed.push(BusinessAgent.SALES);
    }

    // Certification agents
    if (/audit|certif|sécur|security/i.test(desc) || needed.length > 5) {
      needed.push(CertAgent.SECURITY, CertAgent.TESTS);
      needed.push(CoreAgent.CERTIFICATION_MANAGER);
    }
    if (/performance|load|stress/i.test(desc)) {
      needed.push(CertAgent.PERFORMANCE);
    }
    if (/regression|non.*regress/i.test(desc)) {
      needed.push(CertAgent.REGRESSION);
    }
    if (/compliance|conform|rgpd|gdpr/i.test(desc)) {
      needed.push(CertAgent.COMPLIANCE);
    }

    // Delivery agents
    if (/deploy|déploy|mise.*en.*ligne/i.test(desc)) {
      needed.push(DeliveryAgent.DEPLOYMENT);
      needed.push(CoreAgent.DELIVERY_MANAGER);
    }
    if (/github|git|repo/i.test(desc)) {
      needed.push(DeliveryAgent.GITHUB);
    }
    if (/vps|server|serveur.*dédi/i.test(desc)) {
      needed.push(DeliveryAgent.VPS);
    }
    if (/cloud|aws|gcp|azure/i.test(desc)) {
      needed.push(DeliveryAgent.CLOUD);
    }
    if (/zip|archive|pack/i.test(desc)) {
      needed.push(DeliveryAgent.ZIP);
    }

    // Always add core support agents for complex missions
    if (needed.length > 8) {
      needed.push(CoreAgent.MEMORY_MANAGER, CoreAgent.RESOURCE_MANAGER);
      needed.push(CoreAgent.MONITORING_MANAGER, CoreAgent.RECOVERY_MANAGER);
    }

    // Deduplicate
    const unique = [...new Set(needed)];
    return unique.map(id => this.definitions.get(id)).filter((d): d is AgentDefinition => !!d);
  }

  /**
   * Get total agent count
   */
  getTotalCount(): { permanent: number; onDemand: number; total: number } {
    const permanent = this.getPermanentAgents().length;
    const onDemand = this.getOnDemandAgents().length;
    return { permanent, onDemand, total: permanent + onDemand };
  }

  // ─── Private: Register All 64 Agents ───────────────────────

  private registerAllAgents(): void {
    // ═══════════════════════════════════════════════════════════
    // LEVEL 1: CORE ORCHESTRATION (10 permanent agents)
    // ═══════════════════════════════════════════════════════════
    this.register({
      id: CoreAgent.MISSION_ORCHESTRATOR,
      name: 'Mission Orchestrator',
      level: AgentLevel.CORE,
      permanent: true,
      description: 'Chef d\'orchestre — coordinates all agents and manages mission lifecycle',
      skills: ['orchestration', 'coordination', 'mission_management', 'pipeline_control'],
      tools: ['mission_control', 'pipeline_engine', 'state_machine'],
      dependencies: [],
      maxConcurrentTasks: 5,
      estimatedCostPerTask: 0.1,
    });

    this.register({
      id: CoreAgent.MISSION_PLANNER,
      name: 'Mission Planner',
      level: AgentLevel.CORE,
      permanent: true,
      description: 'Décompose la mission en phases et assigne les agents nécessaires',
      skills: ['mission_decomposition', 'task_planning', 'resource_allocation', 'dependency_analysis'],
      tools: ['planner_engine', 'task_graph', 'gantt_chart'],
      dependencies: [CoreAgent.MISSION_ORCHESTRATOR],
      maxConcurrentTasks: 3,
      estimatedCostPerTask: 0.15,
    });

    this.register({
      id: CoreAgent.TASK_SCHEDULER,
      name: 'Task Scheduler',
      level: AgentLevel.CORE,
      permanent: true,
      description: 'Planifie l\'exécution des tâches dans l\'ordre optimal',
      skills: ['scheduling', 'priority_management', 'parallel_execution', 'deadline_tracking'],
      tools: ['scheduler_engine', 'priority_queue', 'timeline'],
      dependencies: [CoreAgent.MISSION_PLANNER],
      maxConcurrentTasks: 10,
      estimatedCostPerTask: 0.05,
    });

    this.register({
      id: CoreAgent.MEMORY_MANAGER,
      name: 'Memory Manager',
      level: AgentLevel.CORE,
      permanent: true,
      description: 'Gère la mémoire partagée, le contexte mission et l\'historique',
      skills: ['memory_management', 'context_storage', 'rag_pipeline', 'knowledge_retrieval'],
      tools: ['memory_store', 'rag_engine', 'context_cache'],
      dependencies: [],
      maxConcurrentTasks: 20,
      estimatedCostPerTask: 0.02,
    });

    this.register({
      id: CoreAgent.RESOURCE_MANAGER,
      name: 'Resource Manager',
      level: AgentLevel.CORE,
      permanent: true,
      description: 'Choisit les LLM, modèles et outils optimaux pour chaque tâche',
      skills: ['resource_optimization', 'model_selection', 'cost_management', 'load_balancing'],
      tools: ['resource_allocator', 'model_registry', 'cost_tracker'],
      dependencies: [],
      maxConcurrentTasks: 10,
      estimatedCostPerTask: 0.03,
    });

    this.register({
      id: CoreAgent.SECURITY_MANAGER,
      name: 'Security Manager',
      level: AgentLevel.CORE,
      permanent: true,
      description: 'Vérifie les permissions, valide les actions sensibles, applique les règles',
      skills: ['permission_check', 'action_validation', 'constitutional_rules', 'safety_gates'],
      tools: ['permission_engine', 'rule_checker', 'audit_logger'],
      dependencies: [],
      maxConcurrentTasks: 15,
      estimatedCostPerTask: 0.02,
    });

    this.register({
      id: CoreAgent.CERTIFICATION_MANAGER,
      name: 'Certification Manager',
      level: AgentLevel.CORE,
      permanent: true,
      description: 'Lance les audits et valide la qualité avant livraison',
      skills: ['quality_gate', 'audit_coordination', 'certification_workflow', 'compliance_check'],
      tools: ['certification_engine', 'quality_scorer', 'audit_runner'],
      dependencies: [],
      maxConcurrentTasks: 5,
      estimatedCostPerTask: 0.1,
    });

    this.register({
      id: CoreAgent.DELIVERY_MANAGER,
      name: 'Delivery Manager',
      level: AgentLevel.CORE,
      permanent: true,
      description: 'Coordonne la préparation et la livraison des artefacts finaux',
      skills: ['delivery_coordination', 'artifact_packaging', 'client_communication', 'release_management'],
      tools: ['delivery_engine', 'packager', 'release_tracker'],
      dependencies: [],
      maxConcurrentTasks: 5,
      estimatedCostPerTask: 0.08,
    });

    this.register({
      id: CoreAgent.MONITORING_MANAGER,
      name: 'Monitoring Manager',
      level: AgentLevel.CORE,
      permanent: true,
      description: 'Surveille la plateforme, les coûts, les performances et la santé',
      skills: ['platform_monitoring', 'cost_tracking', 'performance_metrics', 'health_checks'],
      tools: ['monitoring_dashboard', 'metrics_collector', 'alerting_engine'],
      dependencies: [],
      maxConcurrentTasks: 20,
      estimatedCostPerTask: 0.01,
    });

    this.register({
      id: CoreAgent.RECOVERY_MANAGER,
      name: 'Recovery Manager',
      level: AgentLevel.CORE,
      permanent: true,
      description: 'Gère les erreurs, les retry, les rollback et la reprise',
      skills: ['error_recovery', 'retry_management', 'rollback_strategy', 'circuit_breaker'],
      tools: ['recovery_engine', 'retry_scheduler', 'rollback_manager'],
      dependencies: [],
      maxConcurrentTasks: 10,
      estimatedCostPerTask: 0.05,
    });

    // ═══════════════════════════════════════════════════════════
    // LEVEL 2: BROWSER TEAM (12 on-demand agents)
    // ═══════════════════════════════════════════════════════════
    this.registerBrowserTeam();

    // ═══════════════════════════════════════════════════════════
    // LEVEL 3: DEVELOPMENT TEAM (12 on-demand agents)
    // ═══════════════════════════════════════════════════════════
    this.registerDevTeam();

    // ═══════════════════════════════════════════════════════════
    // LEVEL 4: OFFICE TEAM (6 on-demand agents)
    // ═══════════════════════════════════════════════════════════
    this.registerOfficeTeam();

    // ═══════════════════════════════════════════════════════════
    // LEVEL 5: BUSINESS TEAM (8 on-demand agents)
    // ═══════════════════════════════════════════════════════════
    this.registerBusinessTeam();

    // ═══════════════════════════════════════════════════════════
    // LEVEL 6: CERTIFICATION TEAM (8 on-demand agents)
    // ═══════════════════════════════════════════════════════════
    this.registerCertTeam();

    // ═══════════════════════════════════════════════════════════
    // LEVEL 7: DELIVERY TEAM (8 on-demand agents)
    // ═══════════════════════════════════════════════════════════
    this.registerDeliveryTeam();
  }

  private register(def: AgentDefinition): void {
    this.definitions.set(def.id, def);
  }

  private registerBrowserTeam(): void {
    const agents: AgentDefinition[] = [
      { id: BrowserAgent.LOGIN, name: 'Login Agent', level: AgentLevel.BROWSER, permanent: false, description: 'Gère les connexions, authentifications et sessions sur les sites web', skills: ['authentication', 'login_automation', '2fa_handling', 'session_management'], tools: ['playwright', 'credential_manager'], dependencies: [BrowserAgent.SESSION], maxConcurrentTasks: 3, estimatedCostPerTask: 0.2 },
      { id: BrowserAgent.NAVIGATION, name: 'Navigation Agent', level: AgentLevel.BROWSER, permanent: false, description: 'Navigue sur les sites, suit les liens, gère l\'historique', skills: ['web_navigation', 'link_following', 'page_traversal', 'url_management'], tools: ['playwright', 'navigation_tracker'], dependencies: [], maxConcurrentTasks: 5, estimatedCostPerTask: 0.15 },
      { id: BrowserAgent.SEARCH, name: 'Search Agent', level: AgentLevel.BROWSER, permanent: false, description: 'Effectue des recherches web, extrait et classe les résultats', skills: ['web_search', 'result_extraction', 'search_engine_automation', 'query_optimization'], tools: ['playwright', 'search_engine_api'], dependencies: [BrowserAgent.NAVIGATION], maxConcurrentTasks: 5, estimatedCostPerTask: 0.15 },
      { id: BrowserAgent.FORM, name: 'Form Agent', level: AgentLevel.BROWSER, permanent: false, description: 'Remplit et soumet des formulaires web automatiquement', skills: ['form_filling', 'field_detection', 'validation_handling', 'submit_automation'], tools: ['playwright', 'form_analyzer'], dependencies: [BrowserAgent.NAVIGATION], maxConcurrentTasks: 3, estimatedCostPerTask: 0.2 },
      { id: BrowserAgent.UPLOAD, name: 'Upload Agent', level: AgentLevel.BROWSER, permanent: false, description: 'Téléverse des fichiers sur des plateformes web', skills: ['file_upload', 'drag_drop_handling', 'multi_file_upload', 'progress_monitoring'], tools: ['playwright', 'file_manager'], dependencies: [BrowserAgent.NAVIGATION], maxConcurrentTasks: 3, estimatedCostPerTask: 0.15 },
      { id: BrowserAgent.DOWNLOAD, name: 'Download Agent', level: AgentLevel.BROWSER, permanent: false, description: 'Télécharge des fichiers depuis des sites web', skills: ['file_download', 'download_monitoring', 'format_detection', 'integrity_check'], tools: ['playwright', 'download_manager'], dependencies: [BrowserAgent.NAVIGATION], maxConcurrentTasks: 5, estimatedCostPerTask: 0.1 },
      { id: BrowserAgent.SCREENSHOT, name: 'Screenshot Agent', level: AgentLevel.BROWSER, permanent: false, description: 'Capture des screenshots de pages web et d\'éléments spécifiques', skills: ['screenshot_capture', 'full_page_screenshot', 'element_screenshot', 'comparison_visual'], tools: ['playwright', 'image_processor'], dependencies: [BrowserAgent.NAVIGATION], maxConcurrentTasks: 10, estimatedCostPerTask: 0.05 },
      { id: BrowserAgent.VISION, name: 'Vision Agent', level: AgentLevel.BROWSER, permanent: false, description: 'Analyse visuellement les pages web avec des modèles de vision', skills: ['visual_analysis', 'layout_understanding', 'element_detection', 'accessibility_audit'], tools: ['vision_model', 'playwright'], dependencies: [BrowserAgent.SCREENSHOT], maxConcurrentTasks: 3, estimatedCostPerTask: 0.3 },
      { id: BrowserAgent.SESSION, name: 'Session Agent', level: AgentLevel.BROWSER, permanent: false, description: 'Gère les sessions navigateur, cookies et état de connexion', skills: ['session_management', 'cookie_handling', 'state_persistence', 'proxy_management'], tools: ['playwright', 'session_store'], dependencies: [], maxConcurrentTasks: 5, estimatedCostPerTask: 0.1 },
      { id: BrowserAgent.COOKIE, name: 'Cookie Agent', level: AgentLevel.BROWSER, permanent: false, description: 'Gère les cookies : acceptation, modification, extraction', skills: ['cookie_management', 'consent_handling', 'cookie_extraction', 'privacy_compliance'], tools: ['playwright', 'cookie_manager'], dependencies: [BrowserAgent.SESSION], maxConcurrentTasks: 5, estimatedCostPerTask: 0.1 },
      { id: BrowserAgent.POPUP, name: 'Popup Agent', level: AgentLevel.BROWSER, permanent: false, description: 'Gère les popups, modals, alerts et dialogues', skills: ['popup_handling', 'dialog_management', 'modal_interaction', 'alert_dismissal'], tools: ['playwright', 'dialog_handler'], dependencies: [BrowserAgent.NAVIGATION], maxConcurrentTasks: 5, estimatedCostPerTask: 0.1 },
      { id: BrowserAgent.OCR, name: 'OCR Agent', level: AgentLevel.BROWSER, permanent: false, description: 'Extrait le texte des images et captures d\'écran web', skills: ['ocr_extraction', 'image_to_text', 'document_scanning', 'captcha_reading'], tools: ['ocr_engine', 'image_processor'], dependencies: [BrowserAgent.SCREENSHOT], maxConcurrentTasks: 5, estimatedCostPerTask: 0.2 },
    ];
    agents.forEach(a => this.register(a));
  }

  private registerDevTeam(): void {
    const agents: AgentDefinition[] = [
      { id: DevAgent.ARCHITECT, name: 'Architect Agent', level: AgentLevel.DEVELOPMENT, permanent: false, description: 'Conçoit l\'architecture technique et choisit les technologies', skills: ['system_design', 'architecture_patterns', 'technology_selection', 'component_diagram'], tools: ['design_tools', 'diagram_generator'], dependencies: [], maxConcurrentTasks: 2, estimatedCostPerTask: 0.3 },
      { id: DevAgent.FRONTEND, name: 'Frontend Agent', level: AgentLevel.DEVELOPMENT, permanent: false, description: 'Développe les interfaces utilisateur avec React/Next.js', skills: ['react', 'nextjs', 'typescript', 'css', 'responsive_design', 'ui_components'], tools: ['code_editor', 'design_system'], dependencies: [DevAgent.ARCHITECT], maxConcurrentTasks: 3, estimatedCostPerTask: 0.4 },
      { id: DevAgent.BACKEND, name: 'Backend Agent', level: AgentLevel.DEVELOPMENT, permanent: false, description: 'Développe les APIs et la logique serveur', skills: ['nodejs', 'nestjs', 'python', 'api_design', 'microservices'], tools: ['code_editor', 'api_tester'], dependencies: [DevAgent.ARCHITECT], maxConcurrentTasks: 3, estimatedCostPerTask: 0.4 },
      { id: DevAgent.DATABASE, name: 'Database Agent', level: AgentLevel.DEVELOPMENT, permanent: false, description: 'Conçoit et implémente les schémas de base de données', skills: ['sql', 'nosql', 'schema_design', 'migration', 'orm', 'prisma'], tools: ['schema_designer', 'migration_tool'], dependencies: [DevAgent.ARCHITECT], maxConcurrentTasks: 2, estimatedCostPerTask: 0.3 },
      { id: DevAgent.API, name: 'API Agent', level: AgentLevel.DEVELOPMENT, permanent: false, description: 'Crée et documente les APIs REST et GraphQL', skills: ['rest_api', 'graphql', 'openapi', 'api_documentation', 'versioning'], tools: ['api_designer', 'swagger_generator'], dependencies: [DevAgent.BACKEND], maxConcurrentTasks: 3, estimatedCostPerTask: 0.3 },
      { id: DevAgent.DEVOPS, name: 'DevOps Agent', level: AgentLevel.DEVELOPMENT, permanent: false, description: 'Configure les pipelines CI/CD et l\'infrastructure', skills: ['cicd', 'github_actions', 'infrastructure_as_code', 'terraform', 'monitoring'], tools: ['pipeline_editor', 'infra_manager'], dependencies: [], maxConcurrentTasks: 2, estimatedCostPerTask: 0.3 },
      { id: DevAgent.DOCKER, name: 'Docker Agent', level: AgentLevel.DEVELOPMENT, permanent: false, description: 'Crée les images Docker et les configurations de conteneurs', skills: ['docker', 'docker_compose', 'containerization', 'multi_stage_build', 'optimization'], tools: ['docker_cli', 'compose_editor'], dependencies: [DevAgent.DEVOPS], maxConcurrentTasks: 3, estimatedCostPerTask: 0.2 },
      { id: DevAgent.KUBERNETES, name: 'Kubernetes Agent', level: AgentLevel.DEVELOPMENT, permanent: false, description: 'Déploie et gère les clusters Kubernetes', skills: ['kubernetes', 'helm', 'kustomize', 'service_mesh', 'scaling'], tools: ['kubectl', 'helm_chart'], dependencies: [DevAgent.DOCKER], maxConcurrentTasks: 2, estimatedCostPerTask: 0.3 },
      { id: DevAgent.QA, name: 'QA Agent', level: AgentLevel.DEVELOPMENT, permanent: false, description: 'Assure la qualité globale du code et des fonctionnalités', skills: ['quality_assurance', 'code_review', 'best_practices', 'linting'], tools: ['linter', 'code_reviewer'], dependencies: [DevAgent.FRONTEND, DevAgent.BACKEND], maxConcurrentTasks: 5, estimatedCostPerTask: 0.15 },
      { id: DevAgent.TEST, name: 'Test Agent', level: AgentLevel.DEVELOPMENT, permanent: false, description: 'Écrit et exécute les tests unitaires, intégration et E2E', skills: ['unit_testing', 'integration_testing', 'e2e_testing', 'jest', 'playwright_test'], tools: ['test_runner', 'coverage_analyzer'], dependencies: [DevAgent.QA], maxConcurrentTasks: 5, estimatedCostPerTask: 0.2 },
      { id: DevAgent.DEBUG, name: 'Debug Agent', level: AgentLevel.DEVELOPMENT, permanent: false, description: 'Analyse et corrige les bugs et erreurs', skills: ['debugging', 'error_analysis', 'log_analysis', 'root_cause_analysis', 'fix_generation'], tools: ['debugger', 'log_analyzer'], dependencies: [], maxConcurrentTasks: 3, estimatedCostPerTask: 0.25 },
      { id: DevAgent.DOCUMENTATION, name: 'Documentation Agent', level: AgentLevel.DEVELOPMENT, permanent: false, description: 'Génère la documentation technique et les READMEs', skills: ['technical_writing', 'readme_generation', 'api_documentation', 'code_comments'], tools: ['doc_generator', 'markdown_editor'], dependencies: [], maxConcurrentTasks: 5, estimatedCostPerTask: 0.15 },
    ];
    agents.forEach(a => this.register(a));
  }

  private registerOfficeTeam(): void {
    const agents: AgentDefinition[] = [
      { id: OfficeAgent.PDF, name: 'PDF Agent', level: AgentLevel.OFFICE, permanent: false, description: 'Génère des rapports et documents PDF professionnels', skills: ['pdf_generation', 'report_design', 'charts_in_pdf', 'template_engine'], tools: ['pdf_generator', 'chart_renderer'], dependencies: [], maxConcurrentTasks: 5, estimatedCostPerTask: 0.1 },
      { id: OfficeAgent.DOCX, name: 'DOCX Agent', level: AgentLevel.OFFICE, permanent: false, description: 'Crée et édite des documents Word', skills: ['docx_generation', 'document_formatting', 'template_filling', 'mail_merge'], tools: ['docx_generator', 'template_engine'], dependencies: [], maxConcurrentTasks: 5, estimatedCostPerTask: 0.1 },
      { id: OfficeAgent.EXCEL, name: 'Excel Agent', level: AgentLevel.OFFICE, permanent: false, description: 'Génère des tableurs Excel avec formules et graphiques', skills: ['spreadsheet_generation', 'formula_creation', 'chart_generation', 'data_pivot'], tools: ['excel_generator', 'data_processor'], dependencies: [], maxConcurrentTasks: 5, estimatedCostPerTask: 0.1 },
      { id: OfficeAgent.POWERPOINT, name: 'PowerPoint Agent', level: AgentLevel.OFFICE, permanent: false, description: 'Crée des présentations PowerPoint professionnelles', skills: ['presentation_design', 'slide_generation', 'visual_layout', 'animation'], tools: ['pptx_generator', 'design_engine'], dependencies: [], maxConcurrentTasks: 3, estimatedCostPerTask: 0.15 },
      { id: OfficeAgent.OFFICE_OCR, name: 'Office OCR Agent', level: AgentLevel.OFFICE, permanent: false, description: 'Extrait le texte de documents scannés et images', skills: ['document_ocr', 'handwriting_recognition', 'table_extraction', 'format_preservation'], tools: ['ocr_engine', 'document_processor'], dependencies: [], maxConcurrentTasks: 5, estimatedCostPerTask: 0.1 },
      { id: OfficeAgent.SIGNATURE, name: 'Signature Agent', level: AgentLevel.OFFICE, permanent: false, description: 'Gère les signatures numériques de documents', skills: ['digital_signature', 'document_certification', 'timestamp_authority', 'verification'], tools: ['signature_engine', 'certificate_manager'], dependencies: [], maxConcurrentTasks: 3, estimatedCostPerTask: 0.05 },
    ];
    agents.forEach(a => this.register(a));
  }

  private registerBusinessTeam(): void {
    const agents: AgentDefinition[] = [
      { id: BusinessAgent.SEO, name: 'SEO Agent', level: AgentLevel.BUSINESS, permanent: false, description: 'Optimise le référencement et la visibilité web', skills: ['seo_optimization', 'keyword_analysis', 'meta_tags', 'sitemap_generation', 'schema_markup'], tools: ['seo_analyzer', 'keyword_tool'], dependencies: [], maxConcurrentTasks: 3, estimatedCostPerTask: 0.2 },
      { id: BusinessAgent.MARKETING, name: 'Marketing Agent', level: AgentLevel.BUSINESS, permanent: false, description: 'Crée et gère des campagnes marketing', skills: ['campaign_creation', 'audience_targeting', 'ad_copy', 'budget_allocation', 'a_b_testing'], tools: ['campaign_manager', 'ad_platform_api'], dependencies: [], maxConcurrentTasks: 3, estimatedCostPerTask: 0.25 },
      { id: BusinessAgent.COPYWRITING, name: 'Copywriting Agent', level: AgentLevel.BUSINESS, permanent: false, description: 'Rédige du contenu marketing et des copies persuasives', skills: ['content_writing', 'persuasion', 'brand_voice', 'cta_optimization', 'storytelling'], tools: ['text_generator', 'tone_analyzer'], dependencies: [], maxConcurrentTasks: 5, estimatedCostPerTask: 0.15 },
      { id: BusinessAgent.BRANDING, name: 'Branding Agent', level: AgentLevel.BUSINESS, permanent: false, description: 'Développe l\'identité de marque et les guidelines', skills: ['brand_identity', 'visual_guidelines', 'tone_of_voice', 'brand_strategy'], tools: ['brand_toolkit', 'style_generator'], dependencies: [], maxConcurrentTasks: 2, estimatedCostPerTask: 0.2 },
      { id: BusinessAgent.CRM, name: 'CRM Agent', level: AgentLevel.BUSINESS, permanent: false, description: 'Gère les relations clients et les données CRM', skills: ['crm_management', 'customer_segmentation', 'lead_scoring', 'pipeline_management'], tools: ['crm_api', 'segmentation_engine'], dependencies: [], maxConcurrentTasks: 3, estimatedCostPerTask: 0.15 },
      { id: BusinessAgent.ANALYTICS, name: 'Analytics Agent', level: AgentLevel.BUSINESS, permanent: false, description: 'Analyse les données business et génère des insights', skills: ['data_analysis', 'metric_tracking', 'dashboard_creation', 'trend_analysis', 'kpi_reporting'], tools: ['analytics_engine', 'dashboard_builder'], dependencies: [], maxConcurrentTasks: 5, estimatedCostPerTask: 0.15 },
      { id: BusinessAgent.FINANCE, name: 'Finance Agent', level: AgentLevel.BUSINESS, permanent: false, description: 'Analyse les données financières et gère les budgets', skills: ['financial_analysis', 'budget_management', 'roi_calculation', 'forecasting'], tools: ['financial_model', 'budget_tracker'], dependencies: [], maxConcurrentTasks: 3, estimatedCostPerTask: 0.2 },
      { id: BusinessAgent.SALES, name: 'Sales Agent', level: AgentLevel.BUSINESS, permanent: false, description: 'Gère les processus de vente et les propositions commerciales', skills: ['sales_process', 'proposal_generation', 'pricing_strategy', 'negotiation'], tools: ['proposal_generator', 'pricing_engine'], dependencies: [], maxConcurrentTasks: 3, estimatedCostPerTask: 0.2 },
    ];
    agents.forEach(a => this.register(a));
  }

  private registerCertTeam(): void {
    const agents: AgentDefinition[] = [
      { id: CertAgent.ARCH_CERT, name: 'Architecture Cert Agent', level: AgentLevel.CERTIFICATION, permanent: false, description: 'Valide l\'architecture technique et les choix de conception', skills: ['architecture_review', 'pattern_validation', 'scalability_check', 'design_principles'], tools: ['architecture_linter', 'dependency_analyzer'], dependencies: [], maxConcurrentTasks: 2, estimatedCostPerTask: 0.2 },
      { id: CertAgent.SECURITY, name: 'Security Cert Agent', level: AgentLevel.CERTIFICATION, permanent: false, description: 'Audite la sécurité du code et de l\'infrastructure', skills: ['vulnerability_scanning', 'penetration_testing', 'dependency_audit', 'owasp_compliance'], tools: ['security_scanner', 'vulnerability_db'], dependencies: [], maxConcurrentTasks: 3, estimatedCostPerTask: 0.3 },
      { id: CertAgent.TESTS, name: 'Test Cert Agent', level: AgentLevel.CERTIFICATION, permanent: false, description: 'Vérifie la couverture et la qualité des tests', skills: ['coverage_analysis', 'test_quality_review', 'edge_case_detection', 'test_completeness'], tools: ['coverage_analyzer', 'test_linter'], dependencies: [], maxConcurrentTasks: 5, estimatedCostPerTask: 0.15 },
      { id: CertAgent.REGRESSION, name: 'Regression Cert Agent', level: AgentLevel.CERTIFICATION, permanent: false, description: 'Vérifie l\'absence de régressions fonctionnelles', skills: ['regression_testing', 'snapshot_testing', 'compatibility_check', 'baseline_comparison'], tools: ['regression_runner', 'snapshot_comparator'], dependencies: [CertAgent.TESTS], maxConcurrentTasks: 3, estimatedCostPerTask: 0.2 },
      { id: CertAgent.PERFORMANCE, name: 'Performance Cert Agent', level: AgentLevel.CERTIFICATION, permanent: false, description: 'Teste les performances et la charge du système', skills: ['load_testing', 'stress_testing', 'benchmarking', 'profiling', 'memory_leak_detection'], tools: ['load_tester', 'profiler'], dependencies: [], maxConcurrentTasks: 2, estimatedCostPerTask: 0.3 },
      { id: CertAgent.DOCS, name: 'Documentation Cert Agent', level: AgentLevel.CERTIFICATION, permanent: false, description: 'Valide la complétude et la qualité de la documentation', skills: ['documentation_review', 'completeness_check', 'accuracy_validation', 'readability_score'], tools: ['doc_checker', 'link_validator'], dependencies: [], maxConcurrentTasks: 5, estimatedCostPerTask: 0.1 },
      { id: CertAgent.INTEGRATION, name: 'Integration Cert Agent', level: AgentLevel.CERTIFICATION, permanent: false, description: 'Vérifie l\'intégration entre les composants du système', skills: ['integration_testing', 'api_contract_testing', 'end_to_end_validation', 'service_mesh_testing'], tools: ['integration_tester', 'contract_validator'], dependencies: [CertAgent.TESTS], maxConcurrentTasks: 3, estimatedCostPerTask: 0.2 },
      { id: CertAgent.COMPLIANCE, name: 'Compliance Cert Agent', level: AgentLevel.CERTIFICATION, permanent: false, description: 'Vérifie la conformité réglementaire (RGPD, accessibilité, etc.)', skills: ['gdpr_compliance', 'accessibility_audit', 'data_protection', 'regulatory_check'], tools: ['compliance_checker', 'accessibility_auditor'], dependencies: [], maxConcurrentTasks: 3, estimatedCostPerTask: 0.2 },
    ];
    agents.forEach(a => this.register(a));
  }

  private registerDeliveryTeam(): void {
    const agents: AgentDefinition[] = [
      { id: DeliveryAgent.GITHUB, name: 'GitHub Delivery Agent', level: AgentLevel.DELIVERY, permanent: false, description: 'Pousse le code sur GitHub et gère les releases', skills: ['git_operations', 'github_api', 'release_management', 'branch_strategy'], tools: ['git_cli', 'github_api'], dependencies: [], maxConcurrentTasks: 3, estimatedCostPerTask: 0.05 },
      { id: DeliveryAgent.DELIVERY_DOCKER, name: 'Docker Delivery Agent', level: AgentLevel.DELIVERY, permanent: false, description: 'Build et pousse les images Docker sur les registres', skills: ['docker_build', 'docker_push', 'registry_management', 'image_optimization'], tools: ['docker_cli', 'registry_api'], dependencies: [], maxConcurrentTasks: 3, estimatedCostPerTask: 0.1 },
      { id: DeliveryAgent.VPS, name: 'VPS Delivery Agent', level: AgentLevel.DELIVERY, permanent: false, description: 'Déploie sur des serveurs VPS dédiés', skills: ['vps_deployment', 'ssh_automation', 'nginx_configuration', 'ssl_setup'], tools: ['ssh_client', 'deploy_script'], dependencies: [], maxConcurrentTasks: 2, estimatedCostPerTask: 0.15 },
      { id: DeliveryAgent.CLOUD, name: 'Cloud Delivery Agent', level: AgentLevel.DELIVERY, permanent: false, description: 'Déploie sur les plateformes cloud (AWS, GCP, Azure)', skills: ['aws_deployment', 'gcp_deployment', 'azure_deployment', 'serverless'], tools: ['cloud_cli', 'terraform'], dependencies: [], maxConcurrentTasks: 2, estimatedCostPerTask: 0.2 },
      { id: DeliveryAgent.ZIP, name: 'ZIP Delivery Agent', level: AgentLevel.DELIVERY, permanent: false, description: 'Crée des archives ZIP des livrables', skills: ['archive_creation', 'file_organization', 'checksum_generation', 'manifest_creation'], tools: ['archiver', 'checksum_tool'], dependencies: [], maxConcurrentTasks: 5, estimatedCostPerTask: 0.02 },
      { id: DeliveryAgent.PDF_REPORT, name: 'PDF Report Delivery Agent', level: AgentLevel.DELIVERY, permanent: false, description: 'Génère le rapport de livraison final en PDF', skills: ['delivery_report', 'summary_generation', 'quality_summary', 'mission_summary'], tools: ['pdf_generator', 'report_engine'], dependencies: [], maxConcurrentTasks: 3, estimatedCostPerTask: 0.1 },
      { id: DeliveryAgent.NOTIFICATION, name: 'Notification Delivery Agent', level: AgentLevel.DELIVERY, permanent: false, description: 'Envoie les notifications de livraison (email, webhook, Slack)', skills: ['email_notification', 'webhook_delivery', 'slack_integration', 'status_update'], tools: ['notification_engine', 'email_sender'], dependencies: [], maxConcurrentTasks: 10, estimatedCostPerTask: 0.01 },
      { id: DeliveryAgent.DEPLOYMENT, name: 'Deployment Delivery Agent', level: AgentLevel.DELIVERY, permanent: false, description: 'Exécute le déploiement final sur l\'environnement cible', skills: ['deployment_execution', 'health_verification', 'rollback_capability', 'blue_green_deployment'], tools: ['deploy_engine', 'health_checker'], dependencies: [], maxConcurrentTasks: 2, estimatedCostPerTask: 0.15 },
    ];
    agents.forEach(a => this.register(a));
  }
}
