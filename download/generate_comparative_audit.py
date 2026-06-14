#!/usr/bin/env python3
"""Generate comparative audit report: Odysseus vs AENEWS Agent OS X"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Register fonts
font_dir = '/usr/share/fonts/truetype'
pdfmetrics.registerFont(TTFont('LiberationSerif', f'{font_dir}/liberation/LiberationSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSerif-Bold', f'{font_dir}/liberation/LiberationSerif-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Carlito', f'{font_dir}/english/Carlito-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Carlito-Bold', f'{font_dir}/english/Carlito-Bold.ttf'))

# Colors
PRIMARY = HexColor('#1a1a2e')
SECONDARY = HexColor('#16213e')
ACCENT = HexColor('#0f3460')
HIGHLIGHT = HexColor('#e94560')
SUCCESS = HexColor('#27ae60')
WARNING = HexColor('#f39c12')
DANGER = HexColor('#e74c3c')
INFO = HexColor('#3498db')
LIGHT_BG = HexColor('#f8f9fa')
TABLE_HEADER = HexColor('#1a1a2e')
TABLE_ALT = HexColor('#f0f2f5')
MUTED = HexColor('#6c757d')
BORDER = HexColor('#dee2e6')

# Page setup
PAGE_W, PAGE_H = A4
LEFT_M = 20*mm
RIGHT_M = 20*mm
TOP_M = 20*mm
BOTTOM_M = 20*mm
CONTENT_W = PAGE_W - LEFT_M - RIGHT_M

# Styles
styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    'CustomTitle', parent=styles['Title'],
    fontName='LiberationSerif-Bold', fontSize=26, textColor=PRIMARY,
    spaceAfter=6, alignment=TA_CENTER, leading=32
)
subtitle_style = ParagraphStyle(
    'CustomSubtitle', parent=styles['Normal'],
    fontName='Carlito', fontSize=13, textColor=MUTED,
    spaceAfter=20, alignment=TA_CENTER, leading=18
)
h1_style = ParagraphStyle(
    'H1', parent=styles['Heading1'],
    fontName='LiberationSerif-Bold', fontSize=18, textColor=PRIMARY,
    spaceBefore=18, spaceAfter=10, leading=24,
    borderWidth=0, borderPadding=0
)
h2_style = ParagraphStyle(
    'H2', parent=styles['Heading2'],
    fontName='LiberationSerif-Bold', fontSize=14, textColor=ACCENT,
    spaceBefore=14, spaceAfter=8, leading=18
)
h3_style = ParagraphStyle(
    'H3', parent=styles['Heading3'],
    fontName='Carlito-Bold', fontSize=12, textColor=HexColor('#2c3e50'),
    spaceBefore=10, spaceAfter=6, leading=16
)
body_style = ParagraphStyle(
    'CustomBody', parent=styles['Normal'],
    fontName='Carlito', fontSize=9.5, textColor=HexColor('#2c3e50'),
    spaceAfter=6, alignment=TA_JUSTIFY, leading=14,
    firstLineIndent=0
)
body_indent = ParagraphStyle(
    'BodyIndent', parent=body_style,
    leftIndent=15, spaceAfter=4
)
bullet_style = ParagraphStyle(
    'Bullet', parent=body_style,
    leftIndent=20, firstLineIndent=-10, spaceAfter=3
)
badge_style = ParagraphStyle(
    'Badge', parent=styles['Normal'],
    fontName='Carlito-Bold', fontSize=8, textColor=white,
    alignment=TA_CENTER, leading=11
)
cell_style = ParagraphStyle(
    'Cell', parent=body_style,
    fontSize=8.5, leading=12, spaceAfter=0, alignment=TA_LEFT
)
cell_center = ParagraphStyle(
    'CellCenter', parent=cell_style, alignment=TA_CENTER
)
header_cell = ParagraphStyle(
    'HeaderCell', parent=cell_style,
    fontName='Carlito-Bold', fontSize=9, textColor=white,
    alignment=TA_CENTER
)

def make_badge(text, color):
    return Paragraph(f'<font color="white">{text}</font>', badge_style)

def make_table(headers, rows, col_widths=None):
    """Create a styled table."""
    data = [[Paragraph(h, header_cell) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), cell_style) if not isinstance(c, Paragraph) else c for c in row])
    
    if col_widths is None:
        col_widths = [CONTENT_W / len(headers)] * len(headers)
    
    t = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Carlito-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), TABLE_ALT))
    
    t.setStyle(TableStyle(style_cmds))
    return t

def score_bar(score, max_score=100):
    """Create a visual score indicator."""
    pct = score / max_score
    if pct >= 0.7: color = SUCCESS
    elif pct >= 0.4: color = WARNING
    else: color = DANGER
    return Paragraph(
        f'<font name="Carlito-Bold" color="{color.hexval()}">{score}/{max_score}</font>',
        cell_center
    )

# Build document
output_path = '/home/z/my-project/download/Odysseus_vs_AENEWS_Audit_Comparatif.pdf'
doc = SimpleDocTemplate(
    output_path, pagesize=A4,
    leftMargin=LEFT_M, rightMargin=RIGHT_M,
    topMargin=TOP_M, bottomMargin=BOTTOM_M,
    title='Audit Comparatif: Odysseus vs AENEWS Agent OS X',
    author='Z.ai',
    subject='Analyse comparative de deux systemes d\'agents IA'
)

story = []

# ========== COVER ==========
story.append(Spacer(1, 40*mm))
story.append(HRFlowable(width="80%", thickness=2, color=ACCENT, spaceAfter=10))
story.append(Paragraph('AUDIT COMPARATIF', title_style))
story.append(Paragraph('Odysseus vs AENEWS Agent OS X', ParagraphStyle(
    'SubTitle2', parent=title_style, fontSize=20, textColor=ACCENT, spaceAfter=8
)))
story.append(HRFlowable(width="80%", thickness=2, color=ACCENT, spaceBefore=10, spaceAfter=20))
story.append(Paragraph(
    'Analyse croisee de deux systemes d\'agents IA autonomes :<br/>'
    'similitudes architecturales, ecarts de maturite, et leviers d\'amelioration',
    subtitle_style
))
story.append(Spacer(1, 15*mm))

# Score comparison box
score_data = [
    [Paragraph('<font name="Carlito-Bold" color="white">PROJET</font>', header_cell),
     Paragraph('<font name="Carlito-Bold" color="white">SCORE GLOBAL</font>', header_cell),
     Paragraph('<font name="Carlito-Bold" color="white">SECURITE</font>', header_cell),
     Paragraph('<font name="Carlito-Bold" color="white">ARCHITECTURE</font>', header_cell),
     Paragraph('<font name="Carlito-Bold" color="white">PRODUCTION</font>', header_cell)],
    [Paragraph('<font name="Carlito-Bold">Odysseus</font>', cell_style),
     score_bar(78),
     score_bar(85),
     score_bar(72),
     score_bar(80)],
    [Paragraph('<font name="Carlito-Bold">AENEWS Agent OS X</font>', cell_style),
     score_bar(43),
     score_bar(25),
     score_bar(45),
     score_bar(30)],
]
score_table = Table(score_data, colWidths=[CONTENT_W*0.28, CONTENT_W*0.18, CONTENT_W*0.18, CONTENT_W*0.18, CONTENT_W*0.18])
score_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER),
    ('TEXTCOLOR', (0, 0), (-1, 0), white),
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
    ('BACKGROUND', (0, 1), (-1, 1), HexColor('#f0fff0')),
    ('BACKGROUND', (0, 2), (-1, 2), HexColor('#fff0f0')),
]))
story.append(score_table)

story.append(Spacer(1, 15*mm))
story.append(Paragraph(
    '<font name="Carlito" size="9" color="#6c757d">'
    'Date : 15 juin 2026 | Auditeur : Z.ai | Classification : Confidentiel</font>',
    ParagraphStyle('Footer', parent=body_style, alignment=TA_CENTER, textColor=MUTED)
))

story.append(PageBreak())

# ========== TABLE OF CONTENTS ==========
story.append(Paragraph('TABLE DES MATIERES', h1_style))
story.append(Spacer(1, 5*mm))

toc_items = [
    ('1', 'Presentation des deux projets'),
    ('2', 'Architecture : confrontation des stacks'),
    ('3', 'Securite : Odysseus comme reference'),
    ('4', 'Systeme d\'agents : approches comparees'),
    ('5', 'Frontend & UX : maturite et fonctionnalite'),
    ('6', 'Bases de donnees & persistance'),
    ('7', 'DevOps & deploiement'),
    ('8', 'Tests & qualite'),
    ('9', 'Ce qu\'AENEWS peut emprunter a Odysseus'),
    ('10', 'Ce qu\'Odysseus peut emprunter a AENEWS'),
    ('11', 'Plan d\'action prioritaire pour AENEWS'),
    ('12', 'Conclusion & verdict'),
]
for num, title in toc_items:
    story.append(Paragraph(
        f'<font name="Carlito-Bold" color="{ACCENT.hexval()}">{num}.</font> '
        f'<font name="Carlito">{title}</font>',
        ParagraphStyle('TOC', parent=body_style, fontSize=10, spaceAfter=4, leading=16)
    ))

story.append(PageBreak())

# ========== SECTION 1: PRESENTATION ==========
story.append(Paragraph('1. Presentation des deux projets', h1_style))
story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceAfter=8))

story.append(Paragraph('1.1 Odysseus', h2_style))
story.append(Paragraph(
    'Odysseus est un workspace IA self-hosted concu comme une alternative auto-hebergee a ChatGPT et Claude. '
    'Le projet se concentre sur la vie privee et le controle local des donnees. Il propose une interface chat multi-modeles, '
    'un agent autonome avec acces outils (shell, web, fichiers, memoire), un cookbook de modeles avec recommandations '
    'materielles, un module de recherche approfondie, un editeur de documents avec assistance IA, une gestion email IMAP/SMTP '
    'avec triage automatique, un calendrier CalDAV, et un systeme de memoire vectorielle persistante. '
    'Le tout est ecrit en Python avec FastAPI, un frontend vanilla JS/HTML/CSS, et SQLite comme base de donnees principale.',
    body_style
))
story.append(Paragraph(
    'La philosophie d\'Odysseus est clairement exprimee dans son THREAT_MODEL.md : "designed for trusted users on a private network, '
    'not public exposure". C\'est un outil personnel, pas un SaaS. Cette decision architecturale simplifie enormement les choix '
    'de securite (pas de multi-tenant, pas de rate-limiting agressif, pas de chiffrement au repos obligatoire) mais limite la portee '
    'du projet au marche du self-hosting. Le projet est licensie AGPL-3.0.',
    body_style
))

story.append(Paragraph('1.2 AENEWS Agent OS X', h2_style))
story.append(Paragraph(
    'AENEWS Agent OS X est un systeme d\'exploitation pour agents IA multi-clusters, ambitionnant 14 clusters d\'agents '
    '(browser, computer, coding, office, marketing, business, infrastructure, security, meta-intelligence, llm-intelligence, '
    'intelligent-orchestration, watchdog, self-evolution, certification). Le backend est en NestJS 11 (backend/) avec un second '
    'backend NestJS 10 (src/) creant un probleme de dual-codebase. Le frontend est en Next.js 16 avec React 19 et Tailwind 4. '
    'L\'infrastructure prevue inclut PostgreSQL, Redis, Neo4j, Qdrant, RabbitMQ, MinIO et Bull. '
    'Le projet vise clairement un marche enterprise/SaaS multi-tenant avec authentification JWT, RolesGuard, et TenantScoped.',
    body_style
))
story.append(Paragraph(
    'Cependant, l\'audit precedent a revele un score de 43/100 : environ 70% des clusters agents sont des squelettes, '
    '~25% de code mort, des vulnerabilites de securite critiques (injection Cypher, escalation de role, 66+ endpoints non authentifies), '
    'et un frontend dependant a 80% de mock data. L\'ambition est considerable mais l\'execution reste largement incomplète.',
    body_style
))

story.append(Paragraph('1.3 Comparaison synthetique', h2_style))

comp_headers = ['Dimension', 'Odysseus', 'AENEWS Agent OS X']
comp_rows = [
    ['Philosophie', 'Self-hosted, privacy-first, single-user focus', 'Enterprise SaaS, multi-tenant, 14-agent clusters'],
    ['Stack backend', 'Python / FastAPI / SQLAlchemy', 'NestJS 11 + NestJS 10 (dual-codebase)'],
    ['Stack frontend', 'Vanilla JS/HTML/CSS (monolithique)', 'Next.js 16 / React 19 / Tailwind 4'],
    ['Base de donnees', 'SQLite (default) / PostgreSQL', 'PostgreSQL + Redis + Neo4j + Qdrant'],
    ['Authentification', 'bcrypt + sessions + 2FA TOTP', 'JWT + RolesGuard (incomplet)'],
    ['Agents IA', '1 agent multi-outils (shell, web, files, email, calendar)', '14 clusters declares, 70% squelettes'],
    ['Securite', 'Threat model documente, prompt injection hardening, SSRF protection', 'Vulnerabilites critiques, pas de threat model'],
    ['Maturite', 'Production-ready (v1.0), Docker, PWA, mobile', 'Pre-alpha, mock data, double API prefix bug'],
    ['Licence', 'AGPL-3.0', 'Non specifiee'],
    ['Lignes de code', '~143 fichiers source, ~50 routes, ~92 modules src', '~200+ fichiers, architecture plus large mais creuse'],
]
story.append(make_table(comp_headers, comp_rows, [CONTENT_W*0.18, CONTENT_W*0.41, CONTENT_W*0.41]))

story.append(PageBreak())

# ========== SECTION 2: ARCHITECTURE ==========
story.append(Paragraph('2. Architecture : confrontation des stacks', h1_style))
story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceAfter=8))

story.append(Paragraph('2.1 Monolith vs Microservices', h2_style))
story.append(Paragraph(
    'Odysseus adopte une architecture monolithique classique : un seul processus FastAPI (app.py) qui enregistre ~50 routeurs, '
    'avec un dossier static/ servant le frontend vanilla. Cette approche est simple a deployer (un seul conteneur Docker), '
    'facile a debugger, et parfaitement adaptee au cas d\'usage self-hosted. La base SQLite par defaut evite toute dependance '
    'externe, et PostgreSQL est disponible via DATABASE_URL pour les deploiements plus lourds. Le frontend est un SPA vanilla '
    'sans framework, ce qui elimine completement les problemes de build, de SSR, et de dependances npm.',
    body_style
))
story.append(Paragraph(
    'AENEWS, a l\'inverse, vise une architecture microservices avec un backend NestJS 11 principal (backend/), un second '
    'backend NestJS 10 heritage (src/), un frontend Next.js 16 separe, et pas moins de 7 services d\'infrastructure '
    '(PostgreSQL, Redis, Neo4j, Qdrant, RabbitMQ, MinIO, Bull). Cette architecture est theoriquement plus scalable mais '
    'introduit une complexite operationnelle considerable : le double codebase backend cree de la confusion sur les routes, '
    'le double prefix API (api/v1/api/v1/) genere des 404, et la plupart des services d\'infrastructure ne sont pas reellement '
    'utilises. Le cout de cette complexite non maitrisee est un projet qui ne fonctionne pas de bout en bout.',
    body_style
))

story.append(Paragraph('2.2 Lecons d\'Odysseus pour AENEWS', h2_style))
story.append(Paragraph(
    '<b>Lecon 1 : Commencer par un monolithe qui fonctionne.</b> Odysseus prouve qu\'un monolithe bien structure '
    'avec des modules clairement separes (50 routes dans des fichiers dedies) est plus maintenable qu\'une pseudo-architecture '
    'microservices ou la plupart des composants sont des coquilles vides. AENEWS devrait consolider ses deux backends en un seul '
    'NestJS 11, et s\'assurer que chaque module fonctionne avant d\'en ajouter de nouveaux.',
    body_style
))
story.append(Paragraph(
    '<b>Lecon 2 : Le frontend n\'a pas besoin d\'etre complexe pour etre fonctionnel.</b> Le frontend vanilla d\'Odysseus '
    'est monolithique (app.js) mais il fonctionne : chat, agents, documents, email, calendrier, research, cookbook - tout est '
    'operationnel. Le frontend Next.js d\'AENEWS est techniquement plus avance (React 19, TanStack Query, Tailwind 4) mais '
    '80% des pages affichent des mock data. La sophistication technique ne compense pas l\'absence de fonctionnalite.',
    body_style
))
story.append(Paragraph(
    '<b>Lecon 3 : L\'infrastructure doit etre justifiee, pas anticipee.</b> Odysseus utilise SQLite par defaut et ne deploie '
    'ChromaDB, SearXNG et ntfy que lorsque c\'est necessaire. AENEWS declare 7 services d\'infrastructure dont la plupart '
    'ne sont pas connectes. Chaque dependance est un cout (maintenance, debugging, Docker ressources) qui doit etre paye '
    'par une fonctionnalite reelle.',
    body_style
))

story.append(Paragraph('2.3 Structure des modules', h2_style))

mod_headers = ['Aspect', 'Odysseus', 'AENEWS']
mod_rows = [
    ['Nombre de routes', '51 fichiers de routes (chacun focalise)', '~30 contrôleurs (beaucoup vides)'],
    ['Separation des couches', 'routes/ (HTTP) + src/ (logique) + services/ (metier)', 'Contrôleurs + services melanges, logique dans les contrôleurs'],
    ['Models / DB', 'SQLAlchemy declaratif, 20+ models avec relations', 'Prisma schema (incomplet), 3 init-db.sql contradictoires'],
    ['Frontend modules', 'static/js/ (modulaire), app.js (entry)', 'components/ + hooks/ + pages/ (React, 15/21 hooks inutilises)'],
    ['Config', '.env.example complet, settings.py centralise', 'Variables eparses, secrets hardcodés dans le code'],
]
story.append(make_table(mod_headers, mod_rows, [CONTENT_W*0.18, CONTENT_W*0.41, CONTENT_W*0.41]))

story.append(PageBreak())

# ========== SECTION 3: SECURITY ==========
story.append(Paragraph('3. Securite : Odysseus comme reference', h1_style))
story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceAfter=8))

story.append(Paragraph(
    'C\'est dans le domaine de la securite que l\'ecart entre les deux projets est le plus frappant. Odysseus dispose d\'un '
    'THREAT_MODEL.md detaille, d\'un SECURITY.md, d\'un systeme d\'authentification complet (bcrypt + sessions + 2FA TOTP + '
    'backup codes), et de mesures de protection avancees que AENEWS n\'a tout simplement pas.',
    body_style
))

story.append(Paragraph('3.1 Authentification et autorisation', h2_style))

auth_headers = ['Mesure de securite', 'Odysseus', 'AENEWS']
auth_rows = [
    ['Hash mots de passe', 'bcrypt (cost factor auto)', 'bcrypt (via NestJS)'],
    ['Session management', 'Tokens 7 jours, atomic write, orphan session re-validation', 'JWT avec secret hardcodé en fallback'],
    ['2FA', 'TOTP + 8 backup codes', 'Non implemente'],
    ['Reserved usernames', 'internal-tool, api, demo, system (empeche l\'impersonnation)', 'Non implemente'],
    ['Role-based access', 'Admin vs Non-admin + privileges granulaires par utilisateur', 'RolesGuard + @Roles() mais 66+ endpoints non proteges'],
    ['Internal tool loopback', 'Token cryptographique par processus (secrets.token_hex(32)), jamais persiste', 'Non implemente - les outils agents n\'ont pas de canal securise'],
    ['Orphan session cleanup', 'validate_token re-verify user existence on every call', 'Non implemente'],
    ['Open signup control', 'Desactivable via auth.json, admin-gated', 'RegisterDto permet role escalation (SUPER_ADMIN)'],
]
story.append(make_table(auth_headers, auth_rows, [CONTENT_W*0.25, CONTENT_W*0.375, CONTENT_W*0.375]))

story.append(Paragraph('3.2 Protection contre les injections', h2_style))
story.append(Paragraph(
    'Odysseus implemente un ensemble de protections anti-injection que AENEWS n\'a pas du tout. Le fichier '
    'src/prompt_security.py definit un mecanisme de "sandboxing" du contenu non fiable : chaque contenu externe '
    '(resultats web, emails, pages fetchees, memoires) est enveloppe dans un bloc GUARD_OPEN/GUARD_CLOSE avec un '
    'en-tete explicite indiquant au modele de ne pas suivre les instructions trouvees dans ce contenu. Les delimiters '
    'sont echappés pour empecher les attaques de breakout. Le systeme UNTRUSTED_CONTEXT_POLICY est injecte en preamble '
    'de chaque session ou des donnees non fiables peuvent apparaitre.',
    body_style
))
story.append(Paragraph(
    'AENEWS, a l\'inverse, a une vulnerabilite d\'injection Cypher critique dans intelligence.controller.ts '
    '(POST /graph/query) ou l\'utilisateur peut envoyer du Cypher directement sans parametrisation. Il n\'y a '
    'aucun mecanisme de protection contre la prompt injection dans les contenus envoyes aux modeles LLM, et le '
    'controller software-factory a une vulnerabilite de path traversal dans le endpoint de download.',
    body_style
))

story.append(Paragraph('3.3 Protection SSRF et URL', h2_style))
story.append(Paragraph(
    'Odysseus implemente une protection SSRF complete dans src/url_security.py : validation des URLs sortantes, '
    'resolution DNS pour detecter les IPs internes, blocage des plages RFC 1918 (10.x, 172.16.x, 192.168.x), '
    'des loopback, des link-local, et des multicast. La fonction validate_public_http_url() est utilisee pour '
    'toute URL fournie par l\'utilisateur avant toute requete sortante. AENEWS n\'a aucune protection SSRF : les '
    'URLs saisies par l\'utilisateur sont utilisees directement sans validation.',
    body_style
))

story.append(Paragraph('3.4 Chiffrement au repos', h2_style))
story.append(Paragraph(
    'Odysseus chiffre les secrets en base (mots de passe IMAP/SMTP) via Fernet (secret_storage.py) avec une cle '
    'generee dans data/.app_key (mode 0o600). Le type SQLAlchemy EncryptedText permet un chiffrement transparent '
    'au niveau des colonnes. AENEWS n\'a aucun chiffrement au repos : les tokens et secrets sont stockes en clair, '
    'et le JWT secret a un fallback hardcodé ("your-secret-key") dans le code source.',
    body_style
))

story.append(Paragraph('3.5 Securite des outils agents', h2_style))

toolsec_headers = ['Protection', 'Odysseus', 'AENEWS']
toolsec_rows = [
    ['Non-admin tool blocking', '36 outils bloques pour les non-admins (shell, files, email, MCP, vault, model serving)', 'Aucun controle d\'acces au niveau des outils'],
    ['Plan mode (read-only)', 'Allowlist de 21 outils read-only, tout nouveau outil bloque par defaut', 'Non implemente'],
    ['MCP tool restriction', 'Tout outil mcp__* bloque pour non-admins', 'Non implemente'],
    ['Tool policy engine', 'tool_policy.py avec directives (GUIDE_ONLY, etc.)', 'Non implemente'],
    ['Owner verification', 'owner_is_admin_or_single_user() avant chaque appel loopback', 'Non implemente'],
    ['Agent round limits', 'MAX_AGENT_ROUNDS + 60s timeout par outil', 'Non configure'],
]
story.append(make_table(toolsec_headers, toolsec_rows, [CONTENT_W*0.25, CONTENT_W*0.375, CONTENT_W*0.375]))

story.append(PageBreak())

# ========== SECTION 4: AGENT SYSTEM ==========
story.append(Paragraph('4. Systeme d\'agents : approches comparees', h1_style))
story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceAfter=8))

story.append(Paragraph('4.1 Approche d\'Odysseus : un agent, beaucoup d\'outils', h2_style))
story.append(Paragraph(
    'Odysseus adopte une approche "agent unique, outils multiples" extremement pragmatique. Le fichier agent_loop.py '
    '(174K caracteres, le plus gros du projet) implemente une boucle d\'agent streaming qui enveloppe stream_llm() '
    'avec une execution multi-tours d\'outils. Le LLM decide quand utiliser des outils en ecrivant des blocs de code '
    'fence avec le nom de l\'outil comme tag de langue. Les outils disponibles incluent : shell (bash), python, '
    'web_search, web_fetch, read_file, write_file, edit_file, grep, glob, ls, create_document, edit_document, '
    'manage_memory, manage_skills, manage_tasks, manage_mcp, manage_webhooks, manage_tokens, send_email, reply_to_email, '
    'list_emails, read_email, manage_calendar, vault_search, vault_get, download_model, serve_model, et plus encore.',
    body_style
))
story.append(Paragraph(
    'Cette approche a l\'avantage d\'etre completement fonctionnelle : chaque outil est implemente, teste, et securise. '
    'L\'agent peut reellement executer des commandes shell, chercher sur le web, lire/ecrire des fichiers, gerer des emails, '
    'et creer des documents. Le systeme MCP (Model Context Protocol) permet d\'ajouter des outils externes via des serveurs '
    'dedies, avec un MCP manager qui gere le cycle de vie des connexions.',
    body_style
))

story.append(Paragraph('4.2 Approche d\'AENEWS : 14 clusters, 70% squelettes', h2_style))
story.append(Paragraph(
    'AENEWS declare 14 clusters d\'agents specialises : browser, computer, coding, office, marketing, business, '
    'infrastructure, security, meta-intelligence, llm-intelligence, intelligent-orchestration, watchdog, self-evolution, '
    'et certification. En theorie, cette architecture est plus ambitieuse et plus specialisee qu\'Odysseus. En pratique, '
    'seuls ~30% des clusters ont une implementation reelle utilisant le LLM. Les autres sont soit des squelettes avec '
    'des methodes notImplemented(), soit des coquilles vides retournant des donnees mock.',
    body_style
))
story.append(Paragraph(
    'Le delivery-connector.ts (src/software-factory/connectors/) contient 7 methodes notImplemented() sans logique. '
    'Les clusters meta-intelligence, self-evolution et certification n\'ont aucune implementation reelle. Le cluster '
    'intelligent-orchestration a un controleur avec le bug du double prefix API, rendant ses endpoints inaccessibles. '
    'En resume, l\'approche multi-clusters d\'AENEWS est architecturalement interessante mais operationnellement vide.',
    body_style
))

story.append(Paragraph('4.3 Comparaison des capacites agent reelles', h2_style))

agent_headers = ['Capacite', 'Odysseus', 'AENEWS']
agent_rows = [
    ['Chat multi-modeles', 'Operationnel (vLLM, llama.cpp, Ollama, OpenRouter, OpenAI, Copilot)', 'Partiel (1-2 providers, mock pour le reste)'],
    ['Execution shell', 'Operationnel (bash, avec securite admin-only)', 'Non implemente (notImplemented)'],
    ['Execution Python', 'Operationnel (sandbox basique, admin-only)', 'Non implemente'],
    ['Recherche web', 'Operationnel (SearXNG + web_search + web_fetch)', 'Mock data (pas de vrai moteur de recherche)'],
    ['Gestion fichiers', 'Operationnel (read/write/edit/grep/glob/ls)', 'Non implemente'],
    ['Gestion documents', 'Operationnel (create/edit/update document + AI assist)', 'Partiel (editeur frontend, pas de backend reel)'],
    ['Email', 'Operationnel (IMAP/SMTP + AI triage + auto-summary)', 'Non implemente'],
    ['Calendrier', 'Operationnel (CalDAV sync + .ics import/export)', 'Non implemente'],
    ['Memoire vectorielle', 'Operationnel (ChromaDB + fastembed ONNX)', 'Partiel (Qdrant declare, pas connecte)'],
    ['Deep Research', 'Operationnel (multi-step, source gathering, visual report)', 'Non implemente'],
    ['Model Cookbook', 'Operationnel (HW scan, model recommendation, download, serve)', 'Non implemente'],
    ['Model comparison', 'Operationnel (blind test, multi-model, synthesis)', 'Non implemente'],
    ['Orchestration multi-agents', 'Non applicable (agent unique)', 'Declare (14 clusters) mais non fonctionnel'],
]
story.append(make_table(agent_headers, agent_rows, [CONTENT_W*0.18, CONTENT_W*0.41, CONTENT_W*0.41]))

story.append(PageBreak())

# ========== SECTION 5: FRONTEND ==========
story.append(Paragraph('5. Frontend & UX : maturite et fonctionnalite', h1_style))
story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceAfter=8))

story.append(Paragraph('5.1 Approche frontend d\'Odysseus', h2_style))
story.append(Paragraph(
    'Odysseus utilise un frontend vanilla (HTML/CSS/JS pur) sans framework. Le fichier static/app.js est le point '
    'd\'entree, avec static/js/ contenant des modules specialises. Le CSS est dans static/style.css. Cette approche '
    'peut sembler archaique face a React/Vue/Svelte, mais elle a des avantages considerables pour un projet self-hosted : '
    'zero dependance npm, zero temps de build, deploiement par simple copie de fichiers, et debugging direct dans le '
    'navigateur sans source maps. Le frontend est responsive, installable en PWA (manifest.json + sw.js), et fonctionne '
    'sur mobile avec des gestes tactiles.',
    body_style
))
story.append(Paragraph(
    'Les fonctionnalites frontend reelles incluent : chat avec streaming, agent avec tool calls visuels, editeur de '
    'documents multi-onglets avec coloration syntaxique, visualisation de recherche approfondie, comparaison de modeles '
    'en aveugle, gestion email avec triage IA, calendrier avec synchronisation CalDAV, notes et taches avec rappels, '
    'et un cookbook de modeles avec scan materiel. Chaque bouton, chaque champ, chaque interaction a un backend reel.',
    body_style
))

story.append(Paragraph('5.2 Approche frontend d\'AENEWS', h2_style))
story.append(Paragraph(
    'AENEWS utilise Next.js 16 avec React 19, Tailwind 4, TanStack React Query, et Recharts. Techniquement, '
    'c\'est un stack moderne et puissant. Cependant, l\'audit a revele que le fichier mock-data.ts (376 lignes, '
    '13 datasets) est la source principale de donnees pour la plupart des pages. Le dashboard principal (page.tsx) '
    'utilise Math.random() pour generer les metriques des graphiques. La page admin affiche des donnees aleatoires. '
    'Les pages intelligence, swarm et orchestration sont a 100% mock inline. Le header a une barre de recherche '
    'et une cloche de notification sans handlers. Seules ~4 pages sur ~10 sont connectees a un backend reel.',
    body_style
))
story.append(Paragraph(
    'Le probleme de la cle de token est recurrent : certaines pages utilisent localStorage.getItem(\'token\') '
    'tandis que le store d\'authentification utilise \'auth_token\'. Ce simple mismatch rend les appels API '
    'inopérants sur plusieurs pages. Le frontend est visuellement impressionnant mais fonctionnellement creux.',
    body_style
))

story.append(Paragraph('5.3 Comparaison UX', h2_style))
ux_headers = ['Aspect UX', 'Odysseus', 'AENEWS']
ux_rows = [
    ['Chat streaming', 'Fonctionnel, multi-modeles', 'Fonctionnel, 1-2 modeles'],
    ['Agent tool calls visuels', 'Fonctionnel avec render dans iframes', 'Non implemente'],
    ['Deep Research UI', 'Rapports visuels multi-etapes', 'Non implemente'],
    ['Document editor', 'Multi-tab, Markdown/HTML/CSV, AI edits', 'Page basique, pas de backend'],
    ['Email client', 'IMAP/SMTP, triage IA, auto-tag', 'Non implemente'],
    ['Calendar', 'CalDAV, .ics, couleurs par calendrier', 'Non implemente'],
    ['Model comparison', 'Blind test, multi-model, synthesis', 'Non implemente'],
    ['Mobile', 'Responsive, PWA, touch gestures', 'Responsive CSS mais pas teste'],
    ['Search/Notifications', 'Fonctionnels', 'Ghost features (pas de handlers)'],
    ['Dark/Light theme', 'Theme editor operationnel', 'Tailwind dark mode (partiel)'],
]
story.append(make_table(ux_headers, ux_rows, [CONTENT_W*0.22, CONTENT_W*0.39, CONTENT_W*0.39]))

story.append(PageBreak())

# ========== SECTION 6: DATABASE ==========
story.append(Paragraph('6. Bases de donnees & persistance', h1_style))
story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceAfter=8))

story.append(Paragraph(
    'Odysseus utilise SQLAlchemy avec un modele declaratif complet. Le fichier core/database.py (93K caracteres) '
    'definit plus de 20 modeles avec des relations, des index, et un type EncryptedText pour le chiffrement transparent '
    'des colonnes sensibles. La base par defaut est SQLite, ce qui elimine toute dependance externe pour un deploiement '
    'self-hosted. PostgreSQL est supporte via DATABASE_URL. Les migrations sont gerees par des create_all() et des '
    'migrations incrementales dans setup.py. Les sessions sont stockees atomiquement via core/atomic_io.py pour '
    'eviter la corruption de fichiers.',
    body_style
))
story.append(Paragraph(
    'AENEWS utilise Prisma ORM avec PostgreSQL, mais le schema est incomplet et il existe 3 fichiers init-db.sql '
    'contradictoires (un dans le repo principal, un dans backend/, un dans docker/). Neo4j est declare pour le '
    'cluster intelligence mais le controleur d\'injection Cypher suggere une utilisation naive. Qdrant est declare '
    'pour les embeddings vectoriels mais n\'est pas connecte. Redis est configure pour les sessions et le cache Bull '
    'mais son utilisation reelle est limitee. La consequence est une couche de persistance fragmentee et incoherente.',
    body_style
))

db_headers = ['Aspect', 'Odysseus', 'AENEWS']
db_rows = [
    ['ORM', 'SQLAlchemy (mature, type-safe)', 'Prisma (moderne, schema incomplet)'],
    ['Modeles definis', '20+ avec relations, index, EncryptedText', '~10, beaucoup sans implementation reelle'],
    ['DB par defaut', 'SQLite (zero config)', 'PostgreSQL (necessite infrastructure)'],
    ['Migrations', 'create_all() + setup.py', '3 init-db.sql contradictoires'],
    ['Vector store', 'ChromaDB + fastembed (ONNX)', 'Qdrant (declare, pas connecte)'],
    ['Graph DB', 'Non utilise', 'Neo4j (injection Cypher critique)'],
    ['Cache', 'In-memory (_response_cache, _dead_hosts)', 'Redis (declare, usage limite)'],
    ['Queue', 'Non applicable (monolithe synchrone)', 'Bull + RabbitMQ (declares, pas verifies)'],
    ['Secrets au repos', 'Fernet encryption (transparent)', 'Aucun chiffrement'],
    ['Atomic IO', 'atomic_write_json pour sessions', 'Non implemente'],
]
story.append(make_table(db_headers, db_rows, [CONTENT_W*0.2, CONTENT_W*0.4, CONTENT_W*0.4]))

story.append(PageBreak())

# ========== SECTION 7: DEVOPS ==========
story.append(Paragraph('7. DevOps & deploiement', h1_style))
story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceAfter=8))

story.append(Paragraph(
    'Odysseus est deployable en une commande : git clone, cp .env.example .env, docker compose up -d --build. '
    'Le Dockerfile est optimise, le docker-compose.yml inclut ChromaDB, SearXNG et ntfy, et il existe des overlays GPU '
    'pour NVIDIA et AMD. Les scripts de diagnostic GPU (check-docker-gpu.sh, check-docker-amd-gpu.sh) sont fournis. '
    'Le setup.py cree les repertoires, initialise la DB, et genere un mot de passe admin temporaire affiche dans les logs. '
    'Il existe aussi des scripts natifs pour macOS (start-macos.sh), Windows (launch-windows.ps1), et un installateur '
    'systemd (install-service.sh).',
    body_style
))
story.append(Paragraph(
    'AENEWS a un Dockerfile et un docker-compose.yml mais l\'audit precedent a identifie des problemes : le double '
    'backend n\'est pas correctement orchestre, les services d\'infrastructure (Neo4j, Qdrant, RabbitMQ) sont declares '
    'mais pas verifies comme fonctionnels, et il n\'y a pas de health checks. Le processus de deploiement n\'est pas '
    'documente de bout en bout, et les scripts de setup manquent. Le CORS wildcard (Access-Control-Allow-Origin: *) '
    'dans src/main.ts est un probleme de securite pour tout deploiement reel.',
    body_style
))

devops_headers = ['Aspect', 'Odysseus', 'AENEWS']
devops_rows = [
    ['Docker Compose', '1 commande, 4 services (app, ChromaDB, SearXNG, ntfy)', 'Declare, non verifie de bout en bout'],
    ['GPU support', 'NVIDIA + AMD overlays + scripts de diagnostic', 'Non configure'],
    ['Setup script', 'setup.py (idempotent, safe to re-run)', 'Incomplet / absent'],
    ['Health checks', 'Docker HEALTHCHECK + readiness.py', 'Non implementes'],
    ['HTTPS support', 'Documente (mkcert, reverse proxy)', 'Non documente'],
    ['Systemd service', 'install-service.sh + odysseus-ui.service', 'Non configure'],
    ['macOS native', 'start-macos.sh + build-macos-app.sh', 'Non supporte'],
    ['Windows native', 'launch-windows.ps1', 'Non supporte'],
    ['PWA', 'manifest.json + sw.js', 'Non implemente'],
    ['CORS', 'CORSMiddleware avec origines configurables', 'Wildcard (*) dans src/main.ts'],
]
story.append(make_table(devops_headers, devops_rows, [CONTENT_W*0.2, CONTENT_W*0.4, CONTENT_W*0.4]))

# ========== SECTION 8: TESTS ==========
story.append(Paragraph('8. Tests & qualite', h1_style))
story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceAfter=8))

story.append(Paragraph(
    'Odysseus inclut un repertoire tests/ avec pytest et pytest-asyncio comme dependances. Le middleware est concu '
    'pour etre testable unitairement (is_cors_preflight est "pure so it can be unit-tested without standing up the app"). '
    'Le rate limiter a des tests de concurrence (threading.Lock pour _host_fails). Les contributions sont guidees par '
    'CONTRIBUTING.md avec des instructions de setup, de test, et de PR.',
    body_style
))
story.append(Paragraph(
    'AENEWS n\'a pas de suite de tests identifiee. L\'audit precedent n\'a trouve aucun fichier de test, aucune '
    'configuration CI/CD, et aucune couverture de code. C\'est un risque majeur pour un projet qui vise le marche '
    'enterprise : sans tests, chaque modification est une regression potentielle.',
    body_style
))

# ========== SECTION 9: WHAT AENEWS CAN BORROW ==========
story.append(PageBreak())
story.append(Paragraph('9. Ce qu\'AENEWS peut emprunter a Odysseus', h1_style))
story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceAfter=8))

story.append(Paragraph(
    'L\'analyse comparative revele que Odysseus, malgre sa portee plus restreinte, a resolu beaucoup des problemes '
    'qu\'AENEWS rencontre encore. Voici les emprunts prioritaires, classes par impact.',
    body_style
))

story.append(Paragraph('9.1 Emprunts critiques (securite)', h2_style))

borrow_sec = [
    ['Prompt injection hardening', 'src/prompt_security.py', 'Wrapper GUARD_OPEN/GUARD_CLOSE + UNTRUSTED_CONTEXT_POLICY pour tout contenu externe envoye au LLM. Critique pour AENEWS qui envoie des requetes utilisateur directement au LLM sans sandboxing.'],
    ['SSRF protection', 'src/url_security.py', 'Validation DNS + blocage des plages RFC 1918 pour toute URL fournie par l\'utilisateur. AENEWS n\'a aucune protection contre les requetes vers des services internes.'],
    ['Reserved usernames', 'core/auth.py', 'Empecher la creation de comptes avec des noms reserves (internal-tool, api, demo, system). AENEWS permet l\'escalation de role via RegisterDto.'],
    ['Tool security policy', 'src/tool_security.py', '36 outils bloques pour les non-admins, allowlist pour le plan mode, blocage de tous les outils MCP__. AENEWS n\'a aucun controle d\'acces au niveau des outils agents.'],
    ['Fernet encryption at rest', 'src/secret_storage.py', 'Chiffrement transparent des colonnes sensibles en base. Elimine le risque d\'exfiltration de la base SQLite/PostgreSQL.'],
    ['Internal tool loopback', 'core/middleware.py', 'Token cryptographique par processus pour les appels loopback des outils agents. Jamais persiste, jamais envoye aux clients.'],
    ['Threat model document', 'THREAT_MODEL.md', 'Document formel definissant la boundary de confiance, les roles, les capacites, et les vecteurs d\'attaque. AENEWS n\'en a pas.'],
]

for item in borrow_sec:
    story.append(Paragraph(
        f'<b><font color="{ACCENT.hexval()}">{item[0]}</font></b> <font size="8" color="#6c757d">({item[1]})</font><br/>'
        f'{item[2]}',
        ParagraphStyle('BorrowItem', parent=body_style, leftIndent=10, spaceBefore=6, spaceAfter=4)
    ))

story.append(Paragraph('9.2 Emprunts importants (architecture)', h2_style))

borrow_arch = [
    ['Atomic IO pour sessions', 'core/atomic_io.py', 'Ecriture atomique des fichiers JSON de session pour eviter la corruption. AENEWS devrait l\'adopter pour tous les fichiers critiques.'],
    ['Dead host cooldown', 'src/llm_core.py', 'Marquage des hotes LLM inaccessibles avec cooldown progressif. Evite les timeouts cascades quand un fournisseur est down. AENEWS devrait implementer ce pattern pour la resilience multi-provider.'],
    ['Response cache', 'src/llm_core.py', 'Cache SHA256 des reponses LLM pour eviter les appels redondants. AENEWS devrait implementer un cache similaire avec invalidation intelligente.'],
    ['Rate limiter sliding window', 'src/rate_limiter.py', 'Rate limiter generique par IP avec fenetre glissante et nettoyage periodique. AENEWS n\'a aucun rate limiting.'],
    ['Modular route structure', 'routes/', '51 fichiers de routes, chacun focalise sur un domaine. AENEWS devrait restructurer ses contrôleurs pour eviter la logique metier dans les handlers HTTP.'],
]

for item in borrow_arch:
    story.append(Paragraph(
        f'<b><font color="{ACCENT.hexval()}">{item[0]}</font></b> <font size="8" color="#6c757d">({item[1]})</font><br/>'
        f'{item[2]}',
        ParagraphStyle('BorrowItem', parent=body_style, leftIndent=10, spaceBefore=6, spaceAfter=4)
    ))

story.append(Paragraph('9.3 Emprunts utiles (features)', h2_style))

borrow_feat = [
    ['Deep Research', 'src/deep_research.py', 'Module multi-etapes de collecte, lecture et synthese de sources avec rapport visuel. Adaptation du projet Tongyi DeepResearch. AENEWS pourrait l\'integrer dans le cluster llm-intelligence.'],
    ['Model Cookbook', 'services/hwfit/', 'Scan materiel, recommandation de modeles, telechargement et serving. Base sur llmfit. AENEWS pourrait l\'integrer dans le cluster infrastructure.'],
    ['Memory / Skills system', 'src/memory.py + src/memory_vector.py', 'Memoire persistante avec retrieval vectoriel + keyword, import/export. AENEWS devrait s\'en inspirer pour le cluster meta-intelligence.'],
    ['Calendar + Email AI integration', 'routes/calendar_routes.py + routes/email_routes.py', 'Integration CalDAV + IMAP/SMTP avec triage IA. AENEWS pourrait les integrer dans le cluster office.'],
    ['MCP server management', 'src/mcp_manager.py + routes/mcp_routes.py', 'Gestion du cycle de vie des serveurs MCP avec outils bloquables par serveur. AENEWS devrait adopter MCP pour standardiser l\'acces aux outils agents.'],
]

for item in borrow_feat:
    story.append(Paragraph(
        f'<b><font color="{ACCENT.hexval()}">{item[0]}</font></b> <font size="8" color="#6c757d">({item[1]})</font><br/>'
        f'{item[2]}',
        ParagraphStyle('BorrowItem', parent=body_style, leftIndent=10, spaceBefore=6, spaceAfter=4)
    ))

story.append(PageBreak())

# ========== SECTION 10: WHAT ODYSSEUS CAN BORROW ==========
story.append(Paragraph('10. Ce qu\'Odysseus peut emprunter a AENEWS', h1_style))
story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceAfter=8))

story.append(Paragraph(
    'Malgre ses lacunes, AENEWS a des idees architecturales que Odysseus pourrait considerer pour evoluer '
    'au-dela du self-hosted single-user.',
    body_style
))

borrow_back = [
    ['Multi-tenant architecture', 'L\'architecture TenantScoped() d\'AENEWS (bien qu\'incomplete) est une base pour faire evoluer Odysseus vers un produit SaaS. Odysseus est actuellement single-user par conception.'],
    ['Cluster-based agent specialisation', 'Les 14 clusters d\'AENEWS representent une vision de specialisation des agents que Odysseus n\'a pas. Un agent "browser" dedie, un agent "coding" dedie, etc. pourrait ameliorer la qualite des reponses par domaine.'],
    ['Modern frontend framework', 'React/Next.js avec TanStack Query offre une meilleure developer experience, du SSR, et une gestion d\'etat plus structuree que le vanilla JS d\'Odysseus. Pour un projet qui grandit, un framework moderne devient necessaire.'],
    ['WebSocket real-time updates', 'AENEWS utilise Socket.IO pour les mises a jour en temps reel. Odysseus utilise du polling ou du streaming HTTP. Les WebSockets ameliorent la reactivite pour les longues taches agent.'],
    ['Graph database for knowledge', 'L\'utilisation de Neo4j par AENEWS pour les graphes de connaissances est pertinente. Odysseus n\'a que ChromaDB pour le RAG. Un graph database permettrait des requetes relationnelles plus riches sur les memoires et les interactions.'],
    ['Microservices readiness', 'Meme si l\'execution est incomplete, la reflexion microservices d\'AENEWS (separation des clusters, queues Bull/RabbitMQ) prepare l\'echelle. Odysseus devra un jour decomposer son monolithe s\'il veut supporter des deploiements plus larges.'],
]

for item in borrow_back:
    story.append(Paragraph(
        f'<b><font color="{HIGHLIGHT.hexval()}">{item[0]}</font></b><br/>'
        f'{item[1]}',
        ParagraphStyle('BorrowBack', parent=body_style, leftIndent=10, spaceBefore=8, spaceAfter=4)
    ))

# ========== SECTION 11: ACTION PLAN ==========
story.append(Paragraph('11. Plan d\'action prioritaire pour AENEWS', h1_style))
story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceAfter=8))

story.append(Paragraph(
    'En s\'inspirant des patterns qui font le succes d\'Odysseus, voici le plan d\'action prioritaire '
    'pour transformer AENEWS Agent OS X en projet production-ready.',
    body_style
))

story.append(Paragraph('11.1 Phase 1 : Securite (priorite critique)', h2_style))
p1_items = [
    'Implementer prompt_security.py (sandboxing du contenu non fiable) - directement inspire d\'Odysseus',
    'Ajouter url_security.py (protection SSRF avec validation DNS) - directement inspire d\'Odysseus',
    'Corriger l\'injection Cypher dans intelligence.controller.ts (parametrisation des requetes)',
    'Corriger le path traversal dans software-factory.controller.ts (validation de chemin)',
    'Ajouter un threat model document (THREAT_MODEL.md) inspire de celui d\'Odysseus',
    'Supprimer le fallback JWT hardcodé et forcer les variables d\'environnement',
    'Corriger RegisterDto pour interdire la specification du role a l\'inscription',
    'Ajouter des reserved usernames et empecher l\'impersonnation',
    'Ajouter le chiffrement au repos pour les secrets (inspire de secret_storage.py)',
    'Ajouter 2FA TOTP pour les comptes admin',
]
for i, item in enumerate(p1_items, 1):
    story.append(Paragraph(
        f'<font color="{DANGER.hexval()}">{i}.</font> {item}',
        ParagraphStyle('ActionItem', parent=bullet_style, leftIndent=25, spaceAfter=3)
    ))

story.append(Paragraph('11.2 Phase 2 : Architecture (priorite haute)', h2_style))
p2_items = [
    'Consolider les deux backends en un seul NestJS 11 (supprimer src/)',
    'Corriger le double prefix API (supprimer api/v1 des @Controller())',
    'Corriger le mismatch de cle de token (token vs auth_token)',
    'Consolider les 3 init-db.sql en un seul schema coherent',
    'Ajouter atomic_io pour les ecritures critiques',
    'Implementer le dead-host cooldown pour les providers LLM',
    'Ajouter un rate limiter par IP (inspire d\'Odysseus)',
    'Ajouter des health checks Docker pour chaque service',
]
for i, item in enumerate(p2_items, 1):
    story.append(Paragraph(
        f'<font color="{WARNING.hexval()}">{i}.</font> {item}',
        ParagraphStyle('ActionItem', parent=bullet_style, leftIndent=25, spaceAfter=3)
    ))

story.append(Paragraph('11.3 Phase 3 : Fonctionnalite (priorite moyenne)', h2_style))
p3_items = [
    'Supprimer mock-data.ts et connecter toutes les pages au backend reel',
    'Implementer les 7 methodes notImplemented() du delivery-connector',
    'Ajouter les handlers pour les ghost features (search bar, notifications)',
    'Implementer Deep Research (adapter le module d\'Odysseus)',
    'Implementer le systeme de memoire vectorielle (Qdrant ou ChromaDB)',
    'Ajouter MCP pour standardiser l\'acces aux outils agents',
    'Supprimer les 15/21 hooks inutilises et le code mort',
    'Ajouter une suite de tests (pytest + jest) avec CI/CD',
]
for i, item in enumerate(p3_items, 1):
    story.append(Paragraph(
        f'<font color="{INFO.hexval()}">{i}.</font> {item}',
        ParagraphStyle('ActionItem', parent=bullet_style, leftIndent=25, spaceAfter=3)
    ))

story.append(PageBreak())

# ========== SECTION 12: CONCLUSION ==========
story.append(Paragraph('12. Conclusion & verdict', h1_style))
story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceAfter=8))

story.append(Paragraph(
    'L\'analyse comparative entre Odysseus et AENEWS Agent OS X revele deux projets avec des ambitions radicalement '
    'differentes mais des problemes de maturite partiellement similaires. Odysseus est un projet qui a fait le choix '
    'de la simplicite et de la completion : moins de fonctionnalites, mais chacune est completement implementee, '
    'securisee et testee. Son approche "un agent, beaucoup d\'outils" est pragmatique et efficace. Son threat model '
    'explicite, son systeme de prompt injection hardening, sa protection SSRF, et son chiffrement au repos sont des '
    'references que tout projet d\'agent IA devrait suivre.',
    body_style
))
story.append(Paragraph(
    'AENEWS a une vision plus ambitieuse avec 14 clusters d\'agents specialises et une architecture enterprise, '
    'mais cette ambition n\'est pas soutenue par l\'execution. Le projet souffre du syndrome du "placeholder cascade" : '
    'chaque couche (frontend, backend, base de donnees, infrastructure) a des composants declares mais non implementes, '
    'creant une illusion de completude qui s\'effondre des qu\'on suit le chemin d\'execution reel d\'une fonctionnalite. '
    'Le double backend, le double prefix API, le mismatch de token, et les 3 schemas SQL contradictoires sont des '
    'symptomes d\'un manque de coherence architecturale.',
    body_style
))
story.append(Paragraph(
    'La bonne nouvelle est que les deux projets sont complementaires. Les patterns de securite d\'Odysseus '
    '(prompt_security, url_security, tool_security, secret_storage, threat model) peuvent etre directement transpose '
    'dans AENEWS pour resoudre ses vulnerabilites critiques. Et la vision multi-cluster d\'AENEWS, si elle etait '
    'executee avec la meme rigueur qu\'Odysseus, pourrait produire un systeme d\'agents nettement plus puissant que '
    'ce qu\'Odysseus offre actuellement avec son agent unique.',
    body_style
))

# Verdict box
verdict_data = [
    [Paragraph('<font name="LiberationSerif-Bold" size="12" color="white">VERDICT</font>', 
               ParagraphStyle('VH', parent=header_cell, fontSize=12))],
    [Paragraph(
        '<font name="Carlito" size="10">Odysseus est <b>production-ready</b> pour le self-hosting (score 78/100). '
        'AENEWS est en <b>pre-alpha</b> avec des ambitions enterprise (score 43/100). '
        'Le chemin le plus efficace pour AENEWS est d\'adopter les patterns de securite et d\'architecture '
        'prouves par Odysseus, puis d\'executer sa vision multi-cluster avec la meme rigueur : '
        '<b>chaque fonctionnalite doit etre complete, securisee et testee avant d\'en ajouter une nouvelle</b>. '
        'L\'approche "faire moins mais le faire bien" d\'Odysseus est la lecon la plus importante a retenir.</font>',
        ParagraphStyle('Verdict', parent=cell_style, alignment=TA_CENTER, leading=16)
    )],
]
verdict_table = Table(verdict_data, colWidths=[CONTENT_W])
verdict_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), ACCENT),
    ('BACKGROUND', (0, 1), (-1, 1), HexColor('#f0f4f8')),
    ('GRID', (0, 0), (-1, -1), 1, ACCENT),
    ('TOPPADDING', (0, 0), (-1, -1), 10),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ('LEFTPADDING', (0, 0), (-1, -1), 15),
    ('RIGHTPADDING', (0, 0), (-1, -1), 15),
]))
story.append(Spacer(1, 10*mm))
story.append(verdict_table)

# Build
doc.build(story)
print(f'PDF generated: {output_path}')
print(f'File size: {os.path.getsize(output_path):,} bytes')
