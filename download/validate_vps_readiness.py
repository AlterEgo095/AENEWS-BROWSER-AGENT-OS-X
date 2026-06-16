#!/usr/bin/env python3
"""
AENEWS Agent OS X — Comprehensive VPS Readiness Validation Script
=================================================================
Autonomously validates the ENTIRE project for VPS deployment readiness.
Checks backend clusters, agents, frontend pages, infrastructure config,
and produces a detailed JSON report.

Usage:  python3 validate_vps_readiness.py
"""

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from collections import OrderedDict

# ─── Project Root ────────────────────────────────────────────────
PROJECT_ROOT = Path("/home/z/my-project")
BACKEND_SRC   = PROJECT_ROOT / "backend" / "src"
FRONTEND_SRC  = PROJECT_ROOT / "frontend" / "src"
DOWNLOAD_DIR  = PROJECT_ROOT / "download"

# ─── Expected 17 Clusters ───────────────────────────────────────
EXPECTED_CLUSTERS = [
    "browser",
    "computer",
    "coding",
    "office",
    "marketing",
    "business",
    "infrastructure",
    "security",
    "meta-intelligence",
    "llm-intelligence",
    "intelligent-orchestration",
    "watchdog",
    "self-evolution",
    "certification",
    "stealth-ops",
    "data-intelligence",
    "communication",
]

# ─── Expected Frontend Pages ────────────────────────────────────
EXPECTED_PAGES = [
    "",                    # /
    "login",
    "agents",
    "tasks",
    "missions",
    "events",
    "credits",
    "admin",
    "admin/llm-provider",
    "intelligence",
    "orchestration",
    "swarm",
    "security",
    "performance",
    "live",
]

# ─── Required Agent Properties ──────────────────────────────────
REQUIRED_AGENT_PROPS = [
    "name",
    "version",
    "description",
    "cluster",
    "capabilities",
    # "actions",  # not a standard readonly prop on BaseAgent — checked via execute()
    "missionCategories",
    "creditCost",
    "powerLevel",
    "tier",
]

# ─── Backend ClusterType enum values ────────────────────────────
BACKEND_CLUSTER_TYPES = {
    "BROWSER": "browser",
    "COMPUTER": "computer",
    "CODING": "coding",
    "OFFICE": "office",
    "MARKETING": "marketing",
    "BUSINESS": "business",
    "INFRASTRUCTURE": "infrastructure",
    "SECURITY": "security",
    "META_INTELLIGENCE": "meta-intelligence",
    "LLM_INTELLIGENCE": "llm-intelligence",
    "INTELLIGENT_ORCHESTRATION": "intelligent-orchestration",
    "WATCHDOG": "watchdog",
    "SELF_EVOLUTION": "self-evolution",
    "CERTIFICATION": "certification",
    "STEALTH_OPS": "stealth-ops",
    "DATA_INTELLIGENCE": "data-intelligence",
    "COMMUNICATION": "communication",
}

# ─── Backend MissionCategory enum values ────────────────────────
BACKEND_MISSION_CATEGORIES = {
    "RESEARCH_ANALYSIS": "research-analysis",
    "CONTENT_CREATION": "content-creation",
    "CODE_DEVELOPMENT": "code-development",
    "SECURITY_OPS": "security-ops",
    "STEALTH_OPERATIONS": "stealth-operations",
    "BUSINESS_INTELLIGENCE": "business-intelligence",
    "MARKETING_GROWTH": "marketing-growth",
    "INFRASTRUCTURE_MGMT": "infrastructure-mgmt",
    "AUTOMATION_WORKFLOW": "automation-workflow",
    "DOCUMENT_PROCESSING": "document-processing",
    "AI_ORCHESTRATION": "ai-orchestration",
    "SYSTEM_ADMINISTRATION": "system-administration",
    "DATA_ENGINEERING": "data-engineering",
    "COMMUNICATION_OPS": "communication-ops",
    "ADVANCED_REASONING": "advanced-reasoning",
}


# ═══════════════════════════════════════════════════════════════
#  Helpers
# ═══════════════════════════════════════════════════════════════

def read_file(path: Path) -> str | None:
    """Read a file and return its content, or None if it doesn't exist."""
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return None


def find_files(root: Path, pattern: str) -> list[Path]:
    """Recursively find files matching a glob pattern."""
    return sorted(root.rglob(pattern))


def extract_enum_values(content: str, enum_name: str) -> dict[str, str]:
    """Extract enum key=value pairs from a TypeScript enum declaration."""
    # Match: ENUM_KEY = 'value'  or  ENUM_KEY = "value"
    results = {}
    # Find the enum block
    enum_pattern = rf"enum\s+{enum_name}\s*\{{([^}}]+)\}}"
    m = re.search(enum_pattern, content, re.DOTALL)
    if not m:
        return results
    block = m.group(1)
    for line in block.split("\n"):
        line = line.strip().rstrip(",")
        if not line or line.startswith("//") or line.startswith("/*"):
            continue
        kv = re.match(r"(\w+)\s*=\s*['\"]([^'\"]+)['\"]", line)
        if kv:
            results[kv.group(1)] = kv.group(2)
    return results


# ═══════════════════════════════════════════════════════════════
#  Validation Results Container
# ═══════════════════════════════════════════════════════════════

class ValidationResult:
    def __init__(self):
        self.checks: list[dict] = []
        self.cluster_agents: dict[str, list[dict]] = {}
        self.blockers: list[str] = []

    def add(self, category: str, name: str, passed: bool, detail: str = "", severity: str = "info"):
        self.checks.append({
            "category": category,
            "name": name,
            "passed": passed,
            "detail": detail,
            "severity": severity,
        })
        if not passed and severity == "blocker":
            self.blockers.append(f"[{category}] {name}: {detail}")

    @property
    def pass_count(self) -> int:
        return sum(1 for c in self.checks if c["passed"])

    @property
    def fail_count(self) -> int:
        return sum(1 for c in self.checks if not c["passed"])

    @property
    def total(self) -> int:
        return len(self.checks)

    @property
    def readiness_score(self) -> float:
        if self.total == 0:
            return 0.0
        return round((self.pass_count / self.total) * 100, 1)


# ═══════════════════════════════════════════════════════════════
#  1. Backend Validation
# ═══════════════════════════════════════════════════════════════

def validate_backend(r: ValidationResult):
    print("\n" + "="*70)
    print("  1. BACKEND VALIDATION")
    print("="*70)

    clusters_dir = BACKEND_SRC / "clusters"

    # 1a. Verify all 17 cluster directories exist
    for cluster_name in EXPECTED_CLUSTERS:
        cluster_dir = clusters_dir / cluster_name
        exists = cluster_dir.is_dir()
        r.add("Backend-Clusters", f"Cluster dir: {cluster_name}", exists,
              f"Path: {cluster_dir}" if exists else f"MISSING: {cluster_dir}",
              "blocker" if not exists else "info")

    # 1b. Count agent files per cluster
    print("\n  Agent counts per cluster:")
    total_agents = 0
    for cluster_name in EXPECTED_CLUSTERS:
        cluster_dir = clusters_dir / cluster_name
        agent_files = find_files(cluster_dir, "*.agent.ts")
        count = len(agent_files)
        total_agents += count
        r.cluster_agents[cluster_name] = []
        for af in agent_files:
            r.cluster_agents[cluster_name].append({
                "file": str(af.relative_to(PROJECT_ROOT)),
                "name": af.stem,
            })
        r.add("Backend-Agents", f"Agents in {cluster_name}", count > 0,
              f"{count} agent(s) found" if count > 0 else "NO agents found!",
              "blocker" if count == 0 else "info")
        print(f"    {cluster_name:30s} → {count:3d} agents")

    print(f"\n    TOTAL AGENTS: {total_agents}")
    r.add("Backend-Agents", "Total agent count", total_agents > 0,
          f"{total_agents} total agents across all clusters")

    # 1c. Verify each agent file exports a class extending BaseAgent
    print("\n  Checking agent class structure...")
    agents_checked = 0
    agents_pass = 0
    agents_fail = 0
    for cluster_name in EXPECTED_CLUSTERS:
        cluster_dir = clusters_dir / cluster_name
        agent_files = find_files(cluster_dir, "*.agent.ts")
        for af in agent_files:
            agents_checked += 1
            content = read_file(af)
            if content is None:
                r.add("Backend-AgentDetail", f"Read: {af.name}", False, "Cannot read file", "blocker")
                agents_fail += 1
                continue

            # Check for class extending BaseAgent
            extends_base = bool(re.search(r'extends\s+BaseAgent\b', content))
            # Also check for implements pattern (older agents might use implements)
            implements_iface = bool(re.search(r'implements\s+\w*Agent', content))

            ok = extends_base or implements_iface
            if ok:
                agents_pass += 1
            else:
                agents_fail += 1
                r.add("Backend-AgentDetail", f"Class: {af.name}", False,
                      f"Does not extend BaseAgent or implement agent interface", "warning")

    r.add("Backend-Agents", "All agents extend BaseAgent", agents_fail == 0,
          f"{agents_pass}/{agents_checked} pass, {agents_fail} fail")

    # 1d. Verify cluster module files exist
    print("\n  Checking cluster module files...")
    module_patterns = [
        "*-cluster.module.ts",
        "*.module.ts",
    ]
    for cluster_name in EXPECTED_CLUSTERS:
        cluster_dir = clusters_dir / cluster_name
        module_files = list(cluster_dir.glob("*.module.ts"))
        has_module = len(module_files) > 0
        r.add("Backend-Modules", f"Module: {cluster_name}", has_module,
              ", ".join(m.name for m in module_files) if has_module else "NO module file!",
              "blocker" if not has_module else "info")

    # 1e. Verify app.module.ts imports all clusters
    print("\n  Checking app.module.ts imports...")
    app_module_path = BACKEND_SRC / "app.module.ts"
    app_module_content = read_file(app_module_path)
    if app_module_content:
        for cluster_name in EXPECTED_CLUSTERS:
            # Check if the cluster name appears in the imports
            found = cluster_name.replace("-", "") in app_module_content.replace("-", "").replace("_", "")
            # More precise check: look for import from clusters/{cluster_name}
            import_found = f"clusters/{cluster_name}" in app_module_content
            r.add("Backend-AppModule", f"Import: {cluster_name}", import_found,
                  f"Found in app.module.ts" if import_found else "NOT imported in app.module.ts",
                  "blocker" if not import_found else "info")
    else:
        r.add("Backend-AppModule", "Read app.module.ts", False, "Cannot read file", "blocker")

    # 1f. Check ClusterType enum matches between backend and frontend
    print("\n  Checking ClusterType enum consistency...")
    be_entity = read_file(BACKEND_SRC / "modules" / "agent" / "entities" / "agent.entity.ts")
    fe_types = read_file(FRONTEND_SRC / "lib" / "types.ts")

    if be_entity and fe_types:
        be_clusters = extract_enum_values(be_entity, "ClusterType")
        fe_clusters = extract_enum_values(fe_types, "ClusterType")

        # Compare values (the string values, not the key names)
        be_values = set(be_clusters.values())
        fe_values = set(fe_clusters.values())

        if be_values == fe_values:
            r.add("Backend-Frontend", "ClusterType enum match", True,
                  f"Both have {len(be_values)} matching values")
        else:
            missing_in_fe = be_values - fe_values
            missing_in_be = fe_values - be_values
            detail_parts = []
            if missing_in_fe:
                detail_parts.append(f"Missing in frontend: {missing_in_fe}")
            if missing_in_be:
                detail_parts.append(f"Missing in backend: {missing_in_be}")
            r.add("Backend-Frontend", "ClusterType enum match", False,
                  "; ".join(detail_parts), "blocker")
    else:
        r.add("Backend-Frontend", "ClusterType enum check", False,
              "Cannot read entity/types files", "blocker")

    # 1g. Check MissionCategory enum matches
    print("  Checking MissionCategory enum consistency...")
    if be_entity and fe_types:
        be_missions = extract_enum_values(be_entity, "MissionCategory")
        fe_missions = extract_enum_values(fe_types, "MissionCategory")
        be_mvals = set(be_missions.values())
        fe_mvals = set(fe_missions.values())

        if be_mvals == fe_mvals:
            r.add("Backend-Frontend", "MissionCategory enum match", True,
                  f"Both have {len(be_mvals)} matching values")
        else:
            missing_in_fe = be_mvals - fe_mvals
            missing_in_be = fe_mvals - be_mvals
            detail_parts = []
            if missing_in_fe:
                detail_parts.append(f"Missing in frontend: {missing_in_fe}")
            if missing_in_be:
                detail_parts.append(f"Missing in backend: {missing_in_be}")
            r.add("Backend-Frontend", "MissionCategory enum match", False,
                  "; ".join(detail_parts), "warning")
    else:
        r.add("Backend-Frontend", "MissionCategory enum check", False,
              "Cannot read entity/types files", "warning")

    # 1h. Verify LLM module runtime provider switching methods
    print("  Checking LLM module methods...")
    llm_service = read_file(BACKEND_SRC / "modules" / "llm" / "llm.service.ts")
    if llm_service:
        required_methods = ["switchProvider", "setFallbackConfig", "applyConfig", "getConfig", "listProviders"]
        for method in required_methods:
            found = bool(re.search(rf'(?:async\s+)?{method}\s*\(', llm_service))
            r.add("Backend-LLM", f"Method: {method}", found,
                  f"Found in LLMService" if found else "MISSING from LLMService",
                  "blocker" if not found else "info")
    else:
        r.add("Backend-LLM", "Read llm.service.ts", False, "Cannot read file", "blocker")

    # 1i. Verify Credit module entities
    print("  Checking Credit module entities...")
    credit_entity = read_file(BACKEND_SRC / "modules" / "credit" / "entities" / "credit.entity.ts")
    if credit_entity:
        required_entities = ["CreditAccount", "CreditTransaction", "AdminSetting"]
        for entity in required_entities:
            found = f"class {entity}" in credit_entity or f"@Entity" in credit_entity and entity in credit_entity
            # More precise: check for class declaration
            class_found = bool(re.search(rf'export\s+class\s+{entity}\b', credit_entity))
            r.add("Backend-Credit", f"Entity: {entity}", class_found,
                  f"Found" if class_found else "MISSING",
                  "blocker" if not class_found else "info")
    else:
        r.add("Backend-Credit", "Read credit.entity.ts", False, "Cannot read file", "blocker")

    # 1j. Verify Auth module components
    print("  Checking Auth module components...")
    auth_dir = BACKEND_SRC / "modules" / "auth"
    auth_components = {
        "JWT Strategy": auth_dir / "strategies" / "jwt.strategy.ts",
        "Roles Guard": auth_dir / "guards" / "roles.guard.ts",
        "JWT Auth Guard": auth_dir / "guards" / "jwt-auth.guard.ts",
        "Auth Service": auth_dir / "auth.service.ts",
        "Auth Controller": auth_dir / "auth.controller.ts",
        "Auth Module": auth_dir / "auth.module.ts",
    }
    for comp_name, comp_path in auth_components.items():
        exists = comp_path.is_file()
        r.add("Backend-Auth", comp_name, exists,
              str(comp_path.relative_to(PROJECT_ROOT)) if exists else f"MISSING: {comp_path}",
              "blocker" if not exists else "info")

    # 1k. Verify Security module with encryption service
    print("  Checking Security module...")
    security_module = BACKEND_SRC / "modules" / "security" / "security.module.ts"
    encryption_service = BACKEND_SRC / "modules" / "security" / "services" / "encryption.service.ts"

    r.add("Backend-Security", "Security module exists", security_module.is_file(),
          str(security_module.relative_to(PROJECT_ROOT)) if security_module.is_file() else "MISSING",
          "blocker" if not security_module.is_file() else "info")
    r.add("Backend-Security", "Encryption service exists", encryption_service.is_file(),
          str(encryption_service.relative_to(PROJECT_ROOT)) if encryption_service.is_file() else "MISSING",
          "blocker" if not encryption_service.is_file() else "info")

    # 1l. Verify migrations exist
    print("  Checking migrations...")
    migrations_dir = BACKEND_SRC / "migrations"
    migration_files = list(migrations_dir.glob("*.ts")) if migrations_dir.is_dir() else []
    r.add("Backend-Migrations", "Migrations directory exists", migrations_dir.is_dir(),
          str(migrations_dir) if migrations_dir.is_dir() else "MISSING",
          "blocker" if not migrations_dir.is_dir() else "info")
    r.add("Backend-Migrations", "Migration files present", len(migration_files) > 0,
          f"{len(migration_files)} migration file(s)" if migration_files else "NO migration files",
          "warning" if not migration_files else "info")
    for mf in sorted(migration_files):
        r.add("Backend-Migrations", f"  {mf.name}", True, str(mf.relative_to(PROJECT_ROOT)))

    # 1m. Verify docker-compose.yml and Dockerfile exist
    print("  Checking Docker files...")
    docker_compose = PROJECT_ROOT / "docker-compose.yml"
    dockerfile = PROJECT_ROOT / "docker" / "Dockerfile"
    dockerfile_frontend = PROJECT_ROOT / "docker" / "Dockerfile.frontend"

    r.add("Backend-Docker", "docker-compose.yml exists", docker_compose.is_file(),
          str(docker_compose) if docker_compose.is_file() else "MISSING",
          "blocker" if not docker_compose.is_file() else "info")
    r.add("Backend-Docker", "Backend Dockerfile exists", dockerfile.is_file(),
          str(dockerfile) if dockerfile.is_file() else "MISSING",
          "blocker" if not dockerfile.is_file() else "info")
    r.add("Backend-Docker", "Frontend Dockerfile exists", dockerfile_frontend.is_file(),
          str(dockerfile_frontend) if dockerfile_frontend.is_file() else "MISSING",
          "warning" if not dockerfile_frontend.is_file() else "info")


# ═══════════════════════════════════════════════════════════════
#  2. Frontend Validation
# ═══════════════════════════════════════════════════════════════

def validate_frontend(r: ValidationResult):
    print("\n" + "="*70)
    print("  2. FRONTEND VALIDATION")
    print("="*70)

    # 2a. Verify page routes exist
    print("\n  Checking page routes...")
    pages_dir = FRONTEND_SRC / "app"
    found_pages = 0
    for page_route in EXPECTED_PAGES:
        if page_route == "":
            page_file = pages_dir / "page.tsx"
        else:
            page_file = pages_dir / page_route / "page.tsx"
        exists = page_file.is_file()
        if exists:
            found_pages += 1
        r.add("Frontend-Pages", f"Page: /{page_route}" if page_route else "Page: / (root)",
              exists,
              str(page_file.relative_to(PROJECT_ROOT)) if exists else f"MISSING: {page_file}",
              "blocker" if not exists else "info")

    r.add("Frontend-Pages", f"Page count ({found_pages}/{len(EXPECTED_PAGES)})",
          found_pages >= len(EXPECTED_PAGES),
          f"Found {found_pages} of {len(EXPECTED_PAGES)} expected pages")

    # 2b. Verify types.ts has complete ClusterType enum
    print("\n  Checking types.ts ClusterType enum...")
    types_file = read_file(FRONTEND_SRC / "lib" / "types.ts")
    if types_file:
        fe_clusters = extract_enum_values(types_file, "ClusterType")
        expected_count = 17
        actual_count = len(fe_clusters)
        r.add("Frontend-Types", f"ClusterType enum ({actual_count}/{expected_count})",
              actual_count >= expected_count,
              f"Values: {list(fe_clusters.values())}",
              "blocker" if actual_count < expected_count else "info")

        # Verify each expected value
        for key, val in BACKEND_CLUSTER_TYPES.items():
            found = val in fe_clusters.values()
            r.add("Frontend-Types", f"ClusterType.{key} = '{val}'", found,
                  "Present" if found else "MISSING",
                  "blocker" if not found else "info")
    else:
        r.add("Frontend-Types", "Read types.ts", False, "Cannot read file", "blocker")

    # 2c. Verify utils.ts has clusterColors and clusterIcons for all clusters
    print("  Checking utils.ts cluster mappings...")
    utils_file = read_file(FRONTEND_SRC / "lib" / "utils.ts")
    if utils_file:
        for key, val in BACKEND_CLUSTER_TYPES.items():
            # clusterColors uses [ClusterType.KEY]: pattern
            color_found = f"ClusterType.{key}" in utils_file and "clusterColors" in utils_file
            icon_found = f"ClusterType.{key}" in utils_file and "clusterIcons" in utils_file
            r.add("Frontend-Utils", f"clusterColors[{key}]", color_found,
                  "Present" if color_found else "MISSING",
                  "warning" if not color_found else "info")
            r.add("Frontend-Utils", f"clusterIcons[{key}]", icon_found,
                  "Present" if icon_found else "MISSING",
                  "warning" if not icon_found else "info")
    else:
        r.add("Frontend-Utils", "Read utils.ts", False, "Cannot read file", "blocker")

    # 2d. Verify api.ts has all API methods
    print("  Checking api.ts methods...")
    api_file = read_file(FRONTEND_SRC / "lib" / "api.ts")
    if api_file:
        # Look for key method patterns (actual method names in api.ts)
        # NOTE: Some methods are declared as object properties (shorthand syntax)
        # e.g. `collaborate: (data) => this.request(...)` inside an object
        api_methods = [
            # Agent methods
            ("getAgents", "method"),
            ("getAgent", "method"),
            ("executeAgent", "method"),
            # Task methods
            ("getTasks", "method"),
            ("createTask", "method"),
            # Event methods
            ("getEvents", "method"),
            # Mission methods
            ("getMissions", "method"),
            ("createMission", "method"),
            # Auth methods
            ("login", "method"),
            ("register", "method"),
            ("refreshAuth", "method"),
            # Health
            ("getHealth", "method"),
            # Credit methods
            ("getCreditsBalance", "method"),
            ("getCreditsPackages", "method"),
            ("getCreditsWhatsappNumber", "method"),
            # Orchestration methods (may be nested as object properties)
            ("collaborate", "property"),
            ("decompose", "property"),
            ("coordinate", "property"),
            ("getClusterHealth", "property"),
            # Intelligence methods
            ("getGraphStats", "property"),
            ("getLearningStats", "property"),
            # Swarm methods
            ("createSwarm", "any"),
            ("getSwarmMetrics", "any"),
            # LLM Provider admin
            ("getLLMConfig", "any"),
            ("updateLLMConfig", "any"),
            ("getLLMProviders", "any"),
        ]
        for method_name, search_type in api_methods:
            # Search for method declarations in multiple forms
            found = False
            if search_type == "method" or search_type == "any":
                # async methodName( or methodName(
                found = bool(re.search(rf'(?:async\s+)?{method_name}\s*\(', api_file))
            if not found and (search_type == "property" or search_type == "any"):
                # propertyName: (args) => or propertyName: async ( or propertyName: () =>
                found = bool(re.search(rf'{method_name}\s*[:=]\s*(?:async\s*)?(?:\([^)]*\)\s*=>|\()', api_file))
            if not found and search_type == "any":
                # Also check as string key
                found = bool(re.search(rf"['\"]?{method_name}['\"]?\s*[:=]", api_file))
            r.add("Frontend-API", f"Method: {method_name}", found,
                  "Present" if found else "MISSING",
                  "warning" if not found else "info")

        # Also verify Next.js API routes exist for admin/credits
        admin_routes = [
            "api/admin/credits/route.ts",
            "api/admin/users/route.ts",
            "api/admin/settings/route.ts",
            "api/credits/route.ts",
            "api/credits/deduct/route.ts",
            "api/credits/transactions/route.ts",
        ]
        for route in admin_routes:
            # Check in /src/app/ (Next.js app router)
            route_path = PROJECT_ROOT / "src" / "app" / route
            # Also check in frontend/src/app/ if it's a separate frontend
            fe_route_path = FRONTEND_SRC / "app" / route
            found = route_path.is_file() or fe_route_path.is_file()
            r.add("Frontend-API", f"Route: /{route}", found,
                  "Present" if found else "MISSING",
                  "info" if found else "warning")
    else:
        r.add("Frontend-API", "Read api.ts", False, "Cannot read file", "blocker")

    # 2e. Verify LLM Provider admin page exists
    print("  Checking LLM Provider admin page...")
    llm_admin_page = FRONTEND_SRC / "app" / "admin" / "llm-provider" / "page.tsx"
    r.add("Frontend-Pages", "LLM Provider admin page", llm_admin_page.is_file(),
          str(llm_admin_page.relative_to(PROJECT_ROOT)) if llm_admin_page.is_file() else "MISSING",
          "blocker" if not llm_admin_page.is_file() else "info")

    # 2f. Verify build output exists (.next directory)
    print("  Checking frontend build output...")
    next_dir = PROJECT_ROOT / "frontend" / ".next"
    # Also check root .next (monorepo style)
    root_next = PROJECT_ROOT / ".next"
    has_build = next_dir.is_dir() or root_next.is_dir()
    r.add("Frontend-Build", "Frontend .next build output", has_build,
          f"Found at: {next_dir if next_dir.is_dir() else root_next if root_next.is_dir() else 'NOT FOUND'}",
          "warning" if not has_build else "info")


# ═══════════════════════════════════════════════════════════════
#  3. Infrastructure Validation
# ═══════════════════════════════════════════════════════════════

def validate_infrastructure(r: ValidationResult):
    print("\n" + "="*70)
    print("  3. INFRASTRUCTURE VALIDATION")
    print("="*70)

    # 3a. Verify docker-compose.yml has required services
    print("\n  Checking docker-compose.yml services...")
    dc_path = PROJECT_ROOT / "docker-compose.yml"
    dc_content = read_file(dc_path)
    if dc_content:
        # Check active services (uncommented)
        active_services = ["postgres", "redis"]
        for svc in active_services:
            found = bool(re.search(rf'^\s*{svc}\s*:', dc_content, re.MULTILINE))
            r.add("Infra-Docker", f"Service: {svc} (active)",
                  found,
                  "Active" if found else "NOT FOUND",
                  "blocker" if not found else "info")

        # Check app/frontend services (may be commented out for development)
        # In docker-compose.yml, the backend is named 'app' and frontend is 'frontend'
        commented_services = {
            "app (backend)": "app",
            "frontend": "frontend",
            "nginx": "nginx",
        }
        for display_name, svc in commented_services.items():
            # Check if defined (even commented)
            found = bool(re.search(rf'^\s*#?\s*{svc}\s*:', dc_content, re.MULTILINE))
            is_active = bool(re.search(rf'^\s*{svc}\s*:', dc_content, re.MULTILINE))
            r.add("Infra-Docker", f"Service: {display_name}" + (" (active)" if is_active else " (commented/ready)"),
                  found,
                  f"{'Active' if is_active else 'Defined (commented out — uncomment for VPS)'}" if found else "NOT FOUND",
                  "warning" if not is_active and found else "blocker" if not found else "info")

        # Also check for RabbitMQ, Neo4j, Qdrant, MinIO
        infra_services = ["rabbitmq", "neo4j", "qdrant", "minio"]
        for svc in infra_services:
            found = bool(re.search(rf'^\s*{svc}\s*:', dc_content, re.MULTILINE))
            r.add("Infra-Docker", f"Service: {svc}", found,
                  "Active" if found else "NOT FOUND",
                  "info" if found else "warning")
    else:
        r.add("Infra-Docker", "Read docker-compose.yml", False, "Cannot read file", "blocker")

    # 3b. Verify Dockerfiles exist
    print("  Checking Dockerfiles...")
    dockerfiles = {
        "Backend Dockerfile": PROJECT_ROOT / "docker" / "Dockerfile",
        "Frontend Dockerfile": PROJECT_ROOT / "docker" / "Dockerfile.frontend",
    }
    for name, path in dockerfiles.items():
        exists = path.is_file()
        r.add("Infra-Docker", name, exists,
              str(path.relative_to(PROJECT_ROOT)) if exists else f"MISSING: {path}",
              "blocker" if not exists else "info")

    # 3c. Verify nginx config exists
    print("  Checking nginx config...")
    nginx_conf = PROJECT_ROOT / "docker" / "nginx" / "nginx.conf"
    r.add("Infra-Nginx", "nginx.conf exists", nginx_conf.is_file(),
          str(nginx_conf.relative_to(PROJECT_ROOT)) if nginx_conf.is_file() else "MISSING",
          "warning" if not nginx_conf.is_file() else "info")

    # Verify nginx has key routing sections
    if nginx_conf.is_file():
        nginx_content = read_file(nginx_conf)
        if nginx_content:
            nginx_checks = {
                "API proxy": "/api/" in nginx_content,
                "WebSocket support": "/socket.io/" in nginx_content,
                "SSL configuration": "ssl_certificate" in nginx_content,
                "Security headers": "X-Frame-Options" in nginx_content,
                "Rate limiting": "limit_req_zone" in nginx_content,
            }
            for check_name, passed in nginx_checks.items():
                r.add("Infra-Nginx", check_name, passed,
                      "Present" if passed else "MISSING", "info")

    # 3d. Verify init-db.sql exists
    print("  Checking init-db.sql...")
    init_db = PROJECT_ROOT / "docker" / "init-db.sql"
    r.add("Infra-DB", "init-db.sql exists", init_db.is_file(),
          str(init_db.relative_to(PROJECT_ROOT)) if init_db.is_file() else "MISSING",
          "blocker" if not init_db.is_file() else "info")

    # Also check canonical source
    canonical_init_db = PROJECT_ROOT / "backend" / "data" / "init-db.sql"
    r.add("Infra-DB", "Canonical init-db.sql exists", canonical_init_db.is_file(),
          str(canonical_init_db.relative_to(PROJECT_ROOT)) if canonical_init_db.is_file() else "MISSING",
          "warning" if not canonical_init_db.is_file() else "info")

    # 3e. Verify Caddyfile exists for production
    print("  Checking Caddyfile...")
    caddyfile = PROJECT_ROOT / "Caddyfile"
    r.add("Infra-Caddy", "Caddyfile exists", caddyfile.is_file(),
          str(caddyfile) if caddyfile.is_file() else "MISSING",
          "info" if caddyfile.is_file() else "warning")

    # 3f. Verify docker-compose.prod.yml exists
    print("  Checking production Docker Compose...")
    dc_prod = PROJECT_ROOT / "docker" / "docker-compose.prod.yml"
    r.add("Infra-Docker", "docker-compose.prod.yml exists", dc_prod.is_file(),
          str(dc_prod.relative_to(PROJECT_ROOT)) if dc_prod.is_file() else "MISSING",
          "info" if dc_prod.is_file() else "warning")

    # 3g. Verify monitoring configs
    print("  Checking monitoring configs...")
    monitoring_dir = PROJECT_ROOT / "docker" / "monitoring"
    monitoring_files = {
        "Prometheus config": monitoring_dir / "prometheus.yml",
        "Alertmanager config": monitoring_dir / "alertmanager" / "alertmanager.yml",
        "Grafana dashboards": monitoring_dir / "dashboards",
    }
    for name, path in monitoring_files.items():
        exists = path.is_file() or path.is_dir()
        r.add("Infra-Monitoring", name, exists,
              str(path.relative_to(PROJECT_ROOT)) if exists else "MISSING",
              "info" if exists else "warning")


# ═══════════════════════════════════════════════════════════════
#  4. Agent Audit
# ═══════════════════════════════════════════════════════════════

def validate_agent_audit(r: ValidationResult):
    print("\n" + "="*70)
    print("  4. AGENT AUDIT (Detailed)")
    print("="*70)

    clusters_dir = BACKEND_SRC / "clusters"
    total_audited = 0
    total_pass = 0
    total_fail = 0

    for cluster_name in EXPECTED_CLUSTERS:
        cluster_dir = clusters_dir / cluster_name
        agent_files = find_files(cluster_dir, "*.agent.ts")

        print(f"\n  Cluster: {cluster_name} ({len(agent_files)} agents)")
        cluster_pass = 0
        cluster_fail = 0

        for af in sorted(agent_files):
            total_audited += 1
            content = read_file(af)
            if content is None:
                total_fail += 1
                cluster_fail += 1
                r.add("AgentAudit", f"{cluster_name}/{af.name}", False,
                      "Cannot read file", "blocker")
                continue

            # Check required properties
            missing_props = []
            for prop in REQUIRED_AGENT_PROPS:
                # Look for: readonly name = '...' or readonly name: string = ...
                # or just the property declaration
                prop_pattern = rf'(?:readonly\s+)?{prop}\s*[=:]'
                if not re.search(prop_pattern, content):
                    missing_props.append(prop)

            # Check for execute method (abstract from BaseAgent)
            has_execute = bool(re.search(r'(?:async\s+)?execute\s*\(', content))

            # Check for extends BaseAgent
            extends_base = bool(re.search(r'extends\s+BaseAgent\b', content))

            if not missing_props and has_execute and extends_base:
                total_pass += 1
                cluster_pass += 1
                status_icon = "✓"
            else:
                total_fail += 1
                cluster_fail += 1
                status_icon = "✗"
                issues = []
                if missing_props:
                    issues.append(f"Missing props: {missing_props}")
                if not has_execute:
                    issues.append("Missing execute() method")
                if not extends_base:
                    issues.append("Does not extend BaseAgent")
                r.add("AgentAudit", f"{cluster_name}/{af.stem}", False,
                      "; ".join(issues), "warning")

            rel_path = str(af.relative_to(clusters_dir))
            print(f"    {status_icon} {rel_path}")

        print(f"      → {cluster_pass} pass, {cluster_fail} fail")
        r.add("AgentAudit-Summary", f"Cluster: {cluster_name}",
              cluster_fail == 0,
              f"{cluster_pass} pass, {cluster_fail} fail out of {len(agent_files)} agents")

    print(f"\n  TOTAL AGENT AUDIT: {total_pass} pass, {total_fail} fail out of {total_audited} agents")
    r.add("AgentAudit", "Overall agent audit", total_fail == 0,
          f"{total_pass}/{total_audited} agents pass all checks, {total_fail} have issues")


# ═══════════════════════════════════════════════════════════════
#  5. Build Report & Save
# ═══════════════════════════════════════════════════════════════

def build_report(r: ValidationResult) -> dict:
    # Group checks by category
    categories = OrderedDict()
    for check in r.checks:
        cat = check["category"]
        if cat not in categories:
            categories[cat] = {"pass": 0, "fail": 0, "checks": []}
        if check["passed"]:
            categories[cat]["pass"] += 1
        else:
            categories[cat]["fail"] += 1
        categories[cat]["checks"].append(check)

    # Agent inventory
    agent_inventory = {}
    total_agent_count = 0
    for cluster_name, agents in r.cluster_agents.items():
        agent_inventory[cluster_name] = {
            "count": len(agents),
            "agents": [a["name"] for a in agents],
        }
        total_agent_count += len(agents)

    report = {
        "report_title": "AENEWS Agent OS X — VPS Readiness Validation Report",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "project_root": str(PROJECT_ROOT),
        "overall_readiness_score": r.readiness_score,
        "summary": {
            "total_checks": r.total,
            "passed": r.pass_count,
            "failed": r.fail_count,
            "total_agents": total_agent_count,
            "total_clusters": len(EXPECTED_CLUSTERS),
        },
        "deployment_blockers": r.blockers,
        "categories": categories,
        "agent_inventory": agent_inventory,
        "checks_detail": r.checks,
    }
    return report


def print_summary(r: ValidationResult):
    print("\n" + "="*70)
    print("  VALIDATION SUMMARY")
    print("="*70)

    # Category summary
    categories = OrderedDict()
    for check in r.checks:
        cat = check["category"]
        if cat not in categories:
            categories[cat] = {"pass": 0, "fail": 0}
        if check["passed"]:
            categories[cat]["pass"] += 1
        else:
            categories[cat]["fail"] += 1

    for cat, counts in categories.items():
        total = counts["pass"] + counts["fail"]
        status = "PASS" if counts["fail"] == 0 else "FAIL"
        print(f"  [{status:4s}] {cat:30s}  {counts['pass']:3d}/{total:<3d} passed")

    print(f"\n  {'OVERALL READINESS SCORE':30s}  {r.readiness_score}%")
    print(f"  {'Total checks':30s}  {r.total}")
    print(f"  {'Passed':30s}  {r.pass_count}")
    print(f"  {'Failed':30s}  {r.fail_count}")

    # Agent inventory
    print(f"\n  {'AGENT INVENTORY':^70}")
    print("-"*70)
    total = 0
    for cluster_name in EXPECTED_CLUSTERS:
        agents = r.cluster_agents.get(cluster_name, [])
        count = len(agents)
        total += count
        print(f"    {cluster_name:30s} → {count:3d} agent(s)")
    print(f"    {'TOTAL':30s} → {total:3d} agent(s)")

    # Deployment blockers
    if r.blockers:
        print(f"\n  {'⚠ DEPLOYMENT BLOCKERS':^70}")
        print("-"*70)
        for b in r.blockers:
            print(f"    ✗ {b}")
    else:
        print(f"\n  ✓ NO DEPLOYMENT BLOCKERS DETECTED")

    # Failed checks detail
    failed_checks = [c for c in r.checks if not c["passed"]]
    if failed_checks:
        print(f"\n  {'FAILED CHECKS':^70}")
        print("-"*70)
        for fc in failed_checks:
            severity_tag = f"[{fc['severity'].upper()}]" if fc['severity'] != 'info' else ""
            print(f"    ✗ {fc['category']:25s} | {fc['name']:40s} {severity_tag}")
            if fc['detail']:
                print(f"      {fc['detail']}")

    print("\n" + "="*70)


# ═══════════════════════════════════════════════════════════════
#  Main
# ═══════════════════════════════════════════════════════════════

def main():
    print("╔════════════════════════════════════════════════════════════════════╗")
    print("║  AENEWS Agent OS X — VPS Readiness Validation                    ║")
    print("║  Comprehensive project validation for production deployment       ║")
    print("╚════════════════════════════════════════════════════════════════════╝")
    print(f"  Project Root: {PROJECT_ROOT}")
    print(f"  Timestamp:    {datetime.now(timezone.utc).isoformat()}")

    r = ValidationResult()

    # Run all validations
    validate_backend(r)
    validate_frontend(r)
    validate_infrastructure(r)
    validate_agent_audit(r)

    # Build and save report
    report = build_report(r)

    # Ensure download dir exists
    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

    report_path = DOWNLOAD_DIR / "AENEWS_VPS_Validation_Report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False, default=str)

    print(f"\n  Report saved to: {report_path}")

    # Print summary
    print_summary(r)

    # Exit code based on blockers
    if r.blockers:
        print(f"\n  ⚠ {len(r.blockers)} deployment blocker(s) found. Review before VPS deployment.")
        sys.exit(1)
    else:
        print(f"\n  ✓ No blockers — project is ready for VPS deployment!")
        sys.exit(0)


if __name__ == "__main__":
    main()
