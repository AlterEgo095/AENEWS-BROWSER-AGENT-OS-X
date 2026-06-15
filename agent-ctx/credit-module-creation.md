# Task: Create Credit Module in NestJS Backend

## Summary
Created a comprehensive Credit Module in the NestJS backend that integrates with agent execution and provides admin management APIs. Also created credit-related frontend API routes as proxy to the backend.

## Files Created

### Backend (NestJS)

1. **`/home/z/my-project/backend/src/modules/credit/entities/credit.entity.ts`**
   - Three TypeORM entities: `CreditAccount`, `CreditTransaction`, `AdminSetting`
   - `CreditAccount`: Tracks user credit balance, total purchased, and total used
   - `CreditTransaction`: Records all credit transactions with type (purchase/usage/admin_add/admin_deduct/bonus), agent/mission/admin references
   - `AdminSetting`: Key-value store for admin configuration (WhatsApp number, credit packages)
   - All entities use the `credit` PostgreSQL schema

2. **`/home/z/my-project/backend/src/modules/credit/entities/index.ts`**
   - Barrel export for entities and CreditTransactionType

3. **`/home/z/my-project/backend/src/modules/credit/credit.service.ts`**
   - Full credit management service with methods:
     - `getOrCreateAccount()`: Get or create credit account for a user
     - `getBalance()`: Returns balance, totalUsed, totalPurchased, and transactions
     - `addCredits()`: Add credits with transaction recording
     - `deductCredits()`: Deduct credits with balance validation
     - `hasCredits()`: Check sufficient balance
     - `getTransactions()`: Get transaction history
     - `getAdminSettings()` / `getSetting()` / `updateSetting()`: Admin settings CRUD
     - `getWhatsAppNumber()`: Get WhatsApp number (default: +243816515095)
     - `getCreditPackages()`: Get credit packages with defaults
     - `getAllAccounts()`: Admin view of all accounts
     - `addCreditsByAdmin()` / `deductCreditsByAdmin()`: Admin credit operations
   - Automatic seeding of default settings on first access

4. **`/home/z/my-project/backend/src/modules/credit/credit.controller.ts`**
   - RESTful API endpoints:
     - `GET /credits/balance?userId=xxx` - User credit balance
     - `GET /credits/packages` - Available credit packages
     - `GET /credits/whatsapp-number` - WhatsApp number for ordering
     - `GET /credits/order` - Combined order info (packages + WhatsApp)
     - `GET /credits/transactions?userId=xxx&limit=50` - Transaction history
     - `POST /credits/deduct` - Agent execution credit deduction
     - `POST /credits/admin/add` - Admin: Add credits
     - `POST /credits/admin/deduct` - Admin: Deduct credits
     - `GET /credits/admin/accounts` - Admin: List all accounts
     - `GET /credits/admin/settings` - Admin: Get all settings
     - `PUT /credits/admin/settings` - Admin: Update setting
   - DTOs with class-validator for request validation

5. **`/home/z/my-project/backend/src/modules/credit/credit.module.ts`**
   - NestJS module registering entities, service, and controller
   - Exports CreditService for use in other modules

### Frontend (Next.js API Routes)

6. **`/home/z/my-project/src/lib/backend-proxy.ts`**
   - Shared proxy helper for forwarding requests to NestJS backend
   - Configurable via `BACKEND_API_URL` environment variable
   - 5-second timeout with graceful fallback when backend is unavailable

7. **`/home/z/my-project/src/app/api/credits/route.ts`** (updated)
   - Proxy to `GET /credits/balance` with Prisma/SQLite fallback

8. **`/home/z/my-project/src/app/api/credits/order/route.ts`** (updated)
   - Proxy to `GET /credits/order` with Prisma/SQLite fallback

9. **`/home/z/my-project/src/app/api/credits/packages/route.ts`** (new)
   - Proxy to `GET /credits/packages` with Prisma/SQLite fallback

10. **`/home/z/my-project/src/app/api/credits/whatsapp-number/route.ts`** (new)
    - Proxy to `GET /credits/whatsapp-number` with Prisma/SQLite fallback

11. **`/home/z/my-project/src/app/api/credits/transactions/route.ts`** (new)
    - Proxy to `GET /credits/transactions` with Prisma/SQLite fallback

12. **`/home/z/my-project/src/app/api/credits/deduct/route.ts`** (new)
    - Proxy to `POST /credits/deduct` (no Prisma fallback — agent execution only)

13. **`/home/z/my-project/src/app/api/admin/credits/route.ts`** (updated)
    - Proxy to `POST /credits/deduct`, `/credits/admin/add`, `/credits/admin/deduct` with Prisma/SQLite fallback

14. **`/home/z/my-project/src/app/api/admin/settings/route.ts`** (updated)
    - Proxy to `GET/PUT /credits/admin/settings` with Prisma/SQLite fallback

15. **`/home/z/my-project/src/app/api/admin/users/route.ts`** (updated)
    - Proxy to `GET /credits/admin/accounts` with Prisma/SQLite fallback

## Files Modified

1. **`/home/z/my-project/backend/src/app.module.ts`**
   - Added `CreditModule` import and registration in the imports array

2. **`/home/z/my-project/backend/src/modules/agent/registry/agent-registry.service.ts`**
   - Added lazy CreditService resolution pattern (same as existing health service pattern)
   - Modified `executeAgentInternal()` to check credits before execution and deduct after success
   - Credit check: throws error if user has insufficient credits for agent's `creditCost`
   - Credit deduction: after successful execution, deducts `agent.creditCost` from user's account
   - Graceful fallback: if credit service is unavailable, execution proceeds without credit checks

## Verification
- All new TypeScript code compiles without introducing new errors (pre-existing decorator/TypeORM v1 issues are project-wide)
- Frontend API routes tested and working:
  - `GET /api/credits/order` → 200 OK with packages and WhatsApp info
  - `GET /api/credits/packages` → 200 OK with credit packages
  - `GET /api/credits/whatsapp-number` → 200 OK
  - `GET /api/admin/users` → 200 OK with user list
- Backend CreditModule properly registered and exported for DI
- Agent execution credit integration follows existing lazy-resolution patterns
