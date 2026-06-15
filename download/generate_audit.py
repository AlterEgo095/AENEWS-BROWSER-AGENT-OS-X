#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""AENEWS Agent OS X - Audit Complet PDF Report Generator"""

import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable, ListFlowable, ListItem
)
from reportlab.platypus.flowables import Flowable
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.fonts import addMapping

# ━━ Color Palette ━━
ACCENT       = colors.HexColor('#5327d6')
TEXT_PRIMARY  = colors.HexColor('#232220')
TEXT_MUTED    = colors.HexColor('#858178')
BG_SURFACE   = colors.HexColor('#e4e2dc')
BG_PAGE      = colors.HexColor('#f2f1ed')
TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = BG_SURFACE

# Severity colors
COLOR_CRITICAL = colors.HexColor('#dc2626')
COLOR_HIGH = colors.HexColor('#ea580c')
COLOR_MEDIUM = colors.HexColor('#d97706')
COLOR_LOW = colors.HexColor('#16a34a')
COLOR_INFO = colors.HexColor('#2563eb')

# Register fonts
FONT_DIR = '/usr/share/fonts/truetype'
pdfmetrics.registerFont(TTFont('NotoSansSC', os.path.join(FONT_DIR, 'chinese/SarasaMonoSC-Regular.ttf')))
pdfmetrics.registerFont(TTFont('NotoSerifSC', os.path.join(FONT_DIR, 'noto-serif-sc/NotoSerifSC-Regular.ttf')))
pdfmetrics.registerFont(TTFont('Tinos', os.path.join(FONT_DIR, 'liberation/LiberationSerif-Regular.ttf')))
pdfmetrics.registerFont(TTFont('Tinos-Bold', os.path.join(FONT_DIR, 'liberation/LiberationSerif-Bold.ttf')))
pdfmetrics.registerFont(TTFont('Carlito', os.path.join(FONT_DIR, 'english/Carlito-Regular.ttf')))
pdfmetrics.registerFont(TTFont('Carlito-Bold', os.path.join(FONT_DIR, 'english/Carlito-Bold.ttf')))
addMapping('Tinos', 0, 0, 'Tinos')
addMapping('Tinos', 1, 0, 'Tinos-Bold')
addMapping('Carlito', 0, 0, 'Carlito')
addMapping('Carlito', 1, 0, 'Carlito-Bold')

PAGE_W, PAGE_H = A4
MARGIN = 20*mm
CONTENT_W = PAGE_W - 2*MARGIN

# ━━ Styles ━━
styles = getSampleStyleSheet()

style_title = ParagraphStyle('Title', fontName='Tinos-Bold', fontSize=26, leading=32, textColor=TEXT_PRIMARY, alignment=TA_CENTER, spaceAfter=6)
style_h1 = ParagraphStyle('H1', fontName='Tinos-Bold', fontSize=20, leading=26, textColor=ACCENT, spaceBefore=18, spaceAfter=8)
style_h2 = ParagraphStyle('H2', fontName='Tinos-Bold', fontSize=15, leading=20, textColor=TEXT_PRIMARY, spaceBefore=14, spaceAfter=6)
style_h3 = ParagraphStyle('H3', fontName='Carlito-Bold', fontSize=12, leading=16, textColor=TEXT_PRIMARY, spaceBefore=10, spaceAfter=4)
style_body = ParagraphStyle('Body', fontName='Carlito', fontSize=9.5, leading=14, textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, spaceAfter=4)
style_body_small = ParagraphStyle('BodySmall', fontName='Carlito', fontSize=8.5, leading=12, textColor=TEXT_PRIMARY, spaceAfter=3)
style_muted = ParagraphStyle('Muted', fontName='Carlito', fontSize=8.5, leading=12, textColor=TEXT_MUTED, spaceAfter=3)
style_score = ParagraphStyle('Score', fontName='Tinos-Bold', fontSize=48, leading=54, textColor=ACCENT, alignment=TA_CENTER, spaceAfter=4)
style_score_label = ParagraphStyle('ScoreLabel', fontName='Carlito', fontSize=11, leading=14, textColor=TEXT_MUTED, alignment=TA_CENTER, spaceAfter=16)
style_critical = ParagraphStyle('Critical', fontName='Carlito-Bold', fontSize=9.5, leading=14, textColor=COLOR_CRITICAL, spaceAfter=3)
style_high = ParagraphStyle('High', fontName='Carlito-Bold', fontSize=9.5, leading=14, textColor=COLOR_HIGH, spaceAfter=3)
style_medium = ParagraphStyle('Medium', fontName='Carlito-Bold', fontSize=9.5, leading=14, textColor=COLOR_MEDIUM, spaceAfter=3)
style_low = ParagraphStyle('Low', fontName='Carlito-Bold', fontSize=9.5, leading=14, textColor=COLOR_LOW, spaceAfter=3)
style_bullet = ParagraphStyle('Bullet', fontName='Carlito', fontSize=9.5, leading=14, textColor=TEXT_PRIMARY, leftIndent=14, bulletIndent=4, spaceAfter=2)
style_toc = ParagraphStyle('TOC', fontName='Carlito', fontSize=10, leading=16, textColor=TEXT_PRIMARY, leftIndent=0, spaceAfter=2)
style_toc_h = ParagraphStyle('TOCH', fontName='Carlito-Bold', fontSize=11, leading=18, textColor=ACCENT, leftIndent=0, spaceAfter=2)
style_table_header = ParagraphStyle('TH', fontName='Carlito-Bold', fontSize=8, leading=11, textColor=TABLE_HEADER_TEXT, alignment=TA_CENTER)
style_table_cell = ParagraphStyle('TC', fontName='Carlito', fontSize=8, leading=11, textColor=TEXT_PRIMARY)
style_table_cell_center = ParagraphStyle('TCC', fontName='Carlito', fontSize=8, leading=11, textColor=TEXT_PRIMARY, alignment=TA_CENTER)

def P(text, style=style_body):
    return Paragraph(text, style)

def HR():
    return HRFlowable(width="100%", thickness=0.5, color=ACCENT, spaceAfter=6, spaceBefore=6)

def make_table(headers, rows, col_widths=None):
    """Create a styled table."""
    header_row = [Paragraph(h, style_table_header) for h in headers]
    data = [header_row]
    for row in rows:
        data.append([Paragraph(str(c), style_table_cell) for c in row])
    
    if not col_widths:
        col_widths = [CONTENT_W / len(headers)] * len(headers)
    
    t = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
        ('FONTNAME', (0, 0), (-1, 0), 'Carlito-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.3, colors.HexColor('#cccccc')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]
    for i in range(1, len(data)):
        bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))
    return t

def severity_badge(severity):
    mapping = {
        'CRITIQUE': COLOR_CRITICAL, 'HAUT': COLOR_HIGH,
        'MOYEN': COLOR_MEDIUM, 'BAS': COLOR_LOW, 'INFO': COLOR_INFO
    }
    c = mapping.get(severity, TEXT_MUTED)
    return f'<font color="#{c.hexval()[2:]}">{severity}</font>'

def build_story():
    story = []
    
    # ═══════════ COVER PAGE ═══════════
    story.append(Spacer(1, 60*mm))
    story.append(P("AUDIT COMPLET", style_title))
    story.append(Spacer(1, 4*mm))
    story.append(P("AENEWS Agent OS X", ParagraphStyle('CoverSubtitle', fontName='Tinos-Bold', fontSize=22, leading=28, textColor=ACCENT, alignment=TA_CENTER, spaceAfter=8)))
    story.append(Spacer(1, 6*mm))
    story.append(P("Depot GitHub : AlterEgo095/AENEWS-BROWSER-AGENT-OS-X", style_muted))
    story.append(P("Version auditee : Phase 14 GA (commit e10337b)", style_muted))
    story.append(P("Date de l'audit : 15 juin 2026", style_muted))
    story.append(P("Auditeur : Architecte Logiciel Senior / DevSecOps / Expert QA", style_muted))
    story.append(Spacer(1, 15*mm))
    story.append(HR())
    story.append(Spacer(1, 5*mm))
    story.append(P("Ce rapport presente un audit exhaustif du depot, realise comme si le responsable validait le projet avant un deploiement en production. Chaque affirmation est basee sur l'analyse reelle des fichiers presents. Aucun credit n'est accorde aux commentaires, a la documentation ou aux noms de fichiers : seul le code reellement executable fait foi.", style_body))
    
    story.append(PageBreak())
    
    # ═══════════ TABLE OF CONTENTS ═══════════
    story.append(P("TABLE DES MATIERES", style_h1))
    story.append(HR())
    toc_items = [
        ("1", "Resume Executif"),
        ("2", "Structure Generale"),
        ("3", "Recherche de Placeholders"),
        ("4", "Detection de Simulation IA / Agent"),
        ("5", "Fonctionnalites Fantomes"),
        ("6", "Code Mort"),
        ("7", "Detection de Faux Workflow"),
        ("8", "Verification Backend"),
        ("9", "Verification Frontend"),
        ("10", "Base de Donnees"),
        ("11", "Securite"),
        ("12", "Docker"),
        ("13", "Deploiement"),
        ("14", "Performance"),
        ("15", "Dette Technique"),
        ("16", "Verification des Promesses"),
        ("17", "Corrections Prioritaires"),
        ("18", "Conclusion"),
    ]
    for num, title in toc_items:
        story.append(P(f"<b>{num}.</b>  {title}", style_toc))
    story.append(PageBreak())
    
    # ═══════════ 1. RESUME EXECUTIF ═══════════
    story.append(P("1. RESUME EXECUTIF", style_h1))
    story.append(HR())
    
    story.append(P("43", style_score))
    story.append(P("/ 100", style_score_label))
    
    story.append(Spacer(1, 4*mm))
    
    # Score breakdown table
    score_data = [
        ["Categorie", "Score", "Appreciation"],
        ["Architecture", "65 / 100", "Moyen"],
        ["Securite", "25 / 100", "Critique"],
        ["Qualite du Code", "55 / 100", "Moyen"],
        ["Tests", "30 / 100", "Critique"],
        ["Deployabilite", "40 / 100", "Moyen"],
        ["Performance", "45 / 100", "Moyen"],
        ["Promesses vs Realite", "65 / 100", "Moyen"],
    ]
    t = Table(score_data, colWidths=[CONTENT_W*0.45, CONTENT_W*0.25, CONTENT_W*0.30])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), ACCENT),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Carlito-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'Carlito'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.3, colors.HexColor('#cccccc')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#fef2f2')),
        ('BACKGROUND', (0, 2), (-1, 2), TABLE_ROW_ODD),
        ('BACKGROUND', (0, 3), (-1, 3), colors.HexColor('#fef2f2')),
        ('BACKGROUND', (0, 4), (-1, 4), colors.HexColor('#fef2f2')),
        ('BACKGROUND', (0, 5), (-1, 5), TABLE_ROW_ODD),
        ('BACKGROUND', (0, 6), (-1, 6), TABLE_ROW_ODD),
        ('BACKGROUND', (0, 7), (-1, 7), TABLE_ROW_EVEN),
    ]))
    story.append(t)
    story.append(Spacer(1, 6*mm))
    
    story.append(P("<b>Etat general : CRITIQUE</b>", style_critical))
    story.append(P("Le projet presente une architecture solide et extensible avec une couche d'integration LLM reelle (OpenAI + Anthropic), mais la majorite des clusters d'agents (environ 70%) sont des squelettes retournant des donnees vides ou simulees. Des vulnerabilites de securite critiques (injection Cypher, path traversal, 66+ endpoints sans authentification) rendent le deploiement en production impossible sans corrections majeures.", style_body))
    
    story.append(Spacer(1, 4*mm))
    story.append(P(f"<b>Simulation IA detectee : {severity_badge('OUI')} HYBRIDE</b> - L'integration LLM est reelle (12 agents utilisent executeWithLLM()), mais la plupart des clusters retournent des structures vides. Verdict : IA hybride, pas marketing uniquement.", style_body))
    story.append(P(f"<b>Placeholders detectes : {severity_badge('OUI')}</b> - 1 fichier mock-data.ts central (376 lignes), 8 pages en fallback mock, 2 pages 100% mock, 7 methodes notImplemented(), 3 agents simules.", style_body))
    story.append(P(f"<b>Fonctionnalites fantomes : {severity_badge('OUI')}</b> - Barre de recherche, cloche de notification, boutons sans handlers, double prefix API causant des 404.", style_body))
    story.append(P(f"<b>Code mort estime : {severity_badge('INFO')} ~25%</b> - 15/21 hooks inutilises, 20+ types jamais importes, double codebase avec confusion.", style_body))
    story.append(P(f"<b>Production Ready : {severity_badge('CRITIQUE')} NON</b> - Corrections majeures requises avant tout deploiement.", style_body))
    
    story.append(PageBreak())
    
    # ═══════════ 2. STRUCTURE GENERALE ═══════════
    story.append(P("2. STRUCTURE GENERALE", style_h1))
    story.append(HR())
    
    story.append(P("<b>2.1 Architecture du projet</b>", style_h2))
    story.append(P("Le projet AENEWS Agent OS X adopte une architecture duale composee de deux backends NestJS distincts et d'un frontend Next.js. Le backend principal (repertoire backend/) utilise NestJS 11 avec TypeORM 1.0 et offre 14 clusters d'agents, des connecteurs reels et des services d'infrastructure. Le backend secondaire (repertoire src/) utilise NestJS 10 avec le pattern BaseAgentService, 80+ agents, un runtime Software Factory et un Mission OS. Le frontend (repertoire frontend/) utilise Next.js 16 avec React 19, TanStack React Query, Recharts et Socket.IO.", style_body))
    
    story.append(P("<b>2.2 Problemes de coherence</b>", style_h2))
    story.append(P("La dualite du codebase constitue le probleme architectural le plus significatif. Les deux backends ont des versions differentes de NestJS (10 vs 11), des prefixes d'API differents (api vs api/v1), et des configurations distinctes. Le frontend cente api/v1 qui correspond au backend/ mais les controllers Swarm/Intelligence/Orchestration utilisent @Controller('api/v1/...') ce qui cree un double prefix lorsque combine avec le global prefix, resultant en api/v1/api/v1/swarm/* qui retourne systematiquement 404. Cette incoherence fait que trois pages entieres (orchestration, intelligence, swarm) ne pourront jamais se connecter au backend reel.", style_body))
    
    story.append(P("<b>2.3 Dependances inutilisables ou manquantes</b>", style_h2))
    rows_deps = [
        ["z-ai-web-dev-sdk (root)", "Installe mais jamais importe dans le backend", "HAUT"],
        ["openai (backend)", "Installe, utilise par LLM providers", "OK"],
        ["@anthropic-ai/sdk (backend)", "Installe, utilise par LLM providers", "OK"],
        ["@nestjs/cache-manager", "Importe dans aucun module fonctionnel", "MOYEN"],
        ["docx / xlsx (backend)", "Installes mais non connectes aux agents Office", "MOYEN"],
        ["nodemailer (backend)", "Installe mais l'agent Email retourne des donnees vides", "MOYEN"],
        ["dockerode (backend)", "Installe mais les agents Infrastructure retournent des donnees simulees", "MOYEN"],
    ]
    story.append(make_table(["Dependances", "Statut", "Criticite"], rows_deps, [CONTENT_W*0.30, CONTENT_W*0.50, CONTENT_W*0.20]))
    
    story.append(Spacer(1, 4*mm))
    story.append(P("<b>2.4 Fichiers dupliques / orphelins</b>", style_h2))
    story.append(P("Trois fichiers init-db.sql existent avec des schemas contradictoires : docker/init-db.sql, backend/docker/init-db.sql, et backend/db/init-db.sql. Ils definissent des types enum differents (lowercase vs uppercase), des noms de colonnes differents (status vs state pour missions), et des types incoherents (VARCHAR(255) vs UUID pour tenant_id). Le repertoire _legacy_agents/ contient du code deprecie jamais importe par les modules actuels. La page /live est orpheline (non liee dans la sidebar).", style_body))
    
    story.append(PageBreak())
    
    # ═══════════ 3. PLACEHOLDERS ═══════════
    story.append(P("3. RECHERCHE DE PLACEHOLDERS", style_h1))
    story.append(HR())
    
    story.append(P("<b>3.1 Fichier mock central</b>", style_h2))
    story.append(P("Le fichier frontend/src/lib/mock-data.ts (376 lignes) exporte 13 ensembles de donnees fictives : mockAgents, mockClusterStats, mockTasks, mockEvents, mockMissions, mockHealth, mockClusterHealth, mockConnectors, mockOrchestrationStats, mockOrchestrationHistory, mockDecompositionResult, mockCollaborationResult, mockCoordinationResult. Toutes les donnees sont generees avec des IDs, timestamps et valeurs hardcodes. Chaque page frontend utilise ces donnees comme fallback via try/catch, masquant les pannes reelles de l'API.", style_body))
    
    story.append(P("<b>3.2 Pages utilisant des fallbacks mock</b>", style_h2))
    rows_mock = [
        ["Dashboard (page.tsx)", "8 imports mock", "CRITIQUE"],
        ["Tasks (tasks/page.tsx)", "mockTasks", "HAUT"],
        ["Agents (agents/page.tsx)", "mockAgents", "HAUT"],
        ["Events (events/page.tsx)", "mockEvents", "HAUT"],
        ["Missions (missions/page.tsx)", "mockMissions", "HAUT"],
        ["Orchestration", "6 imports mock + commentaires 'demo'", "CRITIQUE"],
        ["Admin (admin/page.tsx)", "4 imports mock + data inline", "CRITIQUE"],
        ["Intelligence", "100% mock inline (7 datasets)", "CRITIQUE"],
        ["Swarm", "100% mock inline (10 datasets)", "CRITIQUE"],
    ]
    story.append(make_table(["Page", "Utilisation Mock", "Criticite"], rows_mock, [CONTENT_W*0.30, CONTENT_W*0.45, CONTENT_W*0.25]))
    
    story.append(Spacer(1, 4*mm))
    story.append(P("<b>3.3 Methodes notImplemented()</b>", style_h2))
    story.append(P("Le fichier src/software-factory/connectors/delivery-connector.ts contient 7 methodes retournant status: 'not_implemented' via un helper notImplemented() : executeCloud(), executeCdn(), executeBackup(), executeMonitoringSetup(), executeLoadBalancer(), executeDeliveryFallback(). Le helper indique 'will be available in a future sprint', ce qui confirme que ces fonctionnalites sont absentes du code actuel.", style_body))
    
    story.append(P("<b>3.4 Agents simules</b>", style_h2))
    story.append(P("Trois agents du cluster Computer utilisent des donnees simulees : le Screen Capture Agent avec SIMULATED_WINDOWS (fenetres hardcodes), le System Monitor Agent avec un etat systeme simule et un intervalle compresse, et le Clipboard Agent avec un contenu simule 'Simulated clipboard change #N'. Le mini-service agent-stream (port 3003) utilise explicitement une fonction simulateAgentActivity() pour generer de fausses activites d'agents.", style_body))
    
    story.append(P("<b>3.5 Console.log en production</b>", style_h2))
    story.append(P("199 occurrences de console.log/warn/error dans src/ (10 fichiers) et 12 occurrences dans backend/ (3 fichiers). Les fichiers les plus touches sont standalone-runner.ts (85), batch-runner.ts (43), full-audit.ts (33) et quick-validate.ts (22). Ces outils CLI sont les plus concernes, mais des occurrences existent aussi dans des services d'agents.", style_body))
    
    story.append(PageBreak())
    
    # ═══════════ 4. SIMULATION IA ═══════════
    story.append(P("4. DETECTION DE SIMULATION IA / AGENT", style_h1))
    story.append(HR())
    
    story.append(P("<b>Verdict : IA HYBRIDE</b>", style_h2))
    story.append(P("Le projet possede une integration LLM reelle et production-grade avec OpenAI (v6.42.0) et Anthropic (v0.104.1), incluant des circuit breakers, du fallback provider, et des metriques d'utilisation. Cependant, la majorite des clusters d'agents (environ 70%) fonctionnent en mode simulation, retournant des structures de donnees vides ou hardcodes sans aucun raisonnement LLM. L'architecture est authentiquement capable d'IA mais la profondeur d'implementation est insuffisante pour la plupart des clusters.", style_body))
    
    story.append(P("<b>4.1 Clusters avec IA reelle</b>", style_h2))
    rows_real = [
        ["Browser", "REEL", "Playwright + LLM analysis, 18 agents avec action routing"],
        ["Coding", "REEL (LLM)", "CodeGeneration/CodeReview utilisent executeWithLLM()"],
        ["LLM Intelligence", "REEL", "6 agents : Planner, Critic, Decomposer, Judge, Repair, Validator"],
        ["Watchdog", "HYBRIDE", "ErrorAnalyzer utilise LLM ; CircuitBreaker est infrastructure"],
    ]
    story.append(make_table(["Cluster", "Verdict", "Preuve"], rows_real, [CONTENT_W*0.18, CONTENT_W*0.15, CONTENT_W*0.67]))
    
    story.append(Spacer(1, 4*mm))
    story.append(P("<b>4.2 Clusters squelettiques (simulation)</b>", style_h2))
    rows_skel = [
        ["Computer", "SQUELETTE", "Bridge simulation-only, agents retournent des donnees simulees"],
        ["Office", "SQUELETTE", "Schema-only, Nodemailer + docx non connectes aux agents"],
        ["Marketing", "SQUELETTE", "8 agents retournant des structures vides, zero appel LLM"],
        ["Business", "SQUELETTE", "8 agents retournant des structures vides, zero appel LLM"],
        ["Infrastructure", "SQUELETTE", "Dockerode installe mais agents retournent des donnees simulees"],
        ["Security", "SQUELETTE", "6 agents avec schemas detailles mais zero scan reel"],
        ["Meta-Intelligence", "SQUELETTE", "ReasoningAgent retourne des tableaux vides pour toutes les actions"],
        ["Self-Evolution", "SQUELETTE", "WeaknessDetector utilise Math.random(), pas d'evolution reelle"],
        ["Certification", "SQUELETTE", "12 auditeurs retournent des structures vides"],
        ["Intelligent Orchestration", "HYBRIDE", "Infrastructure reelle mais agents en simulation"],
    ]
    story.append(make_table(["Cluster", "Verdict", "Diagnostic"], rows_skel, [CONTENT_W*0.20, CONTENT_W*0.15, CONTENT_W*0.65]))
    
    story.append(Spacer(1, 4*mm))
    story.append(P("<b>4.3 Capacites IA verifiees</b>", style_h2))
    rows_cap = [
        ["Utilise un LLM reel", "OUI", "OpenAI + Anthropic avec circuit breakers et fallback"],
        ["Possede une memoire reelle", "OUI", "Multi-tier (Redis + Qdrant), vector search operationnel"],
        ["Possede une planification", "PARTIEL", "LLMPlannerAgent est reel, mais la plupart des agents n'ont pas de planification"],
        ["Possede une boucle de reflexion", "PARTIEL", "Pipeline 7 etapes (Decompose -> Deliver), mais pas de boucle autonome"],
        ["Utilise des embeddings reels", "NON", "Qdrant pret mais aucun pipeline de generation d'embeddings"],
        ["Utilise une base vectorielle", "OUI", "Qdrant avec CRUD complet et recherche par similarite cosinus"],
        ["Possede des outils reels", "PARTIEL", "Browser (Playwright) est reel, les autres connecteurs sont en simulation"],
        ["Possede une autonomie", "NON", "Les agents sont declenches par API, pas auto-demarres"],
    ]
    story.append(make_table(["Capacite", "Statut", "Detail"], rows_cap, [CONTENT_W*0.25, CONTENT_W*0.10, CONTENT_W*0.65]))
    
    story.append(PageBreak())
    
    # ═══════════ 5. FONCTIONNALITES FANTOMES ═══════════
    story.append(P("5. FONCTIONNALITES FANTOMES", style_h1))
    story.append(HR())
    
    story.append(P("De nombreuses fonctionnalites presentees dans l'interface utilisateur n'ont aucun backend fonctionnel ou aucun handler d'evenement. Ces elements donnent l'illusion de fonctionnalites completes mais sont purement decoratifs.", style_body))
    
    rows_ghost = [
        ["Barre de recherche (header)", "Bouton sans handler, pas de modal, pas de raccourci clavier", "CRITIQUE"],
        ["Cloche de notification (header)", "Badge '3' hardcode, pas de handler, pas de dropdown", "HAUT"],
        ["Bouton 'Unlock' (securite)", "Pas de onClick, devrait appeler POST /security/lockout/unlock", "HAUT"],
        ["Boutons 'Block/Unblock IP'", "Pas de onClick, devraient appeler POST /security/threats/ip", "HAUT"],
        ["Onglet 'Audit Log' (securite)", "Placeholder 'connect to API', backend existe mais pas appele", "HAUT"],
        ["Bouton 'Add User' (admin)", "Pas de handler, pas de modal, pas d'appel API", "HAUT"],
        ["Bouton 'Export Report' (admin)", "Pas de handler, pas de logique de telechargement", "MOYEN"],
        ["Toggles config securite (admin)", "Visuels uniquement, pas de handler", "HAUT"],
        ["Bouton 'Save Configuration'", "Pas de handler, pas d'appel API", "HAUT"],
        ["Metriques infrastructure (admin)", "Valeurs hardcodes (42%, 67%) ou Math.random()", "CRITIQUE"],
        ["Donnees analytics (admin)", "Math.random() par render, jamais les vraies donnees", "CRITIQUE"],
        ["Pages Intelligence + Swarm", "100% mock data inline, api.intelligence.* et api.swarm.* jamais appeles", "CRITIQUE"],
        ["Double prefix API", "3 controllers causant api/v1/api/v1/... = 404 systematique", "CRITIQUE"],
    ]
    story.append(make_table(["Fonctionnalite", "Probleme", "Criticite"], rows_ghost, [CONTENT_W*0.28, CONTENT_W*0.52, CONTENT_W*0.20]))
    
    story.append(PageBreak())
    
    # ═══════════ 6. CODE MORT ═══════════
    story.append(P("6. CODE MORT", style_h1))
    story.append(HR())
    
    story.append(P("<b>Pourcentage estime de code mort : ~25%</b>", style_h2))
    
    story.append(P("L'analyse revele un volume significatif de code mort, principalement concentre dans les hooks frontend, les definitions de types et la dualite du codebase.", style_body))
    
    story.append(P("<b>6.1 Hooks inutilises (15/21)</b>", style_h2))
    story.append(P("Sur 21 hooks exportes dans use-platform-data.ts, seulement 4 sont reellement utilises par des pages (useDashboardOverview, useAgentStats, useHealth, useLiveMonitor). Les 17 autres (useAgents, useExecuteAgent, useTasks, useCreateTask, useEvents, useMissions, useMissionActions, useClusterHealth, useConnectors, useOrchestrationStats, useGraphStats, useLearningStats, useSwarmMetrics, usePerformance, useLogin, useRegister) sont du code mort complet. Les pages les contournent en appelant directement api.* avec des try/catch vers les mocks.", style_body))
    
    story.append(P("<b>6.2 Types jamais importes</b>", style_h2))
    story.append(P("Plus de 20 types definis dans frontend/src/lib/types.ts ne sont jamais importes en dehors de types.ts ou mock-data.ts : LoginRequest, RegisterRequest, PaginatedResponse, DecomposedTask, TaskAssignment, CoordinationTimeline, CoordinationPhase, ConnectorStat, OrchestrationHistoryItem, PatternKnowledgeInfo, DissentRecord, Checkpoint, FeedbackLoopParams, FeedbackCycleResult, FeedbackAdjustment, TopologyNode, TopologyEdge, TopologyMetrics, DAGNode, DAGEdge, DAGTraceStep.", style_body))
    
    story.append(P("<b>6.3 API methods jamais appelees</b>", style_h2))
    story.append(P("Sur 55+ methodes API definies dans api.ts, la majorite des methodes intelligence.* et swarm.* ne sont jamais appelees depuis les pages. Les pages correspondantes utilisent exclusivement des donnees mock inline. D'autres methodes comme getAgent(), getMission(), createTask(), emitEvent(), getMissionProgress(), getConnectors(), executeConnector() ne sont jamais appelees car il n'existe pas de vue detail correspondante ou de formulaire de creation.", style_body))
    
    story.append(P("<b>6.4 Double codebase</b>", style_h2))
    story.append(P("L'existence de deux backends NestJS (src/ et backend/) cree une duplication massive. Les 14 clusters d'agents existent dans les deux repertoires avec des implementations legerement differentes. Le frontend ne communique qu'avec backend/ (prefix api/v1). Le code dans src/ est donc majoritairement inaccessible depuis le frontend, bien qu'il contienne des fonctionnalites avancees (Mission OS, Software Factory runtime, certification suite) qui ne sont pas exposees via des endpoints utilises par le frontend.", style_body))
    
    story.append(P("<b>6.5 Imports inutilises</b>", style_h2))
    story.append(P("Le fichier sidebar.tsx importe 5 icones lucide-react jamais utilisees : LogIn, Users, Database, ServerCog, BarChart3. Le fichier utils.ts exporte connectorStatusColors qui n'est jamais importe. Le repertoire _legacy_agents/ contient du code completement deprecie et jamais importe.", style_body))
    
    story.append(PageBreak())
    
    # ═══════════ 7. FAUX WORKFLOW ═══════════
    story.append(P("7. DETECTION DE FAUX WORKFLOW", style_h1))
    story.append(HR())
    
    story.append(P("L'audit a trace le flux complet (Frontend -> Backend -> Service -> Base de donnees -> Reponse -> Interface) pour les operations cles. Plusieurs ruptures ont ete identifiees.", style_body))
    
    rows_wf = [
        ["Login", "Frontend -> api.login() -> AuthService -> bcrypt+JWT -> DB", "FONCTIONNE", "Authentification complete avec lockout, progressive delay, threat intelligence"],
        ["Agent Execute", "Frontend -> api.executeAgent() -> AgentService -> Registry -> Agent", "PARTIEL", "CRUD en DB fonctionne, mais execution depend du registry en memoire (fragile)"],
        ["Mission CRUD", "Frontend -> api.createMission() -> SoftwareFactoryController -> DB", "FONCTIONNE", "CRUD DB operationnel"],
        ["Mission Execution", "Frontend -> api.startMission() -> MissionOrchestrator", "PARTIEL", "Pipeline en memoire, persistance mixte DB/in-memory"],
        ["Task Creation", "Frontend -> api.createTask() -> TaskService -> DB", "PARTIEL", "Task creee en DB mais JAMAIS assignee/executee automatiquement"],
        ["Orchestration", "Frontend -> api.orchestration.*", "RUPTURE", "Double prefix API = 404 systematique, toujours mock fallback"],
        ["Intelligence", "Frontend -> api.intelligence.*", "RUPTURE", "Double prefix API = 404, page 100% mock inline"],
        ["Swarm", "Frontend -> api.swarm.*", "RUPTURE", "Double prefix API = 404, page 100% mock inline"],
        ["Security (page)", "Frontend -> fetch direct (bypass proxy)", "RUPTURE", "Cle token incorrecte ('token' vs 'auth_token') = jamais authentifie"],
        ["Performance (page)", "Frontend -> fetch direct (bypass proxy)", "RUPTURE", "Meme probleme de cle token + CORS en production"],
        ["Live Monitor", "Frontend -> WebSocket:3003 -> mini-service", "SIMULATION", "mini-service genere des donnees simulees uniquement"],
    ]
    story.append(make_table(["Workflow", "Chaine", "Statut", "Detail"], rows_wf, [CONTENT_W*0.13, CONTENT_W*0.30, CONTENT_W*0.12, CONTENT_W*0.45]))
    
    story.append(PageBreak())
    
    # ═══════════ 8. VERIFICATION BACKEND ═══════════
    story.append(P("8. VERIFICATION BACKEND", style_h1))
    story.append(HR())
    
    story.append(P("<b>8.1 Endpoints sans authentification (CRITIQUE)</b>", style_h2))
    story.append(P("Le backend principal (backend/) possede un systeme d'authentification complet avec JwtAuthGuard, RolesGuard et TenantGuard declares comme guards globaux. Cependant, les controllers du module agent-framework (SwarmController, IntelligenceController, OrchestrationController) contournent completement ces protections. Ces 66+ endpoints n'ont ni @ApiBearerAuth(), ni @Roles(), ni @TenantScoped(), permettant un acces non authentifie a des operations sensibles comme la creation de swarms, l'execution de missions, et l'envoi de requetes Cypher arbitraires a Neo4j.", style_body))
    
    story.append(P("<b>8.2 Application src/ sans authentification</b>", style_h2))
    story.append(P("L'application root (src/) n'a aucun guard d'authentification. Aucun APP_GUARD n'est enregistre pour JwtAuthGuard, RolesGuard ou TenantGuard. Tous les controllers (SoftwareFactoryController, IntegrationController, CertificationController) sont completement non proteges. Cela signifie que POST /api/factory/run (execution de mission), POST /api/integration/missions/execute et GET /certification/run sont accessibles sans aucune authentification.", style_body))
    
    story.append(P("<b>8.3 PerformanceController - Auth inefficace</b>", style_h2))
    story.append(P("Le PerformanceController utilise SetMetadata('roles', ['admin']) au lieu du decorateur @Roles(). Le RolesGuard verifie ROLES_KEY metadata et non 'roles', rendant cette protection totalement inefficace. Les 10 endpoints exposant les slow query logs, la manipulation du cache, les donnees de profiling et les stats de pool sont accessibles a tout utilisateur authentifie.", style_body))
    
    story.append(P("<b>8.4 Validation des donnees</b>", style_h2))
    story.append(P("La validation des DTO est correctement appliquee sur les endpoints CRUD principaux (CreateAgentDto, RegisterDto, LoginDto, CreateTaskDto). Cependant, de nombreux endpoints manquent de validation : les parametres :id n'utilisent pas ParseUUIDPipe, les endpoints de securite (unlock, block IP, audit query) n'ont pas de DTO, et les endpoints du framework d'agents n'ont aucune validation. Le RegisterDto permet de specifier un role (y compris SUPER_ADMIN), creant un vecteur d'escalade de privileges.", style_body))
    
    story.append(P("<b>8.5 Services en memoire uniquement</b>", style_h2))
    story.append(P("17 services du module agent-framework sont exclusivement en memoire (Maps JavaScript) sans aucune persistance. Cela inclut SwarmIntelligenceService, AdvancedConsensusProtocol, CollaborationPersistenceService (le nom 'Persistence' est trompeur), SharedWorkingMemoryService, et AgentLearningEngine. Toutes les donnees sont perdues au redemarrage du serveur. Le service CollaborationPersistenceService est particulierement trompeur : son nom suggere de la persistance mais il utilise des Maps en memoire.", style_body))
    
    story.append(PageBreak())
    
    # ═══════════ 9. VERIFICATION FRONTEND ═══════════
    story.append(P("9. VERIFICATION FRONTEND", style_h1))
    story.append(HR())
    
    story.append(P("<b>9.1 Double prefix API - Bug critique</b>", style_h2))
    story.append(P("Les controllers backend pour orchestration, intelligence et swarm utilisent @Controller('api/v1/orchestration'), @Controller('api/v1/intelligence') et @Controller('api/v1/swarm'). Puisque main.ts definit app.setGlobalPrefix('api/v1'), les routes reelles deviennent api/v1/api/v1/orchestration/*, api/v1/api/v1/intelligence/* et api/v1/api/v1/swarm/*. Le frontend appelle /api/v1/orchestration/* ce qui retourne systematiquement 404. Les trois pages correspondantes ne peuvent JAMAIS se connecter au backend reel.", style_body))
    
    story.append(P("<b>9.2 Incoherence du token d'authentification</b>", style_h2))
    rows_token = [
        ["api.ts (ApiClient)", "localStorage.getItem('auth_token')", "Correct - matche auth-store"],
        ["performance/page.tsx", "localStorage.getItem('token')", "INCORRECT - cle inexistante"],
        ["security/page.tsx", "localStorage.getItem('token')", "INCORRECT - cle inexistante"],
        ["use-websocket.ts", "useAuthStore().token", "Correct via Zustand"],
        ["auth-store.ts", "Set 'auth_token'", "Source de verite"],
    ]
    story.append(make_table(["Composant", "Cle Token", "Statut"], rows_token, [CONTENT_W*0.30, CONTENT_W*0.40, CONTENT_W*0.30]))
    
    story.append(Spacer(1, 4*mm))
    story.append(P("Les pages Performance et Security ne trouveront JAMAIS le token d'authentification car elles cherchent la cle 'token' tandis que le auth store definit 'auth_token'. Ces pages seront toujours non authentifiees.", style_body))
    
    story.append(P("<b>9.3 Bypass du proxy Next.js</b>", style_h2))
    story.append(P("Les pages Performance et Security contournent le proxy Next.js (next.config.ts rewrites) en utilisant directement process.env.NEXT_PUBLIC_API_URL pour leurs fetch. Cela cause des problemes CORS en production et une gestion differente des tokens d'authentification. Le proxy Next.js est la couche d'abstraction correcte et devrait etre utilise par toutes les pages.", style_body))
    
    story.append(P("<b>9.4 Donnees de graphiques aleatoires</b>", style_h2))
    story.append(P("Le dashboard (page.tsx) genere les donnees du graphique d'activite avec Math.random() : Math.floor(kpis.activeAgents * (0.7 + Math.random() * 0.3)). Les lignes du graphique changent aleatoirement a chaque rafraichissement, donnant l'illusion de donnees reelles mais affichant en realite du bruit visuel. De meme, la page admin utilise Math.random() pour les metriques d'infrastructure et les donnees analytics.", style_body))
    
    story.append(P("<b>9.5 WebSocket - Mismatch d'authentification</b>", style_h2))
    story.append(P("Le hook useWebSocket passe le token via socket.emit('authenticate', { token }) mais le backend EventsGateway s'attend a recevoir le token dans handshake.query.token ou l'en-tete Authorization, pas via un message socket.emit. Cette incoherence signifie que la connexion WebSocket principale peut echouer silencieusement quand le backend est actif.", style_body))
    
    story.append(PageBreak())
    
    # ═══════════ 10. BASE DE DONNEES ═══════════
    story.append(P("10. BASE DE DONNEES", style_h1))
    story.append(HR())
    
    story.append(P("<b>10.1 Schema - 4 schemas, 10 tables, 7 enums</b>", style_h2))
    story.append(P("Le schema de base de donnees est bien structure avec 4 schemas logiques (tenant, agent, audit, software_factory), 10 tables et 7 types enum. Les cles primaires utilisent UUID avec gen_random_uuid(), les clees etrangeres ont des cascades appropriees, et les indexes couvrent les requetes principales. Cependant, plusieurs problemes critiques empechent le bon fonctionnement.", style_body))
    
    story.append(P("<b>10.2 Problemes critiques</b>", style_h2))
    rows_db = [
        ["3 fichiers init-db.sql contradictoires", "CRITIQUE", "Enums differents (lowercase vs uppercase), noms de colonnes differents, types incoherents (VARCHAR vs UUID)"],
        ["Ordre de creation FK circulaire", "HAUT", "executions reference tasks mais tasks est cree APRES executions dans la migration"],
        ["Nommage mission status inconsistent", "HAUT", "docker/init-db.sql : lowercase 'draft,planned' ; migration : uppercase 'DRAFT,PLANNED,RESEARCH'"],
        ["Mot de passe admin hardcode", "CRITIQUE", "docker/init-db.sql ligne 188 : bcrypt hash pour 'admin123' avec commentaire 'change in production!'"],
        ["Indexes performance : mauvais schema", "HAUT", "8 indexes referencent public.users et public.plugins au lieu de tenant.users et agent.plugins"],
        ["Pas de triggers updated_at dans migration", "MOYEN", "Seuls les scripts SQL manuels creent les triggers, pas la migration TypeORM"],
        ["Pas de RLS (Row Level Security)", "MOYEN", "Multi-tenancy enforcement uniquement applicative, pas au niveau DB"],
    ]
    story.append(make_table(["Probleme", "Criticite", "Detail"], rows_db, [CONTENT_W*0.30, CONTENT_W*0.12, CONTENT_W*0.58]))
    
    story.append(PageBreak())
    
    # ═══════════ 11. SECURITE ═══════════
    story.append(P("11. SECURITE", style_h1))
    story.append(HR())
    
    story.append(P("<b>Score de securite : 25 / 100 (CRITIQUE)</b>", style_h2))
    
    story.append(P("<b>11.1 Vulnerabilites critiques</b>", style_h3))
    rows_sec = [
        ["Injection Cypher (Neo4j)", "CRITIQUE", "intelligence.controller.ts : POST /graph/query permet des requetes Cypher arbitraires sans sanitization"],
        ["Path Traversal", "CRITIQUE", "software-factory.controller.ts : GET /run/:id/download/:filename ne valide pas les '../'"],
        ["66+ endpoints sans auth", "CRITIQUE", "Swarm/Intelligence/Orchestration controllers sans aucun guard"],
        ["App src/ sans authentification", "CRITIQUE", "Aucun APP_GUARD enregistre, tous les endpoints ouverts"],
        ["Secrets JWT hardcodes", "CRITIQUE", "3 fallbacks vers 'dev-only-secret-change-me' et 'default-secret-change-me'"],
    ]
    story.append(make_table(["Vulnerabilite", "Criticite", "Localisation / Detail"], rows_sec, [CONTENT_W*0.22, CONTENT_W*0.12, CONTENT_W*0.66]))
    
    story.append(Spacer(1, 4*mm))
    story.append(P("<b>11.2 Vulnerabilites elevees</b>", style_h3))
    rows_sec2 = [
        ["CORS wildcard + credentials (src/)", "HAUT", "origin: true par defaut avec credentials: true = fuite de credentials"],
        ["RegisterDto : role escalation", "HAUT", "Le DTO d'inscription accepte un champ role y compris SUPER_ADMIN"],
        ["Metrics endpoints @Public()", "HAUT", "GET /metrics et /metrics/json exposent les metriques internes sans auth"],
        ["revokeTokenFamily() vide", "HAUT", "Endpoint retourne 200 OK mais ne fait rien (body vide)"],
        ["PerformanceController sans roles", "HAUT", "SetMetadata('roles') au lieu de @Roles() = protection inactive"],
    ]
    story.append(make_table(["Vulnerabilite", "Criticite", "Detail"], rows_sec2, [CONTENT_W*0.28, CONTENT_W*0.10, CONTENT_W*0.62]))
    
    story.append(Spacer(1, 4*mm))
    story.append(P("<b>11.3 Points positifs</b>", style_h3))
    story.append(P("Le backend principal implémente bcrypt pour les mots de passe, JWT avec refresh tokens family-based, un systeme de lockout progressif, helmet avec CSP/HSTS/XSS filter, un throttler guard (60s/100req), et des guards globaux d'authentification. L'authentification login est complete et bien securisee. Le filesystem connector a une protection path traversal. Les requetes SQL utilisent toutes des requetes parametrees via TypeORM. Cependant, ces protections ne couvrent que le backend principal, pas l'application src/ ni les controllers du framework d'agents.", style_body))
    
    story.append(PageBreak())
    
    # ═══════════ 12. DOCKER ═══════════
    story.append(P("12. DOCKER", style_h1))
    story.append(HR())
    
    rows_docker = [
        ["Mots de passe en clair dans docker-compose.yml", "CRITIQUE", "aenews_secret_2024, aenews_rabbit_2024, etc."],
        ["JWT_SECRET default insecure en prod", "CRITIQUE", "docker-compose.prod.yml : ${JWT_SECRET:-change_me_in_production}"],
        ["3 fichiers compose contradictoires", "HAUT", "Mots de passe, noms DB et configs Redis differents"],
        ["Redis dev sans mot de passe", "HAUT", "docker/docker-compose.yml Redis : pas de requirepass"],
        ["MinIO + Qdrant en tag 'latest'", "MOYEN", "Images non epingees, risque de casser au update"],
        ["Grafana admin/admin par defaut", "HAUT", "GF_SECURITY_ADMIN_PASSWORD: ${...:-admin}"],
        ["Exporters manquants dans monitoring", "HAUT", "Prometheus reference 5 exporters non definis dans compose"],
        ["Pas de .dockerignore visible", "MOYEN", "Build context peut inclure node_modules, .git"],
        ["Dockerfile root insecure", "HAUT", "npm install playwright sans pinning, pas de dumb-init"],
    ]
    story.append(make_table(["Probleme", "Criticite", "Detail"], rows_docker, [CONTENT_W*0.30, CONTENT_W*0.12, CONTENT_W*0.58]))
    
    story.append(Spacer(1, 4*mm))
    story.append(P("Points positifs Docker : les Dockerfiles de production utilisent des builds multi-stage avec un utilisateur non-root, dumb-init comme PID 1, et des health checks. Le docker-compose.prod.yml utilise expose: au lieu de ports: pour les services internes, des resource limits, et une rotation de logs (max-size: 10m, max-file: 3). La configuration Nginx inclut du rate limiting, des security headers, CSP et HSTS.", style_body))
    
    story.append(PageBreak())
    
    # ═══════════ 13. DEPLOIEMENT ═══════════
    story.append(P("13. DEPLOIEMENT", style_h1))
    story.append(HR())
    
    story.append(P("<b>Verdict : Deployable avec corrections majeures</b>", style_h2))
    
    story.append(P("Le projet ne peut pas etre deploye en production dans son etat actuel. Les corrections majeures necessaires incluent la resolution des vulnerabilites de securite critiques, la correction du double prefix API, la consolidation des configurations Docker, et l'implementation de l'authentification sur tous les endpoints.", style_body))
    
    rows_deploy = [
        ["env_file path incorrect dans prod compose", "CRITIQUE", "../../backend/.env resout vers un chemin absolu incorrect"],
        ["Pas de GitHub Actions workflow", "HAUT", "DEPLOY.md decrit CI/CD mais .github/workflows/ n'existe pas"],
        ["Conflit port Grafana/Frontend", "MOYEN", "Les deux utilisent le port 3001"],
        ["Pas de support scaling horizontal", "MOYEN", "container_name empeche les instances multiples"],
        ["Certbot : probleme poule/oeuf SSL", "MOYEN", "Nginx ne demarre pas sans certs, certbot a besoin de nginx"],
        ["Pas de strategie de rollback DB", "MOYEN", "Seules les migrations forward sont documentees"],
    ]
    story.append(make_table(["Probleme", "Criticite", "Detail"], rows_deploy, [CONTENT_W*0.30, CONTENT_W*0.12, CONTENT_W*0.58]))
    
    story.append(PageBreak())
    
    # ═══════════ 14. PERFORMANCE ═══════════
    story.append(P("14. PERFORMANCE", style_h1))
    story.append(HR())
    
    story.append(P("<b>14.1 Caching defini mais jamais utilise</b>", style_h2))
    story.append(P("Les decorateurs @Cacheable et @CacheEvict existent (Phase 13), le ResponseCacheInterceptor avec LRU + Redis est implemente, et le ConnectionPoolService pour le monitoring de pool existe. Cependant, les decorateurs de cache sont uniquement des metadonnees jamais lues par un interceptor, le ResponseCacheInterceptor n'est enregistre dans aucun module, et le CacheModule de @nestjs/cache-manager n'est pas importe dans AppModule. Tout le systeme de cache est donc inactif.", style_body))
    
    story.append(P("<b>14.2 Problemes de performance identifies</b>", style_h2))
    rows_perf = [
        ["Cache absent (non branche)", "HAUT", "Toutes les requetes vont directement a la DB ou au service"],
        ["Indexes de performance casses", "HAUT", "8 indexes referencent le mauvais schema et echouent silencieusement"],
        ["17 services en memoire uniquement", "MOYEN", "Pas de persistence, reconstruction complete au redemarrage"],
        ["Fuites memoire potentielles", "MOYEN", "useLiveMonitor socket leak, ResponseCache LRU jamais shrink, handlersRef Map non borne"],
        ["Math.random() dans les graphiques", "MOYEN", "Regeneration aleatoire a chaque render, requetes inutiles"],
        ["Pas de N+1 detecte", "OK", "Les services evitent le chargement eager des relations"],
        ["Bundle frontend raisonnable", "OK", "Next.js standalone + recharts ~400KB + socket.io ~100KB"],
    ]
    story.append(make_table(["Probleme", "Criticite", "Detail"], rows_perf, [CONTENT_W*0.28, CONTENT_W*0.10, CONTENT_W*0.62]))
    
    story.append(PageBreak())
    
    # ═══════════ 15. DETTE TECHNIQUE ═══════════
    story.append(P("15. DETTE TECHNIQUE", style_h1))
    story.append(HR())
    
    story.append(P("<b>Estimation : DETTE ELEVEE</b>", style_h2))
    
    story.append(P("La dette technique est elevee en raison de la dualite du codebase, du volume de code mort, des mock data pervasive, et des fonctionnalites fantomes. Les principaux contributeurs a la dette sont les suivants.", style_body))
    
    rows_debt = [
        ["Double codebase NestJS", "ELEVEE", "Deux backends avec des versions, configs et implementations differentes creent de la confusion et de la duplication"],
        ["Mock data pervasive", "ELEVEE", "8+ pages en fallback mock, 2 pages 100% mock, masquant les pannes reelles"],
        ["Code mort (~25%)", "ELEVEE", "15/21 hooks inutilises, 20+ types morts, 30+ API methods jamais appelees"],
        ["Fonctionnalites fantomes", "MOYENNE", "Boutons sans handlers, toggles decoratifs, donnees aleatoires"],
        ["Services en memoire", "MOYENNE", "17 services sans persistence, donnees perdues au redemarrage"],
        ["Securite non appliquee uniformement", "ELEVEE", "66+ endpoints sans auth, app src/ completement ouverte"],
        ["3 init-db.sql contradictoires", "MOYENNE", "Confusion pour le deploiement, schemas incoherents"],
        ["WebSocket auth mismatch", "BASSE", "Frontend et backend utilisent des methodes d'auth differentes"],
    ]
    story.append(make_table(["Source", "Dette", "Impact"], rows_debt, [CONTENT_W*0.25, CONTENT_W*0.12, CONTENT_W*0.63]))
    
    story.append(PageBreak())
    
    # ═══════════ 16. VERIFICATION DES PROMESSES ═══════════
    story.append(P("16. VERIFICATION DES PROMESSES DU PROJET", style_h1))
    story.append(HR())
    
    story.append(P("<b>16.1 Promesses respectees</b>", style_h2))
    rows_kept = [
        ["14 clusters d'agents", "LIVRE", "Tous les 14 clusters existent dans backend/src/clusters/ et src/agents/"],
        ["100+ agents specialises", "LIVRE", "111 fichiers d'agents dans les clusters backend, plus 30+ dans src/agents/"],
        ["Intelligence LLM", "LIVRE", "OpenAI + Anthropic avec circuit breakers, fallback, metriques"],
        ["6 agents LLM Intelligence", "LIVRE", "Planner, Critic, Decomposer, Judge, Repair, Validator - tous utilisent executeWithLLM()"],
        ["Automatisation navigateur", "LIVRE", "Playwright connector reel avec BrowserPool"],
        ["Software Factory", "LIVRE", "Runtime engine, connector registry, batch runner, reference missions"],
        ["Event bus 3 canaux", "LIVRE", "event-bus, event-store, dead-letter-queue, event-replay"],
        ["Systeme de plugins", "LIVRE", "Entity, service, controller, module - completement implemente"],
        ["13 auditeurs certification", "LIVRE", "Fichiers d'agents existent dans le cluster certification"],
        ["Suite de connecteurs", "LIVRE", "6 connecteurs dans software-factory/connectors/ et modules/connectors/"],
    ]
    story.append(make_table(["Promesse", "Statut", "Preuve"], rows_kept, [CONTENT_W*0.25, CONTENT_W*0.10, CONTENT_W*0.65]))
    
    story.append(Spacer(1, 4*mm))
    story.append(P("<b>16.2 Promesses partiellement respectees</b>", style_h2))
    rows_partial = [
        ["Auto-evolution", "PARTIEL", "Agents existent avec logique (~200-400 lignes), mais pas de modification autonome de code, seulement du reporting/analyse"],
        ["Plateforme autonome", "PARTIEL", "Les agents executent des taches avec LLM + connecteurs, mais sont declenches via API, pas auto-demarres"],
        ["Monitoring temps reel", "PARTIEL", "WebSocket gateway existe, mais frontend utilise mock fallback, et mini-service genere des donnees simulees"],
        ["Memoire 5-tier + RAG", "PARTIEL", "7 services de memoire existent, mais pas de pipeline de generation d'embeddings automatique"],
        ["Multi-tenancy stricte", "PARTIEL", "Entities + guards existent, mais isolation applicative seulement, pas de RLS DB, et guards pas uniformement appliques"],
    ]
    story.append(make_table(["Promesse", "Statut", "Detail"], rows_partial, [CONTENT_W*0.20, CONTENT_W*0.10, CONTENT_W*0.70]))
    
    story.append(Spacer(1, 4*mm))
    story.append(P("<b>16.3 Promesses fausses / fonctionnalites imaginaires</b>", style_h2))
    rows_false = [
        ["Agents autonomes", "FAUX", "Aucun agent ne se declenche automatiquement, tous reactifs via API"],
        ["Self-evolution reelle", "FAUX", "WeaknessDetector utilise Math.random(), pas d'amelioration automatique du code"],
        ["Connecteurs reels (sauf Browser)", "FAUX", "Computer, Office, Marketing, Business sont en mode simulation"],
        ["Pipeline d'embeddings", "FAUX", "Qdrant est pret mais aucun code ne genere d'embeddings"],
        ["Orchestration/Intelligence/Swarm fonctionnels", "FAUX", "Double prefix API = 404, pages 100% mock"],
        ["Dashboard admin complet", "FAUX", "6/8 onglets utilisent des donnees mock ou Math.random()"],
        ["Monitoring Prometheus fonctionnel", "FAUX", "5 exporters references mais non definis dans compose"],
    ]
    story.append(make_table(["Promesse", "Statut", "Preuve de non-fonctionnement"], rows_false, [CONTENT_W*0.25, CONTENT_W*0.08, CONTENT_W*0.67]))
    
    story.append(PageBreak())
    
    # ═══════════ 17. CORRECTIONS PRIORITAIRES ═══════════
    story.append(P("17. LISTE DES CORRECTIONS PRIORITAIRES", style_h1))
    story.append(HR())
    
    story.append(P("<b>Priorite 1 - Bloquants production (CRITIQUE)</b>", style_h2))
    p1_items = [
        "Supprimer l'endpoint POST /graph/query ou ajouter une allowlist stricte de requetes Cypher pour empecher l'injection Neo4j",
        "Sanitiser le parametre filename dans GET /api/factory/run/:id/download/:filename pour empecher le path traversal",
        "Ajouter @ApiBearerAuth(), @Roles() et @TenantScoped() aux 66+ endpoints Swarm/Intelligence/Orchestration controllers",
        "Ajouter des guards d'authentification a l'application src/ (APP_GUARD pour JwtAuthGuard, RolesGuard, TenantGuard)",
        "Supprimer les fallbacks JWT hardcodes ('dev-only-secret-change-me', 'default-secret-change-me') et echouer si JWT_SECRET n'est pas defini",
        "Corriger le double prefix API : changer @Controller('api/v1/...') en @Controller('...') pour orchestration, intelligence, swarm",
    ]
    for item in p1_items:
        story.append(P(f"- {item}", style_bullet))
    
    story.append(Spacer(1, 4*mm))
    story.append(P("<b>Priorite 2 - Securite et fiabilite (HAUT)</b>", style_h2))
    p2_items = [
        "Corriger le PerformanceController : remplacer SetMetadata('roles') par @Roles(UserRole.SUPER_ADMIN)",
        "Definir des origines CORS explicites dans src/main.ts au lieu du wildcard par defaut",
        "Supprimer le champ role du RegisterDto pour empecher l'escalade de privileges",
        "Corriger la cle du token dans performance/page.tsx et security/page.tsx : 'token' -> 'auth_token'",
        "Restreindre les endpoints /metrics avec une limitation IP ou une authentification",
        "Consolider les 3 fichiers init-db.sql en un seul coherent et supprimer le mot de passe admin hardcode",
        "Supprimer les mots de passe en clair des docker-compose.yml et utiliser uniquement des references ${VAR}",
        "Corriger le chemin env_file dans docker-compose.prod.yml",
    ]
    for item in p2_items:
        story.append(P(f"- {item}", style_bullet))
    
    story.append(Spacer(1, 4*mm))
    story.append(P("<b>Priorite 3 - Qualite et dette technique (MOYEN)</b>", style_h2))
    p3_items = [
        "Supprimer les 15 hooks inutilises dans use-platform-data.ts ou refactorer les pages pour les utiliser",
        "Connecter les pages Intelligence et Swarm aux API reels au lieu des mock data inline",
        "Ajouter des handlers onClick aux boutons fantomes (search, notifications, unlock, block, save config, etc.)",
        "Remplacer Math.random() dans les graphiques par des donnees reelles du backend",
        "Branche le systeme de cache : enregistrer ResponseCacheInterceptor et CacheModule dans AppModule",
        "Ajouter ParseUUIDPipe a tous les parametres :id dans les controllers",
        "Ajouter une validation de complexite des mots de passe dans RegisterDto et UpdatePasswordDto",
        "Implementer les 7 methodes notImplemented() dans delivery-connector.ts",
        "Remplacer console.log par NestJS Logger dans les outils runtime",
        "Ajouter les exporters Prometheus manquants au docker-compose.monitoring.yml",
    ]
    for item in p3_items:
        story.append(P(f"- {item}", style_bullet))
    
    story.append(PageBreak())
    
    # ═══════════ 18. CONCLUSION ═══════════
    story.append(P("18. CONCLUSION", style_h1))
    story.append(HR())
    
    story.append(P("<b>Verdict detaille</b>", style_h2))
    
    story.append(P("AENEWS Agent OS X est un projet ambitieux avec une architecture fondamentalement solide et extensible. La couche d'integration LLM (OpenAI + Anthropic) est reelle et de qualite production-grade, avec des circuit breakers, du fallback provider, et des metriques d'utilisation. Le cluster Browser est authentiquement fonctionnel avec Playwright, et le cluster LLM Intelligence (6 agents) utilise reellement les LLM pour la planification, la critique, la decomposition, le jugement, la reparation et la validation. Le systeme de memoire multi-tier (Redis + Qdrant) et le graphe de connaissances Neo4j sont de vraies infrastructures, pas des simulacres.", style_body))
    
    story.append(P("Cependant, le projet souffre de trois problemes fondamentaux qui empechent tout deploiement en production.", style_body))
    
    story.append(P("Premierement, la securite est critique. L'injection Cypher via POST /graph/query, le path traversal dans le download endpoint, et les 66+ endpoints sans authentification representent des vulnerabilites qui pourraient etre exploitees immediatement en production. L'application src/ est completement ouverte, sans aucun guard d'authentification. Les secrets JWT hardcodes avec des fallbacks dev-only representent un risque majeur si APP_ENV n'est pas explicitement defini.", style_body))
    
    story.append(P("Deuxiemement, environ 70% des clusters d'agents sont des squelettes retournant des structures de donnees vides ou simulees. Les clusters Business, Marketing, Office, Infrastructure, Security, Meta-Intelligence, Self-Evolution et Certification existent architecturalement mais n'implementent pas de logique metier reelle. Le terme 'autonome' est trompeur : aucun agent ne se declenche automatiquement. La 'self-evolution' est de l'analyse/reporting, pas de la modification autonome de code.", style_body))
    
    story.append(P("Troisiemement, le frontend est en grande partie decoratif. Le bug du double prefix API rend trois pages entieres inutilisables avec le backend reel. Les pages Intelligence et Swarm sont 100% mock. La barre de recherche, la cloche de notification, et de nombreux boutons n'ont aucun handler. Les metriques d'infrastructure et d'analytics utilisent Math.random(). Le dashboard admin est majoritairement compose de donnees fictives.", style_body))
    
    story.append(P("La bonne nouvelle est que l'architecture est extensible : le pattern BaseAgent avec executeWithLLM() et executeViaBridge() signifie que n'importe quel agent squelette peut etre mis a niveau en ajoutant des prompts LLM. L'infrastructure (Qdrant, Neo4j, Redis, Playwright, OpenAI/Anthropic SDKs) est correctement cablee. Le gap est la profondeur d'implementation, pas l'architecture.", style_body))
    
    story.append(P("En resume, le projet est un prototype avance avec un noyau fonctionnel reel mais une peripherie majoritairement non implementee et des vulnerabilites de securite critiques. Il n'est pas deployable en production sans corrections majeures. La priorite absolue doit etre la resolution des vulnerabilites de securite, suivie de la correction du double prefix API et de l'elimination progressive des donnees mock au profit de vrais appels backend.", style_body))
    
    story.append(Spacer(1, 10*mm))
    story.append(HR())
    story.append(Spacer(1, 4*mm))
    story.append(P("Score final : <b>43 / 100</b> | Etat : <b>CRITIQUE</b> | Production Ready : <b>NON</b> | Simulation IA : <b>HYBRIDE</b> | Dette technique : <b>ELEVEE</b>", ParagraphStyle('Final', fontName='Carlito-Bold', fontSize=10, leading=16, textColor=ACCENT, alignment=TA_CENTER)))
    
    return story

# ━━ Build PDF ━━
output_path = '/home/z/my-project/download/AENEWS_Agent_OS_X_Audit_Complet.pdf'
doc = SimpleDocTemplate(
    output_path,
    pagesize=A4,
    leftMargin=MARGIN,
    rightMargin=MARGIN,
    topMargin=MARGIN,
    bottomMargin=MARGIN,
    title='AUDIT COMPLET - AENEWS Agent OS X',
    author='Z.ai - Architecte Logiciel Senior / DevSecOps',
    subject='Audit exhaustif du depot GitHub AlterEgo095/AENEWS-BROWSER-AGENT-OS-X'
)

story = build_story()
doc.build(story)
print(f"PDF generated: {output_path}")
