# Installation — PDEOS Phase 10 + Phase 5

## Prérequis

- AENEWS Agent OS X avec PDEOS Phase 2+3+4+11+13 déjà installés (671 tests verts)
- Backend NestJS fonctionnel
- LLM provider configuré (ZAI/OpenAI/Anthropic)

## Étape 1 — Backup

```bash
cd AENEWS-BROWSER-AGENT-OS-X
git checkout -b backup/pre-pdeos-phase-10-5
git push origin backup/pre-pdeos-phase-10-5
git checkout -b feature/pdeos-phase-10-5
```

## Étape 2 — Phase 10 : Content Factory

```bash
mkdir -p backend/src/modules/content-factory/{dto,agents/{text,education,visual,media},controllers,tests,docs}
cp -r phase10_content_factory/* backend/src/modules/content-factory/
```

## Étape 3 — Phase 5 : Learning Engine

```bash
mkdir -p backend/src/modules/learning-engine/{dto,services,controllers,tests,docs}
cp -r phase5_learning_engine/* backend/src/modules/learning-engine/
```

## Étape 4 — Wire dans app.module.ts

```typescript
import { ContentFactoryModule } from './modules/content-factory/content-factory.module';
import { LearningEngineModule } from './modules/learning-engine/learning-engine.module';

@Module({
  imports: [
    // ... existing modules ...
    ChiefOfStaffModule,
    MemoryModule,
    InfrastructureModule,
    DevOpsModule,
    ContentFactoryModule,   // Phase 10 — AJOUTER
    LearningEngineModule,   // Phase 5 — AJOUTER
  ],
})
export class AppModule {}
```

## Étape 5 — Vérification

```bash
cd backend
bun run build
bun run test -- --grep "ArticleWriter"     # 2 tests Phase 10
bun run test -- --grep "LearningEngine"    # 9 tests Phase 5
bun run test                                # 671 + 11 = 682 tests verts
```

## Étape 6 — Démarrer & valider

```bash
bun run start:dev

# === Phase 10 : Content Factory ===

# Health check
curl http://localhost:3000/api/v1/content/health

# Générer un article
curl -X POST http://localhost:3000/api/v1/content/generate \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "article",
    "topic": "Les enjeux de l'IA générative en éducation",
    "audienceLevel": "intermediate",
    "tone": "professional",
    "language": "fr",
    "keywords": ["IA", "éducation", "génération contenu"]
  }'

# Générer un cours complet (long-running)
curl -X POST http://localhost:3000/api/v1/content/generate \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "course",
    "topic": "Kubernetes pour débutants",
    "audienceLevel": "beginner",
    "language": "fr"
  }'

# Générer slides
curl -X POST http://localhost:3000/api/v1/content/generate \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "slides",
    "topic": "Présentation AENEWS PDEOS",
    "audienceLevel": "intermediate"
  }'

# Lister les contenus récents
curl http://localhost:3000/api/v1/content/recent?limit=10 \
  -H "Authorization: Bearer $JWT"

# === Phase 5 : Learning Engine ===

# Health check
curl http://localhost:3000/api/v1/learning/health

# Stats apprentissage
curl http://localhost:3000/api/v1/learning/stats \
  -H "Authorization: Bearer $JWT"

# Patterns détectés
curl http://localhost:3000/api/v1/learning/patterns \
  -H "Authorization: Bearer $JWT"

# Suggestions d'automatisation
curl http://localhost:3000/api/v1/learning/suggestions \
  -H "Authorization: Bearer $JWT"

# Enregistrer feedback
curl -X POST http://localhost:3000/api/v1/learning/feedback \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-1",
    "targetType": "mission",
    "targetId": "mission_xxx",
    "feedback": "positive",
    "rating": 5,
    "comment": "Excellent travail"
  }'

# Optimiser le prompt d'un agent
curl -X POST http://localhost:3000/api/v1/learning/optimize-prompt/ResearchAgent \
  -H "Authorization: Bearer $JWT"

# Stratégie adaptée pour un agent
curl http://localhost:3000/api/v1/learning/strategy/ResearchAgent \
  -H "Authorization: Bearer $JWT"

# Trouver expériences similaires
curl -X POST http://localhost:3000/api/v1/learning/experiences/similar \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "agentName": "ResearchAgent",
    "inputDescription": "recherche sur l'IA en éducation",
    "limit": 5
  }'
```

## Problèmes connus

1. **LLM costs Phase 10** : chaque artefact coûte $0.50-5 selon type. Surveiller avec `LLMCostWatcherAgent` (Phase 11).

2. **Latence ebook/course** : 5-15min pour générer 15000-20000 mots. Prévoir timeout adapté dans COS.

3. **Learning Engine cold start** : nécessite 30+ missions pour produire des patterns fiables. Les premiers jours, `getAdaptiveStrategy` retourne les valeurs par défaut.

4. **Pattern Mining parallèle** : si beaucoup d'agents (60+), le cron quotidien 4h peut prendre 5-10min. Acceptable.

5. **Threshold Calibration** : nécessite 30+ samples par métrique. Si metrics:history:vide, le cron skip.

## Rollback

```bash
git checkout backup/pre-pdeos-phase-10-5
```
