# ADR-016 — Content Factory Department

**Date**: 2026-06-17
**Phase**: PDEOS Phase 10
**Status**: Accepted

## Context

Le PDEOS doit pouvoir générer automatiquement tous types de contenu :
articles, ebooks, cours, slides, PDFs, infographies, sous-titres, posts
sociaux. AENEWS dispose déjà de PresentationAgent (1549 lignes PptxGenJS),
SpreadsheetAgent et DocumentAgent dans le cluster office, mais pas de
pipeline unifié pour la génération de contenu long-form.

## Decision

Créer le **Content Factory Department** avec :

- **BaseContentAgent** (classe abstraite) qui factorise le pipeline 7 étapes :
  1. Research (LLM ou web search)
  2. Outline (LLM structure)
  3. Draft (LLM écrit par section)
  4. Review (LLM critique + révision)
  5. Format (markdown → html/pdf/pptx/epub)
  6. SEO optimization (si applicable)
  7. Deliver (persist + return artifact)

- **18 agents concrets** répartis en 4 catégories :
  - **Text** (7) : Article, Blog, Ebook, Newsletter, Press Release, Transcript, Translation
  - **Education** (5) : Course, Syllabus, Exam, Correction, SEO Meta
  - **Visual** (4) : Slides, Infographic, PDF, White Paper
  - **Media** (2) : Subtitles, Social Post

- **DTOs** : `CreateContentDto`, `ContentArtifact` avec metadata, deliverables, SEO, quality scores

- **REST API** : `POST /api/v1/content/generate` (route par type), `GET /content/recent`, `GET /content/:id`

## Règle absolue respectée

- 0 fichier existant supprimé
- PresentationAgent existant (1549 lignes) reste opérationnel
- ContentFactoryModule est optionnel
- Rétrocompatible avec COS (Phase 3) et DevOps (Phase 13)

## Architecture

```
POST /api/v1/content/generate { type: ARTICLE, topic: "..." }
       ↓
ContentController → agentMap.get(ARTICLE) → ArticleWriterAgent
       ↓
BaseContentAgent.execute() {
  1. research()         → LLM facts + recent developments
  2. outline()          → LLM structured outline (sections + keyPoints)
  3. draft()            → parallel LLM calls per section + intro + conclusion
  4. review()           → LLM critic + optional revision
  5. format()           → markdown + HTML + (PDF/PPTX/EPUB selon type)
  6. optimizeSEO()      → metaTitle, metaDescription, OG, schema markup
  7. persist()          → Redis 90 jours + lpush content:recent
}
       ↓
ContentArtifact returned with quality scores + deliverables
```

## Choix techniques

- **LLM parallel drafting** : sections écrites en parallèle pour réduire latence
- **Quality scores** : readability, SEO, fact-check (0-100 chacun)
- **Multi-format delivery** : chaque agent peut produire MD + HTML + format spécifique (PDF/PPTX/EPUB)
- **SEO auto-optimization** : metaTitle, metaDescription, OG tags, schema markup pour types SEO-optimisables
- **Word count targets** : 200 (SEO meta) → 20000 (course) selon type
- **Cost estimation** : basée sur tokens in/out (GPT-4 pricing)

## Consequences

**Positives** :
- Pipeline unifié pour 18 types de contenu
- Quality scoring automatique
- SEO optimization built-in
- Compatible avec ProjectManagerAgent (Phase 13) qui peut assigner `documentation` tasks
- Compatible avec LearningEngine (Phase 5) qui apprend des succès/échecs

**Négatives** :
- Coût LLM : ~$0.50-5 par artefact (selon type)
- Latence : 30s-15min selon longueur (ebook 15000 mots = 15min)
- Dépendance LLM forte — fallback basique si LLM down

## Test strategy

- Tests unitaires : ArticleWriterAgent (2 tests : génération complète + LLM failure)
- Tests d'intégration : à venir (Phase 18)

## References

- PDEOS Master Blueprint Partie IV (Content Factory Department)
- ADR-013 Chief Of Staff
- ADR-015 DevOps Department (routage des tasks `documentation` → Content Factory)
