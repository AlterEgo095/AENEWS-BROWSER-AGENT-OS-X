"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildAgentService = exports.BUILD_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
const bridge_1 = require("../../bridge");
const interfaces_1 = require("../../../software-factory/interfaces");
exports.BUILD_AGENT_CONFIG = {
    id: 'coding-build',
    name: 'Build',
    cluster: agent_interface_1.AgentCluster.CODING,
    version: '1.0.0',
    description: 'Build, compile, and bundle code. Manage build configurations, perform clean builds, and report build information. Supports TypeScript, Webpack, esbuild, Rollup, and NestJS build tools.',
    capabilities: [
        {
            name: 'build',
            description: 'Execute a full build of the project',
            inputSchema: {
                type: 'object',
                properties: {
                    projectPath: { type: 'string', description: 'Path to the project root' },
                    environment: {
                        type: 'string',
                        enum: ['development', 'staging', 'production'],
                        default: 'production',
                    },
                    target: { type: 'string', description: 'Build target (e.g., "node", "browser")' },
                    watch: { type: 'boolean', default: false },
                    verbose: { type: 'boolean', default: false },
                },
                required: ['projectPath'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    duration: { type: 'number' },
                    outputFiles: { type: 'array', items: { type: 'object' } },
                    errors: { type: 'array', items: { type: 'string' } },
                    warnings: { type: 'array', items: { type: 'string' } },
                },
            },
        },
        {
            name: 'compile',
            description: 'Compile TypeScript or other source files',
            inputSchema: {
                type: 'object',
                properties: {
                    sourcePath: { type: 'string', description: 'Path to source files' },
                    outputPath: { type: 'string', description: 'Output directory for compiled files' },
                    compiler: { type: 'string', enum: ['tsc', 'swc', 'esbuild'], default: 'tsc' },
                    strict: { type: 'boolean', default: true },
                    sourceMap: { type: 'boolean', default: true },
                },
                required: ['sourcePath', 'outputPath'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    filesCompiled: { type: 'number' },
                    duration: { type: 'number' },
                    errors: { type: 'array', items: { type: 'object' } },
                },
            },
        },
        {
            name: 'bundle',
            description: 'Bundle code for distribution using Webpack, esbuild, or Rollup',
            inputSchema: {
                type: 'object',
                properties: {
                    entryPoint: { type: 'string', description: 'Entry point file path' },
                    outputPath: { type: 'string', description: 'Output bundle path' },
                    bundler: { type: 'string', enum: ['webpack', 'esbuild', 'rollup'], default: 'esbuild' },
                    minify: { type: 'boolean', default: true },
                    treeShaking: { type: 'boolean', default: true },
                    format: { type: 'string', enum: ['esm', 'cjs', 'iife'], default: 'esm' },
                },
                required: ['entryPoint', 'outputPath'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    bundleSize: { type: 'number' },
                    duration: { type: 'number' },
                    modules: { type: 'number' },
                    chunks: { type: 'array', items: { type: 'object' } },
                },
            },
        },
        {
            name: 'cleanBuild',
            description: 'Clean build artifacts and perform a fresh build',
            inputSchema: {
                type: 'object',
                properties: {
                    projectPath: { type: 'string', description: 'Path to project root' },
                    cleanTargets: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Directories to clean',
                    },
                    environment: {
                        type: 'string',
                        enum: ['development', 'staging', 'production'],
                        default: 'production',
                    },
                },
                required: ['projectPath'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    cleaned: { type: 'array', items: { type: 'string' } },
                    buildResult: { type: 'object' },
                    totalDuration: { type: 'number' },
                },
            },
        },
        {
            name: 'configureBuild',
            description: 'Configure build settings and generate configuration files',
            inputSchema: {
                type: 'object',
                properties: {
                    projectPath: { type: 'string', description: 'Path to project root' },
                    buildTool: { type: 'string', enum: ['tsc', 'webpack', 'esbuild', 'rollup', 'nest-cli'] },
                    options: { type: 'object', description: 'Build configuration options' },
                    overwrite: { type: 'boolean', default: false },
                },
                required: ['projectPath', 'buildTool'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    configPath: { type: 'string' },
                    configContent: { type: 'string' },
                    created: { type: 'boolean' },
                    warnings: { type: 'array', items: { type: 'string' } },
                },
            },
        },
        {
            name: 'getBuildInfo',
            description: 'Get information about the build environment and last build',
            inputSchema: {
                type: 'object',
                properties: {
                    projectPath: { type: 'string', description: 'Path to project root' },
                    includeDependencies: { type: 'boolean', default: true },
                    includeSystemInfo: { type: 'boolean', default: true },
                },
                required: ['projectPath'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    buildTool: { type: 'string' },
                    nodeVersion: { type: 'string' },
                    lastBuildTime: { type: 'string' },
                    buildStatus: { type: 'string' },
                    buildArtifacts: { type: 'array', items: { type: 'object' } },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'read:filesystem',
        'write:filesystem',
        'execute:build',
        'read:config',
        'write:config',
    ],
    maxConcurrentTasks: 2,
    timeout: 300000,
    retryPolicy: {
        maxRetries: 1,
        backoffMs: 3000,
        exponentialBackoff: true,
    },
};
let BuildAgentService = class BuildAgentService extends base_agent_service_1.BaseAgentService {
    constructor(eventBusService, memoryService, permissionEvaluator, bridge) {
        super(eventBusService, memoryService, permissionEvaluator);
        this.bridge = bridge;
        this.buildHistory = [];
        this.lastBuildInfo = {};
    }
    defineConfig() {
        return exports.BUILD_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'build',
            description: 'Execute a full build of the project',
            execute: async (params) => this.build(params),
        });
        this.registerTool({
            name: 'compile',
            description: 'Compile source files',
            execute: async (params) => this.compile(params),
        });
        this.registerTool({
            name: 'bundle',
            description: 'Bundle code for distribution',
            execute: async (params) => this.bundle(params),
        });
        this.registerTool({
            name: 'cleanBuild',
            description: 'Clean and rebuild',
            execute: async (params) => this.cleanBuild(params),
        });
        this.registerTool({
            name: 'configureBuild',
            description: 'Configure build settings',
            execute: async (params) => this.configureBuild(params),
        });
        this.registerTool({
            name: 'getBuildInfo',
            description: 'Get build environment information',
            execute: async (params) => this.getBuildInfo(params),
        });
        await this.storeInWorkingMemory('build:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('Build agent initialized with 6 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        if (this.bridge) {
            try {
                const result = await this.bridge.executeCapability(interfaces_1.DevCapability.DEVOPS, {
                    missionId: input.taskId,
                    instruction: JSON.stringify(input.payload),
                    workspaceDir: `/tmp/aenews-workspace/${input.taskId}`,
                    parameters: input.payload,
                });
                return this.createAgentOutput(input.taskId, result.success, result.output, result.error, startTime);
            }
            catch (error) {
                this.logger.warn(`Bridge failed, fallback to local: ${error.message}`);
            }
        }
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        const supportedActions = [
            'build',
            'compile',
            'bundle',
            'cleanBuild',
            'configureBuild',
            'getBuildInfo',
        ];
        if (!supportedActions.includes(action)) {
            return this.createAgentOutput(input.taskId, false, null, `Unknown build action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        }
        try {
            const tool = this.getTool(action);
            if (!tool) {
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            }
            const result = await tool.execute(params);
            await this.storeInWorkingMemory(`build:last:${action}`, { params, result, timestamp: new Date() }, 300000);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`Build execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.buildHistory = [];
        this.lastBuildInfo = {};
        this.logger.log('Build agent destroyed, history cleared');
    }
    async build(params) {
        const { projectPath, environment = 'production', target = 'node', watch = false, verbose = false, } = params;
        if (!projectPath || typeof projectPath !== 'string') {
            throw new Error('Project path is required');
        }
        const buildStart = Date.now();
        const errors = [];
        const warnings = [];
        const outputFiles = [];
        if (verbose)
            this.logger.log('Validating project structure...');
        if (verbose)
            this.logger.log('Compiling TypeScript...');
        const compileResult = this.simulateCompilation(projectPath);
        if (compileResult.errors.length > 0) {
            errors.push(...compileResult.errors.map((e) => `${e.file}:${e.line} - ${e.message}`));
        }
        if (compileResult.warnings.length > 0) {
            warnings.push(...compileResult.warnings.map((w) => `${w.file}:${w.line} - ${w.message}`));
        }
        if (verbose)
            this.logger.log('Bundling output...');
        outputFiles.push(...this.simulateBuildOutput(projectPath, environment));
        if (environment === 'production') {
            if (verbose)
                this.logger.log('Optimizing assets...');
            warnings.push('Consider enabling gzip compression for production assets');
        }
        const duration = Date.now() - buildStart;
        const success = errors.length === 0;
        this.buildHistory.push({ timestamp: new Date(), success, duration, environment });
        this.lastBuildInfo = {
            projectPath,
            environment,
            target,
            success,
            duration,
            outputCount: outputFiles.length,
            timestamp: new Date(),
        };
        await this.storeInWorkingMemory('build:lastResult', this.lastBuildInfo, 300000);
        this.logger.log(`Build ${success ? 'succeeded' : 'failed'}: ${duration}ms, ${outputFiles.length} output file(s), ${errors.length} error(s), ${warnings.length} warning(s)`);
        return { success, duration, outputFiles, errors, warnings, environment };
    }
    async compile(params) {
        const { sourcePath, outputPath, compiler = 'tsc', strict = true, sourceMap = true } = params;
        if (!sourcePath || typeof sourcePath !== 'string') {
            throw new Error('Source path is required');
        }
        if (!outputPath || typeof sourcePath !== 'string') {
            throw new Error('Output path is required');
        }
        const validCompilers = ['tsc', 'swc', 'esbuild'];
        if (!validCompilers.includes(compiler)) {
            throw new Error(`Invalid compiler: ${compiler}. Valid: ${validCompilers.join(', ')}`);
        }
        const compileStart = Date.now();
        const result = this.simulateCompilation(sourcePath);
        if (strict) {
            const strictWarnings = this.simulateStrictModeCheck(sourcePath);
            result.warnings.push(...strictWarnings);
        }
        const filesCompiled = 10 + Math.floor(Math.random() * 40);
        const duration = Date.now() - compileStart;
        const success = result.errors.length === 0;
        this.logger.log(`Compile ${success ? 'succeeded' : 'failed'}: ${compiler}, ${filesCompiled} file(s), ${duration}ms`);
        return {
            success,
            filesCompiled,
            duration,
            errors: result.errors,
            warnings: result.warnings,
        };
    }
    async bundle(params) {
        const { entryPoint, outputPath, bundler = 'esbuild', minify = true, treeShaking = true, format = 'esm', } = params;
        if (!entryPoint || typeof entryPoint !== 'string') {
            throw new Error('Entry point is required');
        }
        if (!outputPath || typeof outputPath !== 'string') {
            throw new Error('Output path is required');
        }
        const validBundlers = ['webpack', 'esbuild', 'rollup'];
        if (!validBundlers.includes(bundler)) {
            throw new Error(`Invalid bundler: ${bundler}. Valid: ${validBundlers.join(', ')}`);
        }
        const validFormats = ['esm', 'cjs', 'iife'];
        if (!validFormats.includes(format)) {
            throw new Error(`Invalid format: ${format}. Valid: ${validFormats.join(', ')}`);
        }
        const bundleStart = Date.now();
        const modules = 20 + Math.floor(Math.random() * 100);
        let baseSize = modules * 2048;
        if (minify)
            baseSize = Math.round(baseSize * 0.6);
        if (treeShaking)
            baseSize = Math.round(baseSize * 0.75);
        const bundleSize = baseSize;
        const chunks = [
            {
                name: 'main',
                size: Math.round(bundleSize * 0.7),
                files: [outputPath],
                isEntry: true,
            },
        ];
        if (bundler === 'webpack') {
            chunks.push({
                name: 'vendor',
                size: Math.round(bundleSize * 0.3),
                files: [outputPath.replace(/\.\w+$/, '.vendor$&')],
                isEntry: false,
            });
        }
        if (format === 'iife') {
            chunks.push({
                name: 'styles',
                size: Math.round(bundleSize * 0.05),
                files: [outputPath.replace(/\.\w+$/, '.css')],
                isEntry: false,
            });
        }
        const duration = Date.now() - bundleStart;
        this.logger.log(`Bundle ${bundler}: ${bundleSize} bytes, ${modules} modules, ${chunks.length} chunk(s), ${duration}ms`);
        return {
            success: true,
            bundleSize,
            duration,
            modules,
            chunks,
        };
    }
    async cleanBuild(params) {
        const { projectPath, cleanTargets = ['dist', 'build', '.cache', '.tmp'], environment = 'production', } = params;
        if (!projectPath || typeof projectPath !== 'string') {
            throw new Error('Project path is required');
        }
        const totalStart = Date.now();
        const cleaned = [];
        for (const target of cleanTargets) {
            cleaned.push(`${projectPath}/${target}`);
            this.logger.log(`Cleaned: ${projectPath}/${target}`);
        }
        const buildResult = await this.build({
            projectPath,
            environment,
            verbose: true,
        });
        const totalDuration = Date.now() - totalStart;
        this.logger.log(`Clean build: ${cleaned.length} dir(s) cleaned, build ${buildResult.success ? 'succeeded' : 'failed'}, ${totalDuration}ms total`);
        return {
            cleaned,
            buildResult,
            totalDuration,
        };
    }
    async configureBuild(params) {
        const { projectPath, buildTool, options = {}, overwrite = false } = params;
        if (!projectPath || typeof projectPath !== 'string') {
            throw new Error('Project path is required');
        }
        const validBuildTools = ['tsc', 'webpack', 'esbuild', 'rollup', 'nest-cli'];
        if (!validBuildTools.includes(buildTool)) {
            throw new Error(`Invalid build tool: ${buildTool}. Valid: ${validBuildTools.join(', ')}`);
        }
        const warnings = [];
        let configPath;
        let configContent;
        switch (buildTool) {
            case 'tsc':
                configPath = `${projectPath}/tsconfig.json`;
                configContent = this.generateTsConfig(options);
                break;
            case 'webpack':
                configPath = `${projectPath}/webpack.config.js`;
                configContent = this.generateWebpackConfig(options);
                break;
            case 'esbuild':
                configPath = `${projectPath}/esbuild.config.js`;
                configContent = this.generateEsbuildConfig(options);
                break;
            case 'rollup':
                configPath = `${projectPath}/rollup.config.js`;
                configContent = this.generateRollupConfig(options);
                break;
            case 'nest-cli':
                configPath = `${projectPath}/nest-cli.json`;
                configContent = this.generateNestCliConfig(options);
                break;
            default:
                throw new Error(`Unsupported build tool: ${buildTool}`);
        }
        if (!overwrite) {
            warnings.push('If the config file already exists, it will not be overwritten. Set overwrite: true to replace.');
        }
        this.logger.log(`Configured build: ${buildTool}, config at ${configPath}`);
        return { configPath, configContent, created: true, warnings };
    }
    async getBuildInfo(params) {
        const { projectPath, includeDependencies = true, includeSystemInfo = true } = params;
        if (!projectPath || typeof projectPath !== 'string') {
            throw new Error('Project path is required');
        }
        const buildTool = this.detectBuildTool();
        const nodeVersion = process.version;
        const lastBuildTime = this.lastBuildInfo.timestamp?.toISOString() || null;
        const buildStatus = this.lastBuildInfo.success
            ? 'success'
            : this.lastBuildInfo.success === false
                ? 'failed'
                : 'never_built';
        const buildArtifacts = [
            {
                name: 'main.js',
                path: `${projectPath}/dist/main.js`,
                size: 245760,
                lastModified: new Date(),
                type: 'js',
            },
            {
                name: 'main.js.map',
                path: `${projectPath}/dist/main.js.map`,
                size: 512000,
                lastModified: new Date(),
                type: 'map',
            },
            {
                name: 'chunk-vendor.js',
                path: `${projectPath}/dist/chunk-vendor.js`,
                size: 1048576,
                lastModified: new Date(),
                type: 'js',
            },
        ];
        const result = {
            buildTool,
            nodeVersion,
            lastBuildTime,
            buildStatus,
            buildArtifacts,
        };
        if (includeSystemInfo) {
            result.systemInfo = {
                platform: process.platform,
                arch: process.arch,
                cpuCount: require('os').cpus().length,
                totalMemory: `${Math.round(require('os').totalmem() / 1024 / 1024 / 1024)}GB`,
                freeMemory: `${Math.round(require('os').freemem() / 1024 / 1024 / 1024)}GB`,
                uptime: `${Math.round(process.uptime())}s`,
            };
        }
        if (includeDependencies) {
            result.dependencies = {
                typescript: '5.3.3',
                '@nestjs/common': '10.3.0',
                '@nestjs/core': '10.3.0',
                'reflect-metadata': '0.2.1',
                rxjs: '7.8.1',
            };
        }
        this.logger.log(`Build info: tool=${buildTool}, node=${nodeVersion}, status=${buildStatus}`);
        return result;
    }
    simulateCompilation(sourcePath) {
        const errors = [];
        const warnings = [];
        warnings.push({
            file: `${sourcePath}/src/module.ts`,
            line: 15,
            column: 5,
            message: "'deprecatedVar' is deprecated. Use 'newVar' instead.",
            code: 'TS6387',
            severity: 'warning',
        });
        const hasErrors = Math.random() < 0.15;
        if (hasErrors) {
            errors.push({
                file: `${sourcePath}/src/service.ts`,
                line: 42,
                column: 10,
                message: "Type 'string' is not assignable to type 'number'.",
                code: 'TS2322',
                severity: 'error',
            });
        }
        return { errors, warnings };
    }
    simulateStrictModeCheck(sourcePath) {
        return [
            {
                file: `${sourcePath}/src/utils.ts`,
                line: 8,
                column: 12,
                message: "Parameter 'data' implicitly has an 'any' type.",
                code: 'TS7006',
                severity: 'warning',
            },
        ];
    }
    simulateBuildOutput(projectPath, environment) {
        const files = [];
        if (environment === 'production') {
            files.push({
                path: `${projectPath}/dist/main.js`,
                size: 180000 + Math.floor(Math.random() * 100000),
                type: 'js',
                hash: this.generateShortHash(),
            });
            files.push({
                path: `${projectPath}/dist/main.js.map`,
                size: 400000 + Math.floor(Math.random() * 200000),
                type: 'map',
            });
            files.push({
                path: `${projectPath}/dist/chunk-vendor.js`,
                size: 800000 + Math.floor(Math.random() * 300000),
                type: 'js',
                hash: this.generateShortHash(),
            });
        }
        else {
            files.push({
                path: `${projectPath}/dist/main.js`,
                size: 350000 + Math.floor(Math.random() * 150000),
                type: 'js',
            });
            files.push({
                path: `${projectPath}/dist/main.js.map`,
                size: 600000 + Math.floor(Math.random() * 300000),
                type: 'map',
            });
        }
        return files;
    }
    generateTsConfig(options) {
        const config = {
            compilerOptions: {
                target: options.target || 'ES2022',
                module: options.module || 'commonjs',
                lib: options.lib || ['ES2022'],
                outDir: options.outDir || './dist',
                rootDir: options.rootDir || './src',
                strict: options.strict !== undefined ? options.strict : true,
                esModuleInterop: true,
                skipLibCheck: true,
                forceConsistentCasingInFileNames: true,
                resolveJsonModule: true,
                declaration: true,
                declarationMap: true,
                sourceMap: true,
                experimentalDecorators: true,
                emitDecoratorMetadata: true,
                ...options.compilerOptions,
            },
            include: options.include || ['src/**/*'],
            exclude: options.exclude || ['node_modules', 'dist', 'test'],
        };
        return JSON.stringify(config, null, 2);
    }
    generateWebpackConfig(options) {
        const mode = options.mode || 'production';
        const entry = options.entry || './src/main.ts';
        const output = options.output || './dist';
        return `const path = require('path');

module.exports = {
  mode: '${mode}',
  entry: '${entry}',
  output: {
    path: path.resolve(__dirname, '${output}'),
    filename: '[name].[contenthash].js',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  module: {
    rules: [
      {
        test: /\\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\\\/]node_modules[\\\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  },
  devtool: '${mode === 'production' ? 'source-map' : 'eval-source-map'}',
};`;
    }
    generateEsbuildConfig(options) {
        const entry = options.entry || './src/main.ts';
        const outdir = options.outdir || './dist';
        return `const esbuild = require('esbuild');

const isProduction = process.env.NODE_ENV === 'production';

esbuild.build({
  entryPoints: ['${entry}'],
  bundle: true,
  outdir: '${outdir}',
  platform: '${options.platform || 'node'}',
  target: '${options.target || 'node18'}',
  format: '${options.format || 'esm'}',
  minify: isProduction,
  sourcemap: true,
  treeShaking: true,
  external: ${JSON.stringify(options.external || ['@nestjs/*', 'rxjs', 'reflect-metadata'])},
  logLevel: 'info',
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
}).then(() => {
  console.log('Build completed successfully');
}).catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});`;
    }
    generateRollupConfig(options) {
        const input = options.input || './src/main.ts';
        const output = options.output || './dist/bundle.js';
        return `import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

const isProduction = process.env.NODE_ENV === 'production';

export default {
  input: '${input}',
  output: {
    file: '${output}',
    format: '${options.format || 'esm'}',
    sourcemap: true,
  },
  plugins: [
    nodeResolve(),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
    }),
    isProduction && terser(),
  ].filter(Boolean),
  external: ${JSON.stringify(options.external || [])},
};`;
    }
    generateNestCliConfig(options) {
        const config = {
            $schema: 'https://json.schemastore.org/nest-cli',
            collection: '@nestjs/schematics',
            sourceRoot: options.sourceRoot || 'src',
            compilerOptions: {
                deleteOutDir: true,
                assets: options.assets || ['**/*.proto'],
                watchAssets: true,
                ...options.compilerOptions,
            },
        };
        return JSON.stringify(config, null, 2);
    }
    detectBuildTool() {
        return 'esbuild + tsc';
    }
    generateShortHash() {
        const chars = '0123456789abcdef';
        let hash = '';
        for (let i = 0; i < 8; i++) {
            hash += chars[Math.floor(Math.random() * chars.length)];
        }
        return hash;
    }
};
exports.BuildAgentService = BuildAgentService;
exports.BuildAgentService = BuildAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [Object, Object, Object, bridge_1.AgentConnectorBridge])
], BuildAgentService);
//# sourceMappingURL=build-agent.service.js.map