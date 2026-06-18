# ADR-017 — Learning Engine

**Date**: 2026-06-17
**Phase**: PDEOS Phase 5
**Status**: Accepted

## Context

Le PDEOS doit apprendre de chaque mission pour s'améliorer en continu. Sans
Learning Engine, le système répète les mêmes erreurs, ne détecte pas les
patterns récurrents, et ne propose pas d'automatisations. C'est le composant
qui transforme le PDEOS d'outil en véritable alter ego qui apprend.

## Decision

Créer le **Learning Engine** avec 8 composants orchestrés par un
`LearningEngine` central :

1. **Pattern Mining** (quotidien 4h)
   - Analyse les 100 dernières expériences par agent
   - Détecte : success rate faible, cost spike, latency patterns
   - Stocke dans `learning:patterns`

2. **Experience Replay**
   - Stocke chaque mission (input, plan, output, success) dans Redis
   - Retrieval par similarité (keyword matching sur input description)
   - Permet aux nouvelles missions de profiter des expériences passées

3. **Feedback Aggregation**
   - Collecte feedback explicite (rating 1-5) et implicite (retry, reformulation)
   - Aggregate par targetType+targetId
   - Alimente le scoring qualité

4. **Prompt Optimizer**
   - Analyse les échecs d'un agent
   - LLM suggère un prompt optimisé
   - Stocke dans `learning:prompt-optimizations` pour validation humaine

5. **Adaptive Strategy**
   - Pour chaque agent, suggère depth/budget/timeout basés sur historique
   - success rate > 85% → simple ; 60-85% → standard ; < 60% → deep
   - Budget = 1.5 × avg cost ; Timeout = 1.5 × avg duration

6. **Habit Detector** (quotidien 6h)
   - Analyse les activités utilisateur (timestamps)
   - Détecte patterns temporels (jour + heure récurrents)
   - Suggère automatisations (ex : "tu fais X le mardi à 14h")

7. **Automation Suggester**
   - Group les missions par similarité d'input
   - Si >= 3 missions similaires → suggestion d'automatisation
   - Calcul time saved + setup effort

8. **Threshold Calibrator** (mensuel)
   - Pour chaque métrique (CPU, RAM, latence, error rate)
   - Calcule baseline + 3σ depuis 1000 samples
   - Ajuste seuils alerting automatiquement

### Consommation Self-Healing

Le Learning Engine subscribe au canal `learning:incident-resolved` publié
par le Self-Healing Engine (Phase 11). Chaque incident résolu automatiquement
devient une expérience d'apprentissage — le système apprend quelles
stratégies fonctionnent pour quels types d'incidents.

## Règle absolue respectée

- 0 fichier existant modifié
- LearningEngineModule est optionnel
- N'impacte pas les 159 agents existants + 60 agents PDEOS (Phase 2+3+4+11+13+10)
- Rétrocompatible

## Architecture

```
Mission terminée (COS Phase 3)
       ↓
LearningEngine.ingestMissionResult()
       ↓
Redis: learning:experiences (lpush + zadd par agent)
       ↓
[Async] Pattern Mining pour cet agent
       ↓
[Cron 4h] Pattern Mining global
       ↓
[Cron 6h] Habit Detection
       ↓
[On-demand] Prompt Optimizer (si agent < 70% success)
       ↓
[Cron mensuel] Threshold Calibration
       ↓
[On-demand] Adaptive Strategy quand COS planifie une nouvelle mission
       ↓
[On-demand] findSimilarExperiences pour context-aware planning
```

## Choix techniques

- **Redis** : list pour experiences, sorted set pour retrieval par agent
- **Similarity** : keyword matching simple (production : Qdrant vector similarity)
- **LLM usage** : seulement pour Prompt Optimizer (les autres composants sont heuristiques)
- **Cron schedules** :
  - Pattern Mining : quotidien 4h
  - Habit Detection : quotidien 6h
  - Threshold Calibration : mensuel
- **Confidence scores** : 0-1 basés sur sample size (min(1, n/20))

## Consequences

**Positives** :
- Le système apprend de chaque mission
- Détection automatique des agents sous-performants
- Suggestions d'automatisation pour tâches répétitives
- Calibration automatique des seuils alerting (moins de faux positifs)
- Context-aware planning (stratégie adaptée par agent)
- Cross-pollinisation avec Self-Healing (Phase 11)

**Négatives** :
- Coût LLM pour Prompt Optimizer (~$0.50 par analyse)
- Latence ajoutée pour retrieval par similarité (~50ms)
- Qualité dépend de la taille de l'historique (cold start : 30 missions minimum)

## Métriques de succès

- Après 100 missions : >= 3 patterns détectés
- Après 200 missions : >= 1 suggestion d'automatisation
- Success rate global augmente de 5% en 30 jours
- Faux positifs alerting réduits de 30% après calibration

## Test strategy

- Tests unitaires : 9 tests couvrent ingest, findSimilar, feedback, adaptive strategy, prompt optimization, automation detection, threshold calibration, stats
- Tests d'intégration : à venir (Phase 18)

## References

- PDEOS Master Blueprint Partie III (Learning Engine)
- ADR-008 Adaptive Intelligence Architecture
- ADR-014 Infrastructure Engine (Self-Healing publie sur learning:incident-resolved)
- ADR-015 DevOps Department (ProjectManager routing tient compte de l'Adaptive Strategy)
