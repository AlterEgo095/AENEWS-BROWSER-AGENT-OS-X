# Bridge Integration — Browser Cluster Agents

## Task ID
bridge-integration-browser-agents

## Summary
Integrated `AgentConnectorBridge` into all 17 browser cluster agent services, enabling them to delegate execution to real connectors (via the `BrowserConnector`) instead of relying solely on simulated data.

## Changes Made

### 1. Browser Cluster Module (`browser-cluster.module.ts`)
- Added `AgentConnectorBridgeModule` to imports so the bridge is available for DI

### 2. All 17 Browser Agent Services
For each agent, the following changes were applied:

#### Imports Added
- `Inject` from `@nestjs/common`
- `AgentConnectorBridge` from `../../bridge`
- `BrowserCapability` from `../../../software-factory/interfaces`
- `ConnectorOutput` from `../../../software-factory/connectors/connector.interface`

#### Constructor Added
Each agent now has a constructor that:
- Accepts the 3 base params (`eventBusService`, `memoryService`, `permissionEvaluator`) as optional
- Accepts `@Inject(AgentConnectorBridge) private readonly bridge?: AgentConnectorBridge` as 4th param
- Calls `super(eventBusService, memoryService, permissionEvaluator)`

#### Bridge Delegation in `onExecute()`
Each agent's `onExecute()` now has bridge delegation at the top:
1. If `this.bridge` is available, try `this.bridge.executeCapability(capabilityId, {...})`
2. If bridge returns successfully, return the result immediately via `this.createAgentOutput()`
3. If bridge throws, log a warning and fall back to existing simulated logic
4. All existing simulated code remains as a fallback safety net

### Capability Mapping

| Agent | BrowserCapability |
|-------|------------------|
| Navigation | `BrowserCapability.NAVIGATION` |
| Click | `BrowserCapability.FORM` |
| Form Filling | `BrowserCapability.FORM` |
| Data Extraction | `BrowserCapability.VISION` |
| Screenshot | `BrowserCapability.SCREENSHOT` |
| Cookie Management | `BrowserCapability.COOKIE` |
| Session Management | `BrowserCapability.SESSION` |
| Tab Management | `BrowserCapability.POPUP` |
| Popup Handling | `BrowserCapability.POPUP` |
| File Download | `BrowserCapability.DOWNLOAD` |
| File Upload | `BrowserCapability.UPLOAD` |
| Wait Strategy | `BrowserCapability.SESSION` |
| JavaScript Execution | `BrowserCapability.SESSION` |
| Network Intercept | `BrowserCapability.SESSION` |
| Iframe Handling | `BrowserCapability.SESSION` |
| Scroll Management | `BrowserCapability.SESSION` |
| Captcha Solving | `BrowserCapability.OCR` |

### Verification
- TypeScript compilation: No errors in browser agent files
- ESLint: Only pre-existing warnings (no new errors)
- Bridge import path verified: `../../bridge` correctly resolves to barrel export
- All existing simulated logic preserved as fallback
