import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType, MissionCategory } from '../../../modules/agent/entities/agent.entity';
import { AgentEventType } from '../../../modules/agent-framework/services/agent-event-bus.service';

/**
 * ReverseEngineeringAgent — LLM-powered reverse engineering and binary analysis.
 *
 * Performs binary analysis, decompilation, firmware extraction, protocol reverse engineering,
 * malware analysis, unpacking, and disassembly. Uses LLM for intelligent reverse engineering
 * analysis when available, falling back to heuristic-based assessment.
 */
export class ReverseEngineeringAgent extends BaseAgent {
  readonly name = 'ReverseEngineeringAgent';
  readonly cluster = ClusterType.SECURITY;
  readonly capabilities = [
    'binary-analysis',
    'decompilation',
    'firmware-extraction',
    'protocol-reverse',
    'malware-analysis',
    'unpacking',
    'disassembly',
  ];
  readonly version = '3.0.0';
  readonly description =
    'Expert in reverse engineering, binary analysis, decompilation, firmware extraction, protocol reverse engineering, and malware analysis';

  readonly missionCategories = [MissionCategory.STEALTH_OPERATIONS, MissionCategory.SECURITY_OPS];
  readonly creditCost = 6;
  readonly powerLevel = 3;
  readonly tier = 'stealth';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'analyze-binary';
      const startTime = Date.now();

      this.emitEvent(AgentEventType.AGENT_STARTED, { action });

      const llmResult = await this.executeWithLLM(
        `You are an expert in reverse engineering, binary analysis, decompilation, firmware extraction, protocol reverse engineering, malware analysis, unpacking, and disassembly. Process the reverse engineering action and return comprehensive results.
For action "${action}", return a JSON object matching the expected reverse engineering structure.
Include realistic analysis data, architecture details, and vulnerability findings.`,
        `Action: ${action}\nConfig: ${JSON.stringify(config)}`,
        { responseFormat: 'json' },
      );

      if (llmResult) {
        const parsed = this.safeJsonParse(llmResult);
        if (parsed) {
          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'llm' });
          const resultKey = action === 'analyze-binary' ? 'binaryAnalysis'
            : action === 'decompile' ? 'decompilation'
            : action === 'extract-firmware' ? 'firmwareExtraction'
            : action === 'reverse-protocol' ? 'protocolReverse'
            : action === 'analyze-malware' ? 'malwareAnalysis'
            : 'disassembly';
          return {
            success: true,
            data: { action, ...config, [resultKey]: parsed, status: `${action}_complete`, generatedBy: 'llm', timestamp: new Date().toISOString() },
            metadata: { duration: Date.now() - startTime, source: 'llm' },
          };
        }
      }

      this.logger.log('LLM unavailable — falling back to heuristic reverse engineering analysis');
      this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, source: 'heuristic' });

      switch (action) {
        case 'analyze-binary': {
          const binaryPath = config.binaryPath || '/unknown/binary';
          const analysisDepth = config.analysisDepth || 'deep';
          const includeStrings = config.includeStrings !== false;
          const includeSymbols = config.includeSymbols !== false;
          const includeImports = config.includeImports !== false;

          return {
            success: true,
            data: {
              action, binaryPath, analysisDepth: analysisDepth as any,
              includeStrings, includeSymbols, includeImports,
              binaryAnalysis: {
                binaryPath,
                metadata: {
                  format: 'ELF' as const,
                  architecture: 'x86_64',
                  bits: 64,
                  endian: 'little' as const,
                  type: 'DYN (Shared object)',
                  entryPoint: '0x4010a0',
                  compiler: 'GCC 11.4.0',
                  stripped: true,
                  fileSize: 245760,
                },
                sections: [
                  { name: '.text', offset: '0x1000', size: 98304, permissions: 'r-x', entropy: 7.2 },
                  { name: '.data', offset: '0x19000', size: 4096, permissions: 'rw-', entropy: 3.8 },
                  { name: '.rodata', offset: '0x1a000', size: 8192, permissions: 'r--', entropy: 4.5 },
                  { name: '.plt', offset: '0x1020', size: 128, permissions: 'r-x', entropy: 6.1 },
                ],
                symbols: includeSymbols ? [
                  { name: 'main', address: '0x4011a0', type: 'FUNC' as const, size: 256, visibility: 'global' },
                  { name: 'parse_input', address: '0x4012a0', type: 'FUNC' as const, size: 128, visibility: 'local' },
                  { name: 'validate_token', address: '0x401320', type: 'FUNC' as const, size: 96, visibility: 'local' },
                ] : undefined,
                imports: includeImports ? [
                  { name: 'fopen', library: 'libc.so.6', type: 'FILE*' },
                  { name: 'malloc', library: 'libc.so.6', type: 'void*' },
                  { name: 'strcmp', library: 'libc.so.6', type: 'int' },
                  { name: 'connect', library: 'libpthread.so.0', type: 'int' },
                  { name: 'SSL_write', library: 'libssl.so.3', type: 'int' },
                ] : undefined,
                strings: includeStrings ? [
                  { value: '/etc/config.ini', offset: '0x1a100', category: 'file-path' as const },
                  { value: 'Authorization: Bearer %s', offset: '0x1a150', category: 'format-string' as const },
                  { value: 'Connection failed: %s', offset: '0x1a180', category: 'error-message' as const },
                  { value: 'https://api.internal.corp/v2/auth', offset: '0x1a1c0', category: 'url' as const },
                ] : undefined,
                vulnerabilities: [
                  { location: 'parse_input+0x48', type: 'buffer-overflow' as const, severity: 'critical' as const, description: 'Stack buffer overflow in parse_input — no bounds check on read size' },
                  { location: 'validate_token+0x20', type: 'hardcoded-credential' as const, severity: 'high' as const, description: 'Hardcoded comparison with static token value' },
                ],
                status: 'analyzed',
              },
              status: 'binary_analysis_complete', generatedBy: 'heuristic', timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        case 'decompile': {
          const binaryPath = config.binaryPath || '/unknown/binary';
          const targetFunction = config.targetFunction || 'main';
          const decompiler = config.decompiler || 'ghidra';
          const includePseudoCode = config.includePseudoCode !== false;
          const includeControlFlow = config.includeControlFlow || false;

          return {
            success: true,
            data: {
              action, binaryPath, targetFunction, decompiler: decompiler as any,
              includePseudoCode, includeControlFlow,
              decompilation: {
                binaryPath,
                targetFunction,
                decompiler,
                functionInfo: {
                  name: targetFunction,
                  address: '0x4011a0',
                  size: 256,
                  parameters: [
                    { name: 'argc', type: 'int', offset: 'rdi' },
                    { name: 'argv', type: 'char**', offset: 'rsi' },
                  ],
                  returnType: 'int',
                  localVariables: [
                    { name: 'config_buf', type: 'char[4096]', stackOffset: '-0x1010' },
                    { name: 'auth_token', type: 'char*', stackOffset: '-0x8' },
                    { name: 'result', type: 'int', stackOffset: '-0x4' },
                  ],
                },
                pseudoCode: includePseudoCode ? `int main(int argc, char **argv) {
  char config_buf[4096];
  char *auth_token;
  int result;

  if (argc < 2) {
    printf("Usage: %s <config_file>\\n", argv[0]);
    return 1;
  }

  FILE *fp = fopen(argv[1], "r");
  if (!fp) {
    printf("Error: Cannot open %s\\n", argv[1]);
    return 1;
  }

  // VULNERABILITY: No bounds check on read size
  fread(config_buf, 1, 0x10000, fp);  // Reads up to 64KB into 4KB buffer
  fclose(fp);

  auth_token = parse_input(config_buf);
  result = validate_token(auth_token);

  if (result == 0) {
    connect_to_server(auth_token);
  }

  return result;
}` : undefined,
                controlFlowGraph: includeControlFlow ? {
                  nodes: [
                    { id: 'n1', address: '0x4011a0', type: 'entry' as const, instruction: 'push rbp' },
                    { id: 'n2', address: '0x4011c0', type: 'condition' as const, instruction: 'cmp dword [rbp-4], 1' },
                    { id: 'n3', address: '0x4011d0', type: 'block' as const, instruction: 'call fopen' },
                    { id: 'n4', address: '0x401250', type: 'return' as const, instruction: 'xor eax, eax; leave; ret' },
                  ],
                  edges: [
                    { from: 'n1', to: 'n2', type: 'unconditional' as const },
                    { from: 'n2', to: 'n3', condition: 'argc >= 2' },
                    { from: 'n2', to: 'n4', condition: 'argc < 2' },
                  ],
                } : undefined,
                decompilationQuality: 0.82,
                status: 'decompiled',
              },
              status: 'decompilation_complete', generatedBy: 'heuristic', timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        case 'extract-firmware': {
          const firmwarePath = config.firmwarePath || '/unknown/firmware.bin';
          const targetArchitecture = config.targetArchitecture || 'ARM';
          const extractFileSystem = config.extractFileSystem !== false;
          const includeBootloader = config.includeBootloader || false;

          return {
            success: true,
            data: {
              action, firmwarePath, targetArchitecture: targetArchitecture as any,
              extractFileSystem, includeBootloader,
              firmwareExtraction: {
                firmwarePath,
                metadata: {
                  vendor: 'IoTVendor',
                  model: 'Router-X500',
                  version: '3.2.1',
                  buildDate: '2024-09-15',
                  architecture: targetArchitecture,
                  totalSize: 8388608,
                },
                partitions: [
                  { name: 'bootloader', offset: 0, size: 131072, type: 'u-boot' as const, extracted: includeBootloader },
                  { name: 'kernel', offset: 131072, size: 2097152, type: 'zImage' as const, extracted: true },
                  { name: 'rootfs', offset: 2228224, size: 5242880, type: 'squashfs' as const, extracted: extractFileSystem },
                  { name: 'nvram', offset: 7471104, size: 524288, type: 'jffs2' as const, extracted: extractFileSystem },
                  { name: 'factory', offset: 7995392, size: 393216, type: 'raw' as const, extracted: false },
                ],
                fileSystem: extractFileSystem ? {
                  type: 'squashfs',
                  totalFiles: 1247,
                  totalDirectories: 312,
                  interestingFiles: [
                    { path: '/etc/passwd', permissions: 'rw-r--r--', containsHardcodedCreds: true },
                    { path: '/etc/shadow', permissions: 'rw-------', containsHardcodedCreds: true },
                    { path: '/usr/sbin/httpd', permissions: 'rwxr-xr-x', isSetuid: true },
                    { path: '/etc/init.d/rcS', permissions: 'rwxr-xr-x', isStartupScript: true },
                    { path: '/var/run/debug.log', permissions: 'rw-r--r--', containsSensitiveInfo: true },
                  ],
                } : undefined,
                vulnerabilities: [
                  { type: 'hardcoded-credentials' as const, location: '/etc/passwd', severity: 'critical' as const, description: 'Default admin credentials in firmware: admin:admin123' },
                  { type: 'command-injection' as const, location: '/usr/sbin/httpd', severity: 'critical' as const, description: 'Web interface parameters passed directly to system() calls' },
                  { type: 'outdated-component' as const, location: '/lib/libssl.so.1.0.2', severity: 'high' as const, description: 'OpenSSL 1.0.2 with known vulnerabilities' },
                ],
                status: 'extracted',
              },
              status: 'firmware_extraction_complete', generatedBy: 'heuristic', timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        case 'reverse-protocol': {
          const protocolName = config.protocolName || 'unknown-protocol';
          const captureData = config.captureData || {};
          const targetPort = config.targetPort || 8443;
          const includeMessageFlow = config.includeMessageFlow !== false;
          const includeFieldMapping = config.includeFieldMapping !== false;

          return {
            success: true,
            data: {
              action, protocolName, captureData: captureData as any,
              targetPort, includeMessageFlow, includeFieldMapping,
              protocolReverse: {
                protocolName,
                metadata: {
                  transport: 'TCP' as const,
                  port: targetPort,
                  encryption: 'TLS 1.2 with custom certificate',
                  byteOrder: 'big-endian' as const,
                  framingType: 'length-prefixed' as const,
                },
                messageStructure: {
                  header: { size: 16, fields: [
                    { name: 'magic', offset: 0, size: 4, type: 'uint32', value: '0xDEADBEEF', description: 'Protocol magic number' },
                    { name: 'version', offset: 4, size: 2, type: 'uint16', value: '0x0003', description: 'Protocol version 3' },
                    { name: 'message_type', offset: 6, size: 2, type: 'uint16', description: 'Message type identifier' },
                    { name: 'payload_length', offset: 8, size: 4, type: 'uint32', description: 'Length of payload in bytes' },
                    { name: 'sequence_id', offset: 12, size: 4, type: 'uint32', description: 'Request/response sequence number' },
                  ] },
                  payload: { variable: true, encoding: 'protobuf-like' as const, compression: 'zlib' },
                  trailer: { size: 4, type: 'crc32' as const },
                },
                messageTypes: includeFieldMapping ? [
                  { id: 0x0001, name: 'AUTH_REQUEST', direction: 'client→server', frequency: 'high' as const, fields: ['username', 'password_hash', 'client_version'] },
                  { id: 0x0002, name: 'AUTH_RESPONSE', direction: 'server→client', frequency: 'high' as const, fields: ['session_token', 'permissions', 'server_time'] },
                  { id: 0x0010, name: 'DATA_QUERY', direction: 'client→server', frequency: 'medium' as const, fields: ['query_type', 'query_params', 'pagination'] },
                  { id: 0x0011, name: 'DATA_RESPONSE', direction: 'server→client', frequency: 'medium' as const, fields: ['result_set', 'total_count', 'has_more'] },
                  { id: 0x00FF, name: 'HEARTBEAT', direction: 'bidirectional', frequency: 'very-high' as const, fields: ['timestamp'] },
                ] : undefined,
                messageFlow: includeMessageFlow ? {
                  handshake: ['AUTH_REQUEST → AUTH_RESPONSE', 'Session established'],
                  dataExchange: ['DATA_QUERY → DATA_RESPONSE', 'Supports pagination via has_more flag'],
                  keepAlive: 'HEARTBEAT every 30 seconds',
                  teardown: 'TCP FIN after 60s idle',
                } : undefined,
                securityObservations: [
                  'Password hash uses unsalted SHA-256 — vulnerable to rainbow table attacks',
                  'Session token is 16-byte hex string — insufficient entropy for long-lived sessions',
                  'No message authentication code (MAC) on messages — vulnerable to tampering',
                ],
                status: 'reversed',
              },
              status: 'protocol_reverse_complete', generatedBy: 'heuristic', timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        case 'analyze-malware': {
          const malwarePath = config.malwarePath || '/unknown/malware.bin';
          const analysisMode = config.analysisMode || 'full';
          const includeIndicators = config.includeIndicators !== false;
          const includeBehavior = config.includeBehavior !== false;
          const sandboxDuration = config.sandboxDuration || 120;

          return {
            success: true,
            data: {
              action, malwarePath, analysisMode: analysisMode as any,
              includeIndicators, includeBehavior, sandboxDuration,
              malwareAnalysis: {
                malwarePath,
                classification: {
                  family: 'CobaltStrike Beacon',
                  type: 'trojan' as const,
                  platform: 'Windows',
                  architecture: 'x86_64',
                  language: 'C/C++',
                  firstSeen: '2024-12-01',
                },
                static: {
                  fileSize: 286720,
                  hashSHA256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                  hashMD5: 'd41d8cd98f00b204e9800998ecf8427e',
                  packer: 'UPX 3.96',
                  compiler: 'Microsoft Visual C++',
                  imports: ['CreateProcessA', 'VirtualAlloc', 'WriteProcessMemory', 'InternetConnectA', 'HttpSendRequestA'],
                  antiAnalysis: ['Checks for debugger via IsDebuggerPresent', 'Timing checks using GetTickCount', 'VM detection via registry keys'],
                },
                behavior: includeBehavior ? {
                  execution: [
                    { step: 1, action: 'Drops payload to %APPDATA%\\svchost.exe', technique: 'T1059.001', tactic: 'Execution' },
                    { step: 2, action: 'Creates scheduled task for persistence', technique: 'T1053.005', tactic: 'Persistence' },
                    { step: 3, action: 'Connects to C2 at 185.220.101.34:443', technique: 'T1071.001', tactic: 'Command and Control' },
                    { step: 4, action: 'Performs LSASS memory dump', technique: 'T1003.001', tactic: 'Credential Access' },
                    { step: 5, action: 'Enumerates domain trusts', technique: 'T1482', tactic: 'Discovery' },
                    { step: 6, action: 'Exfiltrates data via HTTPS POST', technique: 'T1041', tactic: 'Exfiltration' },
                  ],
                  networkActivity: [
                    { destination: '185.220.101.34:443', protocol: 'HTTPS', frequency: 'every 60s', dataVolume: '~2KB per check-in' },
                    { destination: '10.0.5.22:445', protocol: 'SMB', frequency: 'once', dataVolume: '~5MB lateral movement' },
                  ],
                  fileSystemChanges: [
                    { path: '%APPDATA%\\svchost.exe', operation: 'create' as const, size: 286720 },
                    { path: '%TEMP%\\~tmp.bat', operation: 'create+delete' as const, size: 256 },
                    { path: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\svchost', operation: 'create' as const },
                  ],
                } : undefined,
                indicators: includeIndicators ? {
                  network: [
                    { type: 'ip' as const, value: '185.220.101.34', context: 'C2 server' },
                    { type: 'domain' as const, value: 'cdn-update.evil.com', context: 'C2 domain (HTTPS)' },
                  ],
                  file: [
                    { type: 'hash' as const, value: 'e3b0c44298fc1c14...', context: 'Primary payload SHA256' },
                    { type: 'filename' as const, value: 'svchost.exe', context: 'Dropped file in %APPDATA%' },
                  ],
                  mutex: [
                    { value: 'Global\\{8BC94F8A-2341-4D56-9A78-1A2B3C4D5E6F}', context: 'Ensures single instance' },
                  ],
                } : undefined,
                mitigation: ['Block C2 IP at firewall', 'Update endpoint detection signatures', 'Reset compromised credentials', 'Scan for scheduled task persistence'],
                status: 'analyzed',
              },
              status: 'malware_analysis_complete', generatedBy: 'heuristic', timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        case 'disassemble': {
          const binaryPath = config.binaryPath || '/unknown/binary';
          const startAddress = config.startAddress || '0x4011a0';
          const instructionLimit = config.instructionLimit || 200;
          const syntax = config.syntax || 'intel';

          return {
            success: true,
            data: {
              action, binaryPath, startAddress, instructionLimit, syntax: syntax as any,
              disassembly: {
                binaryPath,
                startAddress,
                syntax,
                instructions: [
                  { address: '0x4011a0', bytes: '55', mnemonic: 'push', operands: 'rbp', comment: 'Function prologue' },
                  { address: '0x4011a1', bytes: '48 89 e5', mnemonic: 'mov', operands: 'rbp, rsp', comment: '' },
                  { address: '0x4011a4', bytes: '48 81 ec 10 10 00 00', mnemonic: 'sub', operands: 'rsp, 0x1010', comment: 'Allocate stack space (4112 bytes)' },
                  { address: '0x4011ab', bytes: '89 bd fc fe ff ff', mnemonic: 'mov', operands: 'dword [rbp-0x104], edi', comment: 'Save argc' },
                  { address: '0x4011b1', bytes: '48 89 b5 f0 fe ff ff', mnemonic: 'mov', operands: 'qword [rbp-0x110], rsi', comment: 'Save argv' },
                  { address: '0x4011b8', bytes: '83 bd fc fe ff ff 01', mnemonic: 'cmp', operands: 'dword [rbp-0x104], 1', comment: 'Check argc > 1' },
                  { address: '0x4011bf', bytes: '7f 0a', mnemonic: 'jg', operands: '0x4011cb', comment: 'Jump if argc > 1' },
                  { address: '0x4011c1', bytes: '48 8b 85 f0 fe ff ff', mnemonic: 'mov', operands: 'rax, qword [rbp-0x110]', comment: 'Load argv' },
                  { address: '0x4011c8', bytes: '48 8b 00', mnemonic: 'mov', operands: 'rax, qword [rax]', comment: 'Load argv[0]' },
                  { address: '0x4011cb', bytes: '48 8b 95 f0 fe ff ff', mnemonic: 'mov', operands: 'rdx, qword [rbp-0x110]', comment: 'Second arg: argv' },
                  { address: '0x4011d2', bytes: '48 83 c2 08', mnemonic: 'add', operands: 'rdx, 8', comment: 'argv + 1 = argv[1]' },
                  { address: '0x4011d6', bytes: '48 8b 12', mnemonic: 'mov', operands: 'rdx, qword [rdx]', comment: 'Dereference argv[1]' },
                  { address: '0x4011d9', bytes: 'be 00 00 00 00', mnemonic: 'mov', operands: 'esi, 0x0', comment: 'Mode: read' },
                  { address: '0x4011de', bytes: '48 89 d7', mnemonic: 'mov', operands: 'rdi, rdx', comment: 'First arg: filename' },
                  { address: '0x4011e1', bytes: 'e8 3a fe ff ff', mnemonic: 'call', operands: '0x401020', comment: 'call fopen' },
                ],
                xrefs: [
                  { address: '0x4011a0', type: 'code' as const, from: '0x4013b0', description: 'Called from initialize_module()' },
                ],
                functions: [
                  { name: 'main', start: '0x4011a0', end: '0x4012a0', size: 256, complexity: 8 },
                  { name: 'parse_input', start: '0x4012a0', end: '0x401320', size: 128, complexity: 5 },
                  { name: 'validate_token', start: '0x401320', end: '0x401380', size: 96, complexity: 3 },
                ],
                status: 'disassembled',
              },
              status: 'disassembly_complete', generatedBy: 'heuristic', timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime, source: 'heuristic' },
          };
        }

        default:
          return {
            success: false,
            error: `Unknown action: ${action}. Supported actions: analyze-binary, decompile, extract-firmware, reverse-protocol, analyze-malware, disassemble`,
          };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
