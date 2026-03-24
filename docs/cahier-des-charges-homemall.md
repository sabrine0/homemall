# Cahier des Charges - HomeMall

## 1. Document Control

| Field | Value |
|---|---|
| Project | HomeMall |
| Document type | Project Specification (Cahier des Charges) |
| Version | 1.0 |
| Date | March 11, 2026 |
| Status | Draft for execution |
| Scope | Web + API + Mobile ecosystem (priority: Web + API) |
| Prepared for | Product, Engineering, QA, Operations, Business stakeholders |

## 2. Project Description

### 2.1 Purpose
HomeMall is a real-estate decision platform that helps users choose where to live/invest in Morocco through:
- explainable zone scoring,
- True Cost of Living (TCL),
- real listing inventory,
- comparison workflows,
- direct contact/messaging with sellers,
- admin governance and moderation.

### 2.2 Problem Solved
Current property platforms are mostly listing directories with weak decision support. Users lack:
- transparent ranking and reasoning,
- integrated cost modeling (housing + commute + risks + utilities),
- trusted data quality controls,
- unified experience from exploration to contact and comparison.

### 2.3 Target Users
- `Guest visitor`: explores zones/listings before signup.
- `Buyer/Renter user`: analyzes zones, compares offers, favorites, contacts sellers.
- `Seller user`: posts/manages listings, handles messages.
- `Manager` (formerly mini-admin): moderation and operational management.
- `SUPER_ADMIN`: full governance, user/admin/setting control.

## 3. Project Objectives

### 3.1 Business Objectives

| ID | Objective | KPI |
|---|---|---|
| BO-01 | Increase qualified lead generation from zone exploration to seller contact | Contact conversion rate |
| BO-02 | Build trust via explainable scoring and moderated content | % listings with complete data, moderation SLA |
| BO-03 | Enable scalable operations through RBAC backoffice | Admin task completion time |
| BO-04 | Reduce dependency on manual listing creation with external ingestion | % external listings refreshed successfully |

### 3.2 User Objectives

| ID | Objective | KPI |
|---|---|---|
| UO-01 | Find relevant zones quickly | Time-to-first-shortlist |
| UO-02 | Understand total monthly cost clearly | TCL comprehension score (UX research) |
| UO-03 | Compare multiple offers transparently | Compare completion rate |
| UO-04 | Save and recover preferences/favorites | Return-user engagement |

### 3.3 Technical Objectives

| ID | Objective | KPI |
|---|---|---|
| TO-01 | Maintain modular architecture across monorepo | Build stability, module ownership |
| TO-02 | Enforce secure auth and RBAC | Zero critical auth/RBAC issues |
| TO-03 | Support external listing refresh workflows | Sync success rate, error observability |
| TO-04 | Keep web/app responsiveness at scale | API p95, page load metrics |

## 4. Scope

### 4.1 In Scope

| Domain | Included |
|---|---|
| Core platform | Auth, profile/onboarding, zones, TCL, compare, listings, messaging |
| Real listing data | External ingestion from Avito/Mubawab/generic feeds, normalization, dedupe |
| Backoffice | SUPER_ADMIN + MANAGER workflows, moderation, imports, settings |
| Reporting | User decision report generation (JSON/PDF API), admin moderation reports |
| Multi-platform | Shared contracts for web/mobile/api |
| Internationalization | Arabic/French/English UX support baseline |

### 4.2 Out of Scope (Current Phase)

| Domain | Excluded |
|---|---|
| Payments | Online transaction and escrow |
| Legal conveyancing | Contract signing workflow and legal automation |
| Advanced CRM | Full broker CRM suite |
| Native push infrastructure | Full push notification orchestration (beyond MVP hooks) |
| BI warehouse | Dedicated analytics warehouse/ETL (post-MVP) |

## 5. Assumptions and Constraints

### 5.1 Assumptions

| ID | Assumption |
|---|---|
| A-01 | Primary market is Morocco; currency and UX defaults are Morocco-oriented |
| A-02 | External data providers may not provide stable APIs; feed/scrape fallback is required |
| A-03 | JWT cookie auth for web and bearer support for mobile remain standard |
| A-04 | MANAGER is the formal replacement term for mini-admin |

### 5.2 Constraints

| ID | Constraint |
|---|---|
| C-01 | Compliance with source-platform terms for ingestion |
| C-02 | Variable quality/completeness of third-party listing data |
| C-03 | Geopolitical map rendering sensitivity from third-party map provider |
| C-04 | Single monorepo release coordination across API/web/mobile |

## 6. Stakeholders

| Stakeholder | Responsibility |
|---|---|
| Product Owner | Prioritization, scope approvals, acceptance sign-off |
| Engineering Lead | Architecture, technical delivery quality |
| Backend Team | API, ingestion, RBAC, data integrity |
| Frontend Team | UX, workflows, state management, performance |
| QA Team | Functional/non-functional validation, regression control |
| Admin Operations | Moderation, imports, content quality |

## 7. Functional Requirements

### 7.1 Module-Based Functional Requirements

| ID | Module | Requirement | Priority |
|---|---|---|---|
| FR-001 | Authentication | User signup/login/logout, forgot/reset password, profile update | Must |
| FR-002 | RBAC | Enforce role + permission checks at API and backoffice UI | Must |
| FR-003 | Onboarding/Profile | Capture and persist user goal, budget, mobility, sensitivities | Must |
| FR-004 | Zones Explorer | Search/filter/sort zones, map visualization, zone selection | Must |
| FR-005 | Zone Details | Show score breakdown, TCL indicators, outlook, live offers | Must |
| FR-006 | Analysis | Zone scoring, TCL calculation, compare endpoint with explainability | Must |
| FR-007 | Compare Workspace | Compare multiple options, show winner, ranking table, details navigation | Must |
| FR-008 | Listings (User) | Create/update/delete own listing, upload media, status control | Must |
| FR-009 | Listings (Public) | Browse and open listing details, seller contact flow | Must |
| FR-010 | Favorites | Like/save offers and retrieve from profile | Should |
| FR-011 | Messaging | Conversation lifecycle and real-time-like message threading | Must |
| FR-012 | Listing Reports | Users can report abusive listings with reason | Must |
| FR-013 | Decision Report | Generate user report (JSON/PDF API) from saved recommendations | Should |
| FR-014 | Admin Dashboard | KPIs for users/listings/reports/admins/import health | Must |
| FR-015 | Admin Users | Search, activate/deactivate users, role updates (authorized only) | Must |
| FR-016 | Admin Listings | Review, status moderation, remove listing | Must |
| FR-017 | Admin Admins | SUPER_ADMIN can create/update/disable MANAGER/SUPER_ADMIN | Must |
| FR-018 | Admin Reports | View listing abuse + decision reports, export JSON | Must |
| FR-019 | Admin Import | Import generic/Avito feeds and marketplace refresh jobs | Must |
| FR-020 | Admin Settings | Key-value system setting management with audit fields | Should |
| FR-021 | External Ingestion | Scheduled/manual provider sync with dedupe and stale handling | Must |
| FR-022 | API Docs | Swagger/OpenAPI and Postman collection available | Should |

### 7.2 External Listing Data Requirements

| ID | Requirement |
|---|---|
| FR-DATA-01 | Support `avito`, `mubawab`, and `generic` ingestion channels |
| FR-DATA-02 | Map source fields into normalized listing model (`sourcePlatform`, `sourceListingId`, prices, media) |
| FR-DATA-03 | Deduplicate by `(sourcePlatform, sourceListingId)` |
| FR-DATA-04 | Preserve source URL and provenance metadata for traceability |
| FR-DATA-05 | Mark stale listings and optionally deactivate missing entries |
| FR-DATA-06 | Keep manual seller listings and external listings coexisting safely |

## 8. User Roles and Permissions

### 8.1 Roles
- `USER`
- `MANAGER` (professional replacement for mini-admin)
- `SUPER_ADMIN`

### 8.2 Permission Catalog
- `MANAGE_USERS`
- `MANAGE_LISTINGS`
- `MODERATE_REPORTS`
- `MANAGE_IMPORTS`
- `MANAGE_SETTINGS`
- `MANAGE_ADMINS`

### 8.3 Access Matrix

| Capability | USER | MANAGER | SUPER_ADMIN |
|---|---:|---:|---:|
| Explore zones/listings | Yes | Yes | Yes |
| Create own listings | Yes | Yes | Yes |
| Contact sellers/messages | Yes | Yes | Yes |
| Report listing | Yes | Yes | Yes |
| Access admin dashboard | No | Yes | Yes |
| Manage users | No | If `MANAGE_USERS` | Yes |
| Manage listings (global) | No | If `MANAGE_LISTINGS` | Yes |
| Moderate reports | No | If `MODERATE_REPORTS` | Yes |
| Run imports | No | If `MANAGE_IMPORTS` | Yes |
| Manage system settings | No | If `MANAGE_SETTINGS` | Yes |
| Create/edit admins | No | No | Yes |

## 9. Admin Panel Requirements

| Area | Requirement | Owner Role |
|---|---|---|
| Dashboard | Metrics: users, listings, reports, admins, ingestion status | MANAGER/SUPER_ADMIN |
| Users | Search, edit role, activation toggle, permission management (per policy) | MANAGER/SUPER_ADMIN |
| Listings | Filter/moderate/remove listings; status transitions | MANAGER/SUPER_ADMIN |
| Reports | Unified view of user and listing reports, export | MANAGER/SUPER_ADMIN |
| Admin accounts | Create/update/disable admins and permission assignment | SUPER_ADMIN |
| Imports | Upload feed content, run provider refresh, inspect import results | MANAGER/SUPER_ADMIN |
| Settings | CRUD key-value settings with update provenance | MANAGER/SUPER_ADMIN |
| Zones and Metrics | CRUD zones + maintain metrics | MANAGER/SUPER_ADMIN |

## 10. Non-Functional Requirements

### 10.1 Security

| ID | Requirement |
|---|---|
| NFR-SEC-01 | JWT-based authentication with httpOnly cookie for web |
| NFR-SEC-02 | Strict server-side RBAC enforcement on admin routes |
| NFR-SEC-03 | Input validation for all mutable endpoints |
| NFR-SEC-04 | Password hashing and reset flow with expiry and one-time verification |
| NFR-SEC-05 | Auditability of privileged settings/admin actions |
| NFR-SEC-06 | CORS and origin controls per environment |

### 10.2 Performance

| ID | Requirement |
|---|---|
| NFR-PERF-01 | API p95 <= 500ms for standard read endpoints under nominal load |
| NFR-PERF-02 | Zones page first interactive view <= 3s on broadband desktop |
| NFR-PERF-03 | Listing feed/import operations should be asynchronous for large payloads |

### 10.3 Scalability and Reliability

| ID | Requirement |
|---|---|
| NFR-SCAL-01 | Horizontal API scaling with stateless auth validation |
| NFR-SCAL-02 | Database indexes on heavy query paths (zones/listings/reports/chat) |
| NFR-SCAL-03 | Ingestion jobs configurable by interval, row limits, source toggles |
| NFR-SCAL-04 | Error handling and graceful degradation for provider outages |

### 10.4 Maintainability

| ID | Requirement |
|---|---|
| NFR-MAIN-01 | Shared contracts in `packages/shared` remain source of truth |
| NFR-MAIN-02 | Clear architecture layers (domain/application/infrastructure/presentation) |
| NFR-MAIN-03 | API docs and Postman collection maintained with releases |

## 11. Technical Architecture

### 11.1 Stack

| Layer | Technology |
|---|---|
| Web frontend | Next.js 14, TypeScript, Tailwind |
| Mobile frontend | Flutter |
| API backend | Node.js, Express, TypeScript |
| Data access | Prisma ORM |
| Database | PostgreSQL |
| Shared packages | `@homemall/shared`, `@homemall/scoring` |
| Documentation | Swagger/OpenAPI, Postman |

### 11.2 High-Level Architecture

```text
Web (Next.js) / Mobile (Flutter)
            |
            v
      API Gateway (Express routes)
            |
            v
Services + Use Cases + Domain Scoring
            |
            v
 Prisma Repositories -> PostgreSQL
            |
            v
 External Providers (Avito/Mubawab/Generic feeds)
```

### 11.3 API Surface (Main)

| Group | Examples |
|---|---|
| Auth | `/api/auth/*` |
| Profile | `/api/profile` |
| Zones | `/api/zones`, `/api/zones/:id` |
| Analysis | `/api/analyze/*`, `/api/search/ai` |
| Listings | `/api/listings/*`, `/api/sellers/:sellerId` |
| Messaging | `/api/chats/*` |
| Favorites | `/api/favorites` |
| Reporting | `/api/report`, `/api/report/pdf` |
| Admin | `/api/admin/*` |

## 12. Data Structure and Main Entities

| Entity | Purpose | Key Relations |
|---|---|---|
| `User` | Identity, role, status, admin permissions | 1:1 `UserProfile`, 1:N listings/reports/messages |
| `UserProfile` | User preferences and constraints for scoring | Belongs to `User` |
| `Zone` | Geographic decision unit | 1:1 `ZoneMetrics`, 1:N listings/analysis |
| `ZoneMetrics` | Quantitative metrics for scoring/TCL | Belongs to `Zone` |
| `AnalysisResult` | Persisted computed results | Belongs to `User` + `Zone` |
| `UserListing` | Property listing record (manual/external) | Belongs to seller `User` + `Zone` |
| `ListingReport` | Moderation report submitted by users | Belongs to listing + reporter |
| `ChatConversation` | Buyer-seller conversation per listing | Linked to listing, buyer, seller |
| `ChatMessage` | Message payload within conversation | Belongs to conversation + sender |
| `SystemSetting` | Operational configuration key/value | Updated by admin user |

## 13. User Journeys and Use Cases

### 13.1 Journey A: Guest to Qualified Buyer/Renter
1. Guest enters zones explorer.
2. Filters and AI-assisted search refine shortlist.
3. User opens zone details and listing details.
4. User signs up/login when ready to contact/favorite.
5. User compares multiple offers and starts conversation.

### 13.2 Journey B: Seller
1. Seller logs in.
2. Creates listing with media and contact channels.
3. Monitors inbound conversations.
4. Updates listing status/details over time.

### 13.3 Journey C: Admin Operations
1. Admin logs in via backoffice.
2. Reviews dashboard KPIs.
3. Moderates reports and listing statuses.
4. Runs import/refresh job for external data.
5. SUPER_ADMIN governs managers and permissions.

### 13.4 Use Case Table

| Use Case | Actor | Success Outcome |
|---|---|---|
| UC-01 Explore zones | Guest/User | Ranked zones displayed on map/list |
| UC-02 Compare options | User | Winner + explainable score comparison shown |
| UC-03 Contact seller | User | Conversation created and message sent |
| UC-04 Manage listing | Seller | Listing persisted with correct visibility |
| UC-05 Report abuse | User | Report saved and visible in admin reports |
| UC-06 Import external data | Admin | Listings inserted/updated with source metadata |
| UC-07 Manage admins | SUPER_ADMIN | Admin role/permission state updated |

## 14. UI/UX Requirements

| ID | Requirement |
|---|---|
| UX-01 | Clear navigation for zones/listings/compare/messages/profile |
| UX-02 | Explainability-first design (score reasons visible and understandable) |
| UX-03 | Listing cards must prioritize decision-critical fields (price, type, zone, status) |
| UX-04 | Responsive behavior across desktop/tablet/mobile web |
| UX-05 | Consistent language support (EN/FR/AR) and readable typography |
| UX-06 | Admin backoffice optimized for high-information density and moderation speed |
| UX-07 | Error states must provide clear action: retry, fallback, support path |

## 15. Project Phases

### Phase 1 - MVP Stabilization (Now)
- Secure auth/RBAC baseline.
- Core zones/listings/compare/messages workflows.
- Basic admin dashboards and moderation.
- Initial external ingestion from Avito/generic.

### Phase 2 - Operational Excellence
- Ingestion quality scoring and duplicate strategy hardening.
- Backoffice workflow enhancements (bulk actions, stronger audit trails).
- Performance optimization for maps/listings and chat scaling.

### Phase 3 - Growth and Intelligence
- Enhanced AI query interpretation and recommendation quality.
- Advanced personalization and saved decision artifacts.
- Additional provider integrations and regional expansion controls.

### Phase 4 - Enterprise Readiness
- Compliance hardening, advanced observability, SLO governance.
- Operational analytics and deeper business intelligence pipelines.

## 16. Risks and Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Source platform changes/blocking | Data freshness degradation | Multi-provider strategy + generic import fallback |
| Data quality inconsistency | Poor trust and ranking quality | Validation, normalization, moderation workflows |
| RBAC misconfiguration | Security/compliance incident | Permission audits, automated route tests |
| Performance regression with dataset growth | UX degradation | Indexing, pagination, caching, async jobs |
| Map provider geopolitical rendering variance | User dissatisfaction | Style-based suppression and regional UX strategy |
| Monorepo cross-app coupling | Slower releases | Clear contracts and shared package governance |

## 17. Deliverables

| Deliverable | Description |
|---|---|
| D-01 Product specification | This Cahier des Charges approved by stakeholders |
| D-02 Architecture package | Updated architecture docs + diagrams + environment contracts |
| D-03 API package | Swagger accuracy, Postman collection, endpoint governance |
| D-04 Web app | User workflows and admin backoffice delivered per FR IDs |
| D-05 Mobile compatibility | API compatibility and key user flows validated |
| D-06 Data ingestion package | Provider connectors + import templates + refresh jobs |
| D-07 QA package | Test plan, regression suite, acceptance report |
| D-08 Operations package | Deployment runbook, env templates, monitoring checklist |

## 18. Acceptance Criteria

### 18.1 Functional Acceptance
- All `Must` FR items delivered and validated in QA.
- SUPER_ADMIN and MANAGER permissions enforce correct access paths.
- External listings visible in map/search/listings with source traceability.
- Listing details, compare flow, and messaging flow complete end-to-end.

### 18.2 Quality Acceptance
- No critical security issues on auth/RBAC flows.
- Performance and stability thresholds met for agreed test scenarios.
- API documentation matches deployed behavior.

### 18.3 UAT Acceptance
- Business and operations stakeholders sign off on:
  - moderation workflows,
  - admin governance,
  - real-data ingestion reliability,
  - decision-support user journey.

## 19. Open Decisions (To Confirm)

| Topic | Decision Needed |
|---|---|
| Data contracts | Final legal and technical policy for Avito/Mubawab ingestion mode |
| Report scope | End-user report exposure policy vs admin-only analytics surfaces |
| SLA targets | Final p95/performance and moderation SLA commitments |
| Notifications | Priority and channel strategy (email, push, in-app) |

## 20. Sign-Off

| Role | Name | Date | Signature |
|---|---|---|---|
| Product Owner |  |  |  |
| Engineering Lead |  |  |  |
| QA Lead |  |  |  |
| Operations/Admin Lead |  |  |  |

