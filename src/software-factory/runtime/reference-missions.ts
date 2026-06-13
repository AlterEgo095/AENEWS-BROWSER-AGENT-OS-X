/**
 * AENEWS Software Factory — 100 Reference Missions
 *
 * These missions validate the platform across all 6 capability packs:
 *   Browser (10), Development (30), Office (20), Business (15), Certification (10), Delivery (15)
 *
 * Usage: ReferenceMissions.ALL — full list
 *        ReferenceMissions.getByCategory(cat) — filtered
 *        ReferenceMissions.getRandom(n) — random selection for testing
 */

import { MissionCategory } from './mission-metrics.service';

export interface ReferenceMission {
  id: number;
  instruction: string; // Natural language instruction
  category: MissionCategory;
  capabilityPack: 'browser' | 'development' | 'office' | 'business' | 'certification' | 'delivery';
  difficulty: 'easy' | 'medium' | 'hard';
  expectedArtifacts: string[]; // Minimum expected deliverables
  tags: string[];
}

export class ReferenceMissions {
  static readonly ALL: ReferenceMission[] = [
    // ═══════════════════════════════════════════════════════════
    //  BROWSER PACK (10 missions) — browser.navigate, browser.scrape, browser.screenshot, etc.
    // ═══════════════════════════════════════════════════════════
    {
      id: 1,
      instruction: 'Scrape les prix des produits sur Amazon pour "laptop"',
      category: MissionCategory.AUTOMATION,
      capabilityPack: 'browser',
      difficulty: 'medium',
      expectedArtifacts: ['scraper.js', 'results.json', 'README.md'],
      tags: ['scraping', 'ecommerce', 'prices'],
    },
    {
      id: 2,
      instruction: 'Prend un screenshot de google.com et sauvegarde-le',
      category: MissionCategory.AUTOMATION,
      capabilityPack: 'browser',
      difficulty: 'easy',
      expectedArtifacts: ['screenshot.js', 'screenshot.png', 'README.md'],
      tags: ['screenshot', 'browser'],
    },
    {
      id: 3,
      instruction: 'Automatise la connexion à Facebook et poste un message',
      category: MissionCategory.AUTOMATION,
      capabilityPack: 'browser',
      difficulty: 'hard',
      expectedArtifacts: ['facebook-bot.js', 'config.json', 'README.md'],
      tags: ['facebook', 'automation', 'social'],
    },
    {
      id: 4,
      instruction: "Navigue sur 5 sites d'actualités et extrait les titres",
      category: MissionCategory.AUTOMATION,
      capabilityPack: 'browser',
      difficulty: 'medium',
      expectedArtifacts: ['news-scraper.js', 'headlines.json', 'README.md'],
      tags: ['scraping', 'news', 'browser'],
    },
    {
      id: 5,
      instruction: 'Remplis automatiquement un formulaire web avec des données',
      category: MissionCategory.AUTOMATION,
      capabilityPack: 'browser',
      difficulty: 'medium',
      expectedArtifacts: ['form-filler.js', 'data.json', 'README.md'],
      tags: ['automation', 'forms'],
    },
    {
      id: 6,
      instruction: 'Fais une recherche Google et extrais les 10 premiers résultats',
      category: MissionCategory.AUTOMATION,
      capabilityPack: 'browser',
      difficulty: 'easy',
      expectedArtifacts: ['google-search.js', 'results.json', 'README.md'],
      tags: ['google', 'search', 'scraping'],
    },
    {
      id: 7,
      instruction: 'Surveille un site web pour des changements de prix',
      category: MissionCategory.AUTOMATION,
      capabilityPack: 'browser',
      difficulty: 'hard',
      expectedArtifacts: ['price-monitor.js', 'config.json', 'README.md'],
      tags: ['monitoring', 'prices'],
    },
    {
      id: 8,
      instruction: 'Automatise des tests end-to-end sur une page web de login',
      category: MissionCategory.AUTOMATION,
      capabilityPack: 'browser',
      difficulty: 'medium',
      expectedArtifacts: ['e2e-test.js', 'README.md'],
      tags: ['testing', 'e2e', 'browser'],
    },
    {
      id: 9,
      instruction: 'Capture les données météo depuis 3 sites différents',
      category: MissionCategory.AUTOMATION,
      capabilityPack: 'browser',
      difficulty: 'medium',
      expectedArtifacts: ['weather-scraper.js', 'weather-data.json', 'README.md'],
      tags: ['weather', 'scraping'],
    },
    {
      id: 10,
      instruction: 'Automatise le téléchargement de fichiers depuis un portail',
      category: MissionCategory.AUTOMATION,
      capabilityPack: 'browser',
      difficulty: 'hard',
      expectedArtifacts: ['downloader.js', 'config.json', 'README.md'],
      tags: ['download', 'automation'],
    },

    // ═══════════════════════════════════════════════════════════
    //  DEVELOPMENT PACK (30 missions) — dev.frontend, dev.backend, dev.database, dev.test, etc.
    // ═══════════════════════════════════════════════════════════
    {
      id: 11,
      instruction: 'Crée une landing page moderne pour une startup IA',
      category: MissionCategory.LANDING_PAGE,
      capabilityPack: 'development',
      difficulty: 'easy',
      expectedArtifacts: ['index.html', 'style.css', 'app.js', 'README.md', 'Dockerfile'],
      tags: ['landing', 'startup', 'ai'],
    },
    {
      id: 12,
      instruction: 'Développe une application Todo List avec localStorage',
      category: MissionCategory.WEB_APP,
      capabilityPack: 'development',
      difficulty: 'easy',
      expectedArtifacts: ['index.html', 'style.css', 'app.js', 'tests/test.js', 'README.md'],
      tags: ['todo', 'crud', 'frontend'],
    },
    {
      id: 13,
      instruction: 'Construis une API REST pour gérer des utilisateurs',
      category: MissionCategory.API,
      capabilityPack: 'development',
      difficulty: 'medium',
      expectedArtifacts: ['server.js', 'routes.js', 'package.json', 'Dockerfile'],
      tags: ['api', 'rest', 'users'],
    },
    {
      id: 14,
      instruction: 'Crée un CRM simple avec interface web',
      category: MissionCategory.SAAS,
      capabilityPack: 'development',
      difficulty: 'hard',
      expectedArtifacts: ['index.html', 'app.js', 'server.js', 'package.json'],
      tags: ['crm', 'saas', 'web'],
    },
    {
      id: 15,
      instruction: 'Développe un mini ERP avec gestion de stock',
      category: MissionCategory.SAAS,
      capabilityPack: 'development',
      difficulty: 'hard',
      expectedArtifacts: ['index.html', 'server.js', 'database.js', 'package.json'],
      tags: ['erp', 'stock', 'saas'],
    },
    {
      id: 16,
      instruction: 'Construis un site e-commerce avec panier',
      category: MissionCategory.ECOMMERCE,
      capabilityPack: 'development',
      difficulty: 'hard',
      expectedArtifacts: ['index.html', 'style.css', 'app.js', 'server.js', 'package.json'],
      tags: ['ecommerce', 'cart', 'shop'],
    },
    {
      id: 17,
      instruction: 'Crée un portfolio personnel responsive',
      category: MissionCategory.PORTFOLIO,
      capabilityPack: 'development',
      difficulty: 'easy',
      expectedArtifacts: ['index.html', 'style.css', 'app.js', 'README.md'],
      tags: ['portfolio', 'responsive', 'personal'],
    },
    {
      id: 18,
      instruction: 'Développe un chatbot en JavaScript',
      category: MissionCategory.CHATBOT,
      capabilityPack: 'development',
      difficulty: 'medium',
      expectedArtifacts: ['chatbot.js', 'index.html', 'package.json'],
      tags: ['chatbot', 'ai', 'interface'],
    },
    {
      id: 19,
      instruction: 'Construis un générateur de mots de passe sécurisé',
      category: MissionCategory.TOOL,
      capabilityPack: 'development',
      difficulty: 'easy',
      expectedArtifacts: ['index.html', 'app.js', 'tests/test.js', 'README.md'],
      tags: ['password', 'security', 'generator'],
    },
    {
      id: 20,
      instruction: 'Crée un convertisseur de devises en temps réel',
      category: MissionCategory.WEB_APP,
      capabilityPack: 'development',
      difficulty: 'medium',
      expectedArtifacts: ['index.html', 'app.js', 'package.json', 'README.md'],
      tags: ['converter', 'currency', 'api'],
    },
    {
      id: 21,
      instruction: 'Développe un dashboard de analytics avec graphiques',
      category: MissionCategory.WEB_APP,
      capabilityPack: 'development',
      difficulty: 'medium',
      expectedArtifacts: ['index.html', 'app.js', 'chart.js', 'README.md'],
      tags: ['dashboard', 'analytics', 'charts'],
    },
    {
      id: 22,
      instruction: 'Construis un système de blog avec CMS',
      category: MissionCategory.WEB_APP,
      capabilityPack: 'development',
      difficulty: 'hard',
      expectedArtifacts: ['index.html', 'admin.html', 'server.js', 'package.json'],
      tags: ['blog', 'cms', 'content'],
    },
    {
      id: 23,
      instruction: "Crée un calculateur d'impôts en ligne",
      category: MissionCategory.WEB_APP,
      capabilityPack: 'development',
      difficulty: 'medium',
      expectedArtifacts: ['index.html', 'app.js', 'tax-rates.json', 'README.md'],
      tags: ['calculator', 'tax', 'finance'],
    },
    {
      id: 24,
      instruction: 'Développe un gestionnaire de tâches type Kanban',
      category: MissionCategory.WEB_APP,
      capabilityPack: 'development',
      difficulty: 'medium',
      expectedArtifacts: ['index.html', 'style.css', 'app.js', 'README.md'],
      tags: ['kanban', 'tasks', 'project'],
    },
    {
      id: 25,
      instruction: 'Construis un lecteur de flux RSS',
      category: MissionCategory.WEB_APP,
      capabilityPack: 'development',
      difficulty: 'medium',
      expectedArtifacts: ['index.html', 'app.js', 'server.js', 'package.json'],
      tags: ['rss', 'reader', 'feed'],
    },
    {
      id: 26,
      instruction: 'Crée un outil de markdown editor avec preview',
      category: MissionCategory.TOOL,
      capabilityPack: 'development',
      difficulty: 'medium',
      expectedArtifacts: ['index.html', 'app.js', 'README.md'],
      tags: ['markdown', 'editor', 'preview'],
    },
    {
      id: 27,
      instruction: 'Développe un système de quiz interactif',
      category: MissionCategory.WEB_APP,
      capabilityPack: 'development',
      difficulty: 'easy',
      expectedArtifacts: ['index.html', 'app.js', 'questions.json', 'README.md'],
      tags: ['quiz', 'interactive', 'education'],
    },
    {
      id: 28,
      instruction: 'Construis un générateur de CV en ligne',
      category: MissionCategory.WEB_APP,
      capabilityPack: 'development',
      difficulty: 'medium',
      expectedArtifacts: ['index.html', 'app.js', 'style.css', 'README.md'],
      tags: ['cv', 'resume', 'generator'],
    },
    {
      id: 29,
      instruction: 'Crée un gestionnaire de contacts avec CRUD',
      category: MissionCategory.WEB_APP,
      capabilityPack: 'development',
      difficulty: 'easy',
      expectedArtifacts: ['index.html', 'app.js', 'README.md'],
      tags: ['contacts', 'crud', 'manager'],
    },
    {
      id: 30,
      instruction: 'Développe une app de suivi de dépenses',
      category: MissionCategory.WEB_APP,
      capabilityPack: 'development',
      difficulty: 'medium',
      expectedArtifacts: ['index.html', 'app.js', 'style.css', 'README.md'],
      tags: ['expenses', 'tracker', 'finance'],
    },
    {
      id: 31,
      instruction: 'Construis un outil de planification de projet',
      category: MissionCategory.WEB_APP,
      capabilityPack: 'development',
      difficulty: 'hard',
      expectedArtifacts: ['index.html', 'app.js', 'server.js', 'package.json'],
      tags: ['planning', 'project', 'gantt'],
    },
    {
      id: 32,
      instruction: 'Crée un système de vote en ligne',
      category: MissionCategory.WEB_APP,
      capabilityPack: 'development',
      difficulty: 'medium',
      expectedArtifacts: ['index.html', 'server.js', 'app.js', 'package.json'],
      tags: ['voting', 'poll', 'election'],
    },
    {
      id: 33,
      instruction: "Développe un éditeur d'images basique dans le navigateur",
      category: MissionCategory.WEB_APP,
      capabilityPack: 'development',
      difficulty: 'hard',
      expectedArtifacts: ['index.html', 'editor.js', 'style.css', 'README.md'],
      tags: ['image', 'editor', 'canvas'],
    },
    {
      id: 34,
      instruction: 'Construis un clone de Twitter simplifié',
      category: MissionCategory.WEB_APP,
      capabilityPack: 'development',
      difficulty: 'hard',
      expectedArtifacts: ['index.html', 'server.js', 'app.js', 'package.json'],
      tags: ['social', 'twitter', 'clone'],
    },
    {
      id: 35,
      instruction: 'Crée une app de gestion de recettes de cuisine',
      category: MissionCategory.WEB_APP,
      capabilityPack: 'development',
      difficulty: 'medium',
      expectedArtifacts: ['index.html', 'app.js', 'recipes.json', 'README.md'],
      tags: ['recipes', 'cooking', 'manager'],
    },
    {
      id: 36,
      instruction: 'Développe un Pomodoro timer avec statistiques',
      category: MissionCategory.WEB_APP,
      capabilityPack: 'development',
      difficulty: 'easy',
      expectedArtifacts: ['index.html', 'app.js', 'style.css', 'README.md'],
      tags: ['pomodoro', 'timer', 'productivity'],
    },
    {
      id: 37,
      instruction: 'Construis un visualiseur de données JSON',
      category: MissionCategory.TOOL,
      capabilityPack: 'development',
      difficulty: 'medium',
      expectedArtifacts: ['index.html', 'app.js', 'README.md'],
      tags: ['json', 'visualizer', 'data'],
    },
    {
      id: 38,
      instruction: 'Crée un système de réservation en ligne',
      category: MissionCategory.SAAS,
      capabilityPack: 'development',
      difficulty: 'hard',
      expectedArtifacts: ['index.html', 'server.js', 'app.js', 'package.json'],
      tags: ['booking', 'reservation', 'saas'],
    },
    {
      id: 39,
      instruction: 'Développe un outil de diagramme de Gantt',
      category: MissionCategory.WEB_APP,
      capabilityPack: 'development',
      difficulty: 'hard',
      expectedArtifacts: ['index.html', 'gantt.js', 'style.css', 'README.md'],
      tags: ['gantt', 'planning', 'diagram'],
    },
    {
      id: 40,
      instruction: 'Construis un client email simplifié',
      category: MissionCategory.WEB_APP,
      capabilityPack: 'development',
      difficulty: 'hard',
      expectedArtifacts: ['index.html', 'server.js', 'app.js', 'package.json'],
      tags: ['email', 'client', 'messaging'],
    },

    // ═══════════════════════════════════════════════════════════
    //  OFFICE PACK (20 missions) — office.document, office.spreadsheet, office.presentation, etc.
    // ═══════════════════════════════════════════════════════════
    {
      id: 41,
      instruction: 'Génère un rapport PDF de performance mensuelle',
      category: MissionCategory.DOCUMENT,
      capabilityPack: 'office',
      difficulty: 'medium',
      expectedArtifacts: ['report.pdf', 'data.json', 'README.md'],
      tags: ['pdf', 'report', 'performance'],
    },
    {
      id: 42,
      instruction: 'Crée une présentation PPTX pour un pitch investisseur',
      category: MissionCategory.DOCUMENT,
      capabilityPack: 'office',
      difficulty: 'hard',
      expectedArtifacts: ['pitch.pptx', 'README.md'],
      tags: ['pptx', 'pitch', 'investor'],
    },
    {
      id: 43,
      instruction: 'Génère un tableur Excel avec analyse de ventes',
      category: MissionCategory.DOCUMENT,
      capabilityPack: 'office',
      difficulty: 'medium',
      expectedArtifacts: ['sales-report.xlsx', 'README.md'],
      tags: ['xlsx', 'sales', 'analysis'],
    },
    {
      id: 44,
      instruction: 'Crée un document Word de spécifications techniques',
      category: MissionCategory.DOCUMENT,
      capabilityPack: 'office',
      difficulty: 'medium',
      expectedArtifacts: ['specs.docx', 'README.md'],
      tags: ['docx', 'specifications', 'technical'],
    },
    {
      id: 45,
      instruction: 'Génère une facture PDF professionnelle',
      category: MissionCategory.DOCUMENT,
      capabilityPack: 'office',
      difficulty: 'easy',
      expectedArtifacts: ['invoice.pdf', 'README.md'],
      tags: ['pdf', 'invoice', 'finance'],
    },
    {
      id: 46,
      instruction: 'Crée un CV professionnel en PDF',
      category: MissionCategory.DOCUMENT,
      capabilityPack: 'office',
      difficulty: 'easy',
      expectedArtifacts: ['cv.pdf', 'README.md'],
      tags: ['pdf', 'cv', 'professional'],
    },
    {
      id: 47,
      instruction: "Génère un rapport d'audit SEO en PDF",
      category: MissionCategory.AUDIT,
      capabilityPack: 'office',
      difficulty: 'medium',
      expectedArtifacts: ['seo-audit.pdf', 'data.json', 'README.md'],
      tags: ['seo', 'audit', 'pdf'],
    },
    {
      id: 48,
      instruction: 'Crée un tableau de bord Excel avec KPIs',
      category: MissionCategory.DOCUMENT,
      capabilityPack: 'office',
      difficulty: 'hard',
      expectedArtifacts: ['dashboard.xlsx', 'README.md'],
      tags: ['xlsx', 'dashboard', 'kpi'],
    },
    {
      id: 49,
      instruction: 'Génère un contrat de travail en PDF',
      category: MissionCategory.DOCUMENT,
      capabilityPack: 'office',
      difficulty: 'medium',
      expectedArtifacts: ['contract.pdf', 'README.md'],
      tags: ['pdf', 'contract', 'legal'],
    },
    {
      id: 50,
      instruction: 'Crée un business plan en format document',
      category: MissionCategory.DOCUMENT,
      capabilityPack: 'office',
      difficulty: 'hard',
      expectedArtifacts: ['business-plan.docx', 'README.md'],
      tags: ['docx', 'business', 'plan'],
    },
    {
      id: 51,
      instruction: 'Génère une fiche produit e-commerce en PDF',
      category: MissionCategory.DOCUMENT,
      capabilityPack: 'office',
      difficulty: 'easy',
      expectedArtifacts: ['product-sheet.pdf', 'README.md'],
      tags: ['pdf', 'product', 'ecommerce'],
    },
    {
      id: 52,
      instruction: 'Crée un manuel utilisateur en format document',
      category: MissionCategory.DOCUMENT,
      capabilityPack: 'office',
      difficulty: 'hard',
      expectedArtifacts: ['user-manual.docx', 'README.md'],
      tags: ['docx', 'manual', 'documentation'],
    },
    {
      id: 53,
      instruction: 'Génère un planning Excel de projet',
      category: MissionCategory.DOCUMENT,
      capabilityPack: 'office',
      difficulty: 'medium',
      expectedArtifacts: ['planning.xlsx', 'README.md'],
      tags: ['xlsx', 'planning', 'project'],
    },
    {
      id: 54,
      instruction: 'Crée une proposition commerciale en PDF',
      category: MissionCategory.DOCUMENT,
      capabilityPack: 'office',
      difficulty: 'medium',
      expectedArtifacts: ['proposal.pdf', 'README.md'],
      tags: ['pdf', 'proposal', 'commercial'],
    },
    {
      id: 55,
      instruction: 'Génère un rapport financier trimestriel en Excel',
      category: MissionCategory.DOCUMENT,
      capabilityPack: 'office',
      difficulty: 'hard',
      expectedArtifacts: ['financial-report.xlsx', 'README.md'],
      tags: ['xlsx', 'financial', 'report'],
    },
    {
      id: 56,
      instruction: "Crée un guide d'onboarding en document",
      category: MissionCategory.DOCUMENT,
      capabilityPack: 'office',
      difficulty: 'medium',
      expectedArtifacts: ['onboarding.docx', 'README.md'],
      tags: ['docx', 'onboarding', 'hr'],
    },
    {
      id: 57,
      instruction: 'Génère un organigramme en présentation',
      category: MissionCategory.DOCUMENT,
      capabilityPack: 'office',
      difficulty: 'medium',
      expectedArtifacts: ['org-chart.pptx', 'README.md'],
      tags: ['pptx', 'org-chart', 'structure'],
    },
    {
      id: 58,
      instruction: 'Crée un formulaire de feedback en PDF',
      category: MissionCategory.DOCUMENT,
      capabilityPack: 'office',
      difficulty: 'easy',
      expectedArtifacts: ['feedback-form.pdf', 'README.md'],
      tags: ['pdf', 'form', 'feedback'],
    },
    {
      id: 59,
      instruction: 'Génère un cahier des charges en document',
      category: MissionCategory.DOCUMENT,
      capabilityPack: 'office',
      difficulty: 'hard',
      expectedArtifacts: ['specifications.docx', 'README.md'],
      tags: ['docx', 'specifications', 'requirements'],
    },
    {
      id: 60,
      instruction: "Crée un rapport d'analyse de marché en PDF",
      category: MissionCategory.AUDIT,
      capabilityPack: 'office',
      difficulty: 'hard',
      expectedArtifacts: ['market-analysis.pdf', 'data.json', 'README.md'],
      tags: ['pdf', 'market', 'analysis'],
    },

    // ═══════════════════════════════════════════════════════════
    //  BUSINESS PACK (15 missions) — business.seo, business.marketing, business.analytics, etc.
    // ═══════════════════════════════════════════════════════════
    {
      id: 61,
      instruction: "Fais un audit SEO complet d'un site web",
      category: MissionCategory.AUDIT,
      capabilityPack: 'business',
      difficulty: 'hard',
      expectedArtifacts: ['seo-audit.json', 'recommendations.md', 'README.md'],
      tags: ['seo', 'audit', 'website'],
    },
    {
      id: 62,
      instruction: 'Analyse une campagne Facebook Ads',
      category: MissionCategory.AUDIT,
      capabilityPack: 'business',
      difficulty: 'medium',
      expectedArtifacts: ['fb-analysis.json', 'report.md', 'README.md'],
      tags: ['facebook', 'ads', 'marketing'],
    },
    {
      id: 63,
      instruction: 'Crée une stratégie de contenu social media',
      category: MissionCategory.AUDIT,
      capabilityPack: 'business',
      difficulty: 'medium',
      expectedArtifacts: ['content-strategy.md', 'calendar.json', 'README.md'],
      tags: ['social', 'content', 'strategy'],
    },
    {
      id: 64,
      instruction: "Génère un rapport d'analyse concurrentielle",
      category: MissionCategory.AUDIT,
      capabilityPack: 'business',
      difficulty: 'hard',
      expectedArtifacts: ['competitive-analysis.md', 'data.json', 'README.md'],
      tags: ['competitive', 'analysis', 'market'],
    },
    {
      id: 65,
      instruction: 'Crée un plan marketing digital pour 6 mois',
      category: MissionCategory.AUDIT,
      capabilityPack: 'business',
      difficulty: 'hard',
      expectedArtifacts: ['marketing-plan.md', 'timeline.json', 'README.md'],
      tags: ['marketing', 'digital', 'plan'],
    },
    {
      id: 66,
      instruction: "Analyse les métriques d'un site e-commerce",
      category: MissionCategory.AUDIT,
      capabilityPack: 'business',
      difficulty: 'medium',
      expectedArtifacts: ['metrics-analysis.json', 'report.md', 'README.md'],
      tags: ['ecommerce', 'metrics', 'analytics'],
    },
    {
      id: 67,
      instruction: 'Génère des recommandations pour améliorer le taux de conversion',
      category: MissionCategory.AUDIT,
      capabilityPack: 'business',
      difficulty: 'medium',
      expectedArtifacts: ['cro-recommendations.md', 'data.json', 'README.md'],
      tags: ['cro', 'conversion', 'optimization'],
    },
    {
      id: 68,
      instruction: 'Fais un audit de performance Google Ads',
      category: MissionCategory.AUDIT,
      capabilityPack: 'business',
      difficulty: 'medium',
      expectedArtifacts: ['ads-audit.json', 'recommendations.md', 'README.md'],
      tags: ['google', 'ads', 'audit'],
    },
    {
      id: 69,
      instruction: 'Crée une campagne email marketing',
      category: MissionCategory.AUDIT,
      capabilityPack: 'business',
      difficulty: 'medium',
      expectedArtifacts: ['email-campaign.json', 'templates.html', 'README.md'],
      tags: ['email', 'marketing', 'campaign'],
    },
    {
      id: 70,
      instruction: "Analyse le ROI d'une campagne marketing",
      category: MissionCategory.AUDIT,
      capabilityPack: 'business',
      difficulty: 'medium',
      expectedArtifacts: ['roi-analysis.json', 'report.md', 'README.md'],
      tags: ['roi', 'marketing', 'analysis'],
    },
    {
      id: 71,
      instruction: 'Crée un guide de branding pour une startup',
      category: MissionCategory.DOCUMENT,
      capabilityPack: 'business',
      difficulty: 'hard',
      expectedArtifacts: ['brand-guide.md', 'README.md'],
      tags: ['branding', 'startup', 'guide'],
    },
    {
      id: 72,
      instruction: 'Génère une analyse SWOT pour un projet',
      category: MissionCategory.AUDIT,
      capabilityPack: 'business',
      difficulty: 'easy',
      expectedArtifacts: ['swot-analysis.md', 'README.md'],
      tags: ['swot', 'analysis', 'strategy'],
    },
    {
      id: 73,
      instruction: 'Crée un pitch deck pour levée de fonds',
      category: MissionCategory.DOCUMENT,
      capabilityPack: 'business',
      difficulty: 'hard',
      expectedArtifacts: ['pitch-deck.pptx', 'README.md'],
      tags: ['pitch', 'fundraising', 'deck'],
    },
    {
      id: 74,
      instruction: 'Analyse les tendances du marché IA en 2024',
      category: MissionCategory.AUDIT,
      capabilityPack: 'business',
      difficulty: 'hard',
      expectedArtifacts: ['market-trends.md', 'data.json', 'README.md'],
      tags: ['ai', 'trends', 'market'],
    },
    {
      id: 75,
      instruction: 'Crée une stratégie de growth hacking',
      category: MissionCategory.AUDIT,
      capabilityPack: 'business',
      difficulty: 'hard',
      expectedArtifacts: ['growth-strategy.md', 'experiments.json', 'README.md'],
      tags: ['growth', 'hacking', 'strategy'],
    },

    // ═══════════════════════════════════════════════════════════
    //  CERTIFICATION PACK (10 missions) — cert.lint, cert.build, cert.test, cert.security, etc.
    // ═══════════════════════════════════════════════════════════
    {
      id: 76,
      instruction: 'Crée un README.md professionnel pour un projet Node.js',
      category: MissionCategory.DOCUMENT,
      capabilityPack: 'certification',
      difficulty: 'easy',
      expectedArtifacts: ['README.md', 'package.json'],
      tags: ['readme', 'documentation', 'node'],
    },
    {
      id: 77,
      instruction: 'Génère une spécification OpenAPI pour une API REST',
      category: MissionCategory.DOCUMENT,
      capabilityPack: 'certification',
      difficulty: 'medium',
      expectedArtifacts: ['openapi.yaml', 'README.md'],
      tags: ['openapi', 'spec', 'rest'],
    },
    {
      id: 78,
      instruction: 'Écris une suite de tests unitaires pour une app Todo',
      category: MissionCategory.WEB_APP,
      capabilityPack: 'certification',
      difficulty: 'medium',
      expectedArtifacts: ['tests/', 'README.md'],
      tags: ['tests', 'unit', 'todo'],
    },
    {
      id: 79,
      instruction: "Fais un audit de sécurité d'une application web",
      category: MissionCategory.AUDIT,
      capabilityPack: 'certification',
      difficulty: 'hard',
      expectedArtifacts: ['security-audit.md', 'vulnerabilities.json', 'README.md'],
      tags: ['security', 'audit', 'web'],
    },
    {
      id: 80,
      instruction: 'Génère une documentation technique complète avec JSDoc',
      category: MissionCategory.DOCUMENT,
      capabilityPack: 'certification',
      difficulty: 'medium',
      expectedArtifacts: ['docs/', 'README.md'],
      tags: ['documentation', 'jsdoc', 'technical'],
    },
    {
      id: 81,
      instruction: 'Crée un Dockerfile optimisé multi-stage pour une app Node.js',
      category: MissionCategory.DEPLOYMENT,
      capabilityPack: 'certification',
      difficulty: 'medium',
      expectedArtifacts: ['Dockerfile', 'docker-compose.yml', '.dockerignore'],
      tags: ['docker', 'optimization', 'node'],
    },
    {
      id: 82,
      instruction: 'Mets en place un pipeline CI/CD GitHub Actions',
      category: MissionCategory.DEPLOYMENT,
      capabilityPack: 'certification',
      difficulty: 'hard',
      expectedArtifacts: ['.github/workflows/ci.yml', 'README.md'],
      tags: ['ci/cd', 'github', 'pipeline'],
    },
    {
      id: 83,
      instruction: 'Génère des tests de performance avec k6',
      category: MissionCategory.AUDIT,
      capabilityPack: 'certification',
      difficulty: 'medium',
      expectedArtifacts: ['performance-test.js', 'README.md'],
      tags: ['performance', 'k6', 'testing'],
    },
    {
      id: 84,
      instruction: 'Crée un rapport de conformité RGPD',
      category: MissionCategory.DOCUMENT,
      capabilityPack: 'certification',
      difficulty: 'hard',
      expectedArtifacts: ['gdpr-compliance.md', 'checklist.json', 'README.md'],
      tags: ['gdpr', 'compliance', 'legal'],
    },
    {
      id: 85,
      instruction: 'Génère une checklist de qualité code',
      category: MissionCategory.DOCUMENT,
      capabilityPack: 'certification',
      difficulty: 'easy',
      expectedArtifacts: ['quality-checklist.md', 'README.md'],
      tags: ['quality', 'checklist', 'code'],
    },

    // ═══════════════════════════════════════════════════════════
    //  DELIVERY PACK (15 missions) — delivery.github, delivery.zip, delivery.vps, delivery.docker, etc.
    // ═══════════════════════════════════════════════════════════
    {
      id: 86,
      instruction: 'Déploie une app Node.js sur VPS avec Docker',
      category: MissionCategory.DEPLOYMENT,
      capabilityPack: 'delivery',
      difficulty: 'hard',
      expectedArtifacts: ['Dockerfile', 'docker-compose.yml', 'deploy.sh', 'README.md'],
      tags: ['vps', 'docker', 'deploy'],
    },
    {
      id: 87,
      instruction: 'Package un projet en ZIP livrable avec documentation',
      category: MissionCategory.DEPLOYMENT,
      capabilityPack: 'delivery',
      difficulty: 'easy',
      expectedArtifacts: ['project.zip', 'README.md', 'INSTALL.md'],
      tags: ['zip', 'package', 'delivery'],
    },
    {
      id: 88,
      instruction: 'Publie un package npm avec documentation',
      category: MissionCategory.DEPLOYMENT,
      capabilityPack: 'delivery',
      difficulty: 'medium',
      expectedArtifacts: ['package.json', 'README.md', 'LICENSE'],
      tags: ['npm', 'publish', 'package'],
    },
    {
      id: 89,
      instruction: 'Crée une image Docker pour un service API',
      category: MissionCategory.DEPLOYMENT,
      capabilityPack: 'delivery',
      difficulty: 'medium',
      expectedArtifacts: ['Dockerfile', '.dockerignore', 'docker-compose.yml'],
      tags: ['docker', 'image', 'api'],
    },
    {
      id: 90,
      instruction: 'Configure un reverse proxy Nginx pour une app',
      category: MissionCategory.DEPLOYMENT,
      capabilityPack: 'delivery',
      difficulty: 'medium',
      expectedArtifacts: ['nginx.conf', 'README.md'],
      tags: ['nginx', 'proxy', 'config'],
    },
    {
      id: 91,
      instruction: 'Mets en place un déploiement GitHub Actions vers VPS',
      category: MissionCategory.DEPLOYMENT,
      capabilityPack: 'delivery',
      difficulty: 'hard',
      expectedArtifacts: ['.github/workflows/deploy.yml', 'deploy.sh', 'README.md'],
      tags: ['github', 'actions', 'vps'],
    },
    {
      id: 92,
      instruction: 'Crée un setup Docker Compose avec base de données',
      category: MissionCategory.DEPLOYMENT,
      capabilityPack: 'delivery',
      difficulty: 'medium',
      expectedArtifacts: ['docker-compose.yml', 'Dockerfile', 'README.md'],
      tags: ['docker', 'compose', 'database'],
    },
    {
      id: 93,
      instruction: "Configure SSL/HTTPS avec Let's Encrypt",
      category: MissionCategory.DEPLOYMENT,
      capabilityPack: 'delivery',
      difficulty: 'hard',
      expectedArtifacts: ['ssl-setup.sh', 'nginx-ssl.conf', 'README.md'],
      tags: ['ssl', 'https', 'security'],
    },
    {
      id: 94,
      instruction: 'Crée un script de backup automatisé pour VPS',
      category: MissionCategory.DEPLOYMENT,
      capabilityPack: 'delivery',
      difficulty: 'medium',
      expectedArtifacts: ['backup.sh', 'crontab.txt', 'README.md'],
      tags: ['backup', 'vps', 'automation'],
    },
    {
      id: 95,
      instruction: 'Configure un registry Docker privé',
      category: MissionCategory.DEPLOYMENT,
      capabilityPack: 'delivery',
      difficulty: 'hard',
      expectedArtifacts: ['docker-registry.yml', 'config.yml', 'README.md'],
      tags: ['docker', 'registry', 'private'],
    },
    {
      id: 96,
      instruction: 'Crée un script de monitoring serveur',
      category: MissionCategory.DEPLOYMENT,
      capabilityPack: 'delivery',
      difficulty: 'medium',
      expectedArtifacts: ['monitor.sh', 'alerts.json', 'README.md'],
      tags: ['monitoring', 'server', 'alerts'],
    },
    {
      id: 97,
      instruction: 'Déploie une app statique sur GitHub Pages',
      category: MissionCategory.DEPLOYMENT,
      capabilityPack: 'delivery',
      difficulty: 'easy',
      expectedArtifacts: ['.github/workflows/pages.yml', 'README.md'],
      tags: ['github', 'pages', 'static'],
    },
    {
      id: 98,
      instruction: 'Configure Kubernetes manifests pour une API',
      category: MissionCategory.DEPLOYMENT,
      capabilityPack: 'delivery',
      difficulty: 'hard',
      expectedArtifacts: ['k8s/deployment.yml', 'k8s/service.yml', 'README.md'],
      tags: ['kubernetes', 'k8s', 'api'],
    },
    {
      id: 99,
      instruction: 'Crée un Terraform config pour infrastructure cloud',
      category: MissionCategory.DEPLOYMENT,
      capabilityPack: 'delivery',
      difficulty: 'hard',
      expectedArtifacts: ['main.tf', 'variables.tf', 'README.md'],
      tags: ['terraform', 'cloud', 'infrastructure'],
    },
    {
      id: 100,
      instruction: 'Génère un fichier docker-compose pour microservices',
      category: MissionCategory.DEPLOYMENT,
      capabilityPack: 'delivery',
      difficulty: 'hard',
      expectedArtifacts: ['docker-compose.yml', 'README.md'],
      tags: ['docker', 'microservices', 'compose'],
    },
  ];

  /**
   * Get missions filtered by capability pack
   */
  static getByPack(pack: ReferenceMission['capabilityPack']): ReferenceMission[] {
    return ReferenceMissions.ALL.filter((m) => m.capabilityPack === pack);
  }

  /**
   * Get missions filtered by category
   */
  static getByCategory(category: MissionCategory): ReferenceMission[] {
    return ReferenceMissions.ALL.filter((m) => m.category === category);
  }

  /**
   * Get missions filtered by difficulty
   */
  static getByDifficulty(difficulty: ReferenceMission['difficulty']): ReferenceMission[] {
    return ReferenceMissions.ALL.filter((m) => m.difficulty === difficulty);
  }

  /**
   * Get a random selection of missions
   */
  static getRandom(count: number): ReferenceMission[] {
    const shuffled = [...ReferenceMissions.ALL].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  /**
   * Get easy missions for quick validation
   */
  static getEasy(): ReferenceMission[] {
    return ReferenceMissions.ALL.filter((m) => m.difficulty === 'easy');
  }

  /**
   * Get statistics about the reference missions
   */
  static getStats(): {
    total: number;
    byPack: Record<string, number>;
    byDifficulty: Record<string, number>;
    byCategory: Record<string, number>;
  } {
    const byPack: Record<string, number> = {};
    const byDifficulty: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const m of ReferenceMissions.ALL) {
      byPack[m.capabilityPack] = (byPack[m.capabilityPack] || 0) + 1;
      byDifficulty[m.difficulty] = (byDifficulty[m.difficulty] || 0) + 1;
      byCategory[m.category] = (byCategory[m.category] || 0) + 1;
    }

    return { total: ReferenceMissions.ALL.length, byPack, byDifficulty, byCategory };
  }
}
