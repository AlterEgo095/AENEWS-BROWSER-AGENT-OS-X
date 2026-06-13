"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpreadsheetAgentService = exports.SPREADSHEET_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
exports.SPREADSHEET_AGENT_CONFIG = {
    id: 'office-spreadsheet',
    name: 'Spreadsheet',
    cluster: agent_interface_1.AgentCluster.OFFICE,
    version: '1.0.0',
    description: 'Spreadsheet management agent that handles creating spreadsheets, updating cells, applying formulas, creating charts, importing/exporting data, and generating pivot tables.',
    capabilities: [
        {
            name: 'createSpreadsheet',
            description: 'Create a new spreadsheet with optional sheets and initial data',
            inputSchema: {
                type: 'object',
                properties: {
                    title: { type: 'string', description: 'Spreadsheet title' },
                    sheets: { type: 'array', items: { type: 'object' }, description: 'Initial sheet definitions' },
                    author: { type: 'string', description: 'Spreadsheet author' },
                    format: { type: 'string', enum: ['xlsx', 'csv', 'ods'], description: 'Spreadsheet format' },
                },
                required: ['title'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    spreadsheetId: { type: 'string' },
                    title: { type: 'string' },
                    createdAt: { type: 'string' },
                },
            },
        },
        {
            name: 'updateCell',
            description: 'Update one or more cells in a spreadsheet',
            inputSchema: {
                type: 'object',
                properties: {
                    spreadsheetId: { type: 'string', description: 'ID of the spreadsheet' },
                    sheet: { type: 'string', description: 'Sheet name' },
                    cell: { type: 'string', description: 'Cell reference (e.g., A1)' },
                    value: { type: 'string', description: 'New cell value' },
                    formula: { type: 'string', description: 'Cell formula' },
                    format: { type: 'object', description: 'Cell formatting options' },
                    rangeUpdates: { type: 'array', items: { type: 'object' }, description: 'Batch cell updates' },
                },
                required: ['spreadsheetId', 'cell'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    spreadsheetId: { type: 'string' },
                    updatedCells: { type: 'number' },
                    status: { type: 'string' },
                },
            },
        },
        {
            name: 'applyFormula',
            description: 'Apply a formula to a cell or range in a spreadsheet',
            inputSchema: {
                type: 'object',
                properties: {
                    spreadsheetId: { type: 'string', description: 'ID of the spreadsheet' },
                    sheet: { type: 'string', description: 'Sheet name' },
                    cell: { type: 'string', description: 'Target cell for formula result' },
                    formula: { type: 'string', description: 'Formula expression (e.g., SUM(A1:A10))' },
                    range: { type: 'string', description: 'Range to apply the formula across' },
                },
                required: ['spreadsheetId', 'cell', 'formula'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    spreadsheetId: { type: 'string' },
                    cell: { type: 'string' },
                    formula: { type: 'string' },
                    computedValue: { type: 'string' },
                    status: { type: 'string' },
                },
            },
        },
        {
            name: 'createChart',
            description: 'Create a chart from spreadsheet data',
            inputSchema: {
                type: 'object',
                properties: {
                    spreadsheetId: { type: 'string', description: 'ID of the spreadsheet' },
                    sheet: { type: 'string', description: 'Sheet name' },
                    chartType: { type: 'string', enum: ['bar', 'line', 'pie', 'scatter', 'area', 'column'], description: 'Type of chart' },
                    dataRange: { type: 'string', description: 'Data range for chart (e.g., A1:D10)' },
                    title: { type: 'string', description: 'Chart title' },
                    xLabel: { type: 'string', description: 'X-axis label' },
                    yLabel: { type: 'string', description: 'Y-axis label' },
                    legend: { type: 'boolean', description: 'Show legend' },
                },
                required: ['spreadsheetId', 'chartType', 'dataRange'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    chartId: { type: 'string' },
                    chartType: { type: 'string' },
                    status: { type: 'string' },
                },
            },
        },
        {
            name: 'importData',
            description: 'Import data from CSV, JSON, or array format into a spreadsheet',
            inputSchema: {
                type: 'object',
                properties: {
                    spreadsheetId: { type: 'string', description: 'ID of the target spreadsheet' },
                    sheet: { type: 'string', description: 'Target sheet name' },
                    data: { type: 'object', description: 'Data to import (CSV string, JSON array, or 2D array)' },
                    format: { type: 'string', enum: ['csv', 'json', 'array'], description: 'Data format' },
                    startCell: { type: 'string', description: 'Starting cell for import (default: A1)' },
                    hasHeaders: { type: 'boolean', description: 'Whether the data includes header row' },
                },
                required: ['spreadsheetId', 'data', 'format'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    spreadsheetId: { type: 'string' },
                    importedRows: { type: 'number' },
                    importedColumns: { type: 'number' },
                    status: { type: 'string' },
                },
            },
        },
        {
            name: 'exportData',
            description: 'Export spreadsheet data to CSV, JSON, or array format',
            inputSchema: {
                type: 'object',
                properties: {
                    spreadsheetId: { type: 'string', description: 'ID of the spreadsheet' },
                    sheet: { type: 'string', description: 'Sheet to export' },
                    format: { type: 'string', enum: ['csv', 'json', 'array'], description: 'Export format' },
                    range: { type: 'string', description: 'Range to export (e.g., A1:D10)' },
                    includeHeaders: { type: 'boolean', default: true, description: 'Include header row' },
                },
                required: ['spreadsheetId', 'format'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    data: { type: 'string' },
                    format: { type: 'string' },
                    rowCount: { type: 'number' },
                    columnCount: { type: 'number' },
                },
            },
        },
        {
            name: 'pivotTable',
            description: 'Generate a pivot table from spreadsheet data',
            inputSchema: {
                type: 'object',
                properties: {
                    spreadsheetId: { type: 'string', description: 'ID of the source spreadsheet' },
                    sheet: { type: 'string', description: 'Source sheet name' },
                    dataRange: { type: 'string', description: 'Source data range' },
                    rows: { type: 'array', items: { type: 'string' }, description: 'Fields for row grouping' },
                    columns: { type: 'array', items: { type: 'string' }, description: 'Fields for column grouping' },
                    values: { type: 'array', items: { type: 'object' }, description: 'Value fields with aggregation' },
                    filters: { type: 'array', items: { type: 'object' }, description: 'Filter conditions' },
                },
                required: ['spreadsheetId', 'dataRange', 'values'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    pivotTableId: { type: 'string' },
                    rowCount: { type: 'number' },
                    columnCount: { type: 'number' },
                    status: { type: 'string' },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'read:spreadsheet',
        'write:spreadsheet',
        'import:spreadsheet',
        'export:spreadsheet',
    ],
    maxConcurrentTasks: 4,
    timeout: 45000,
    retryPolicy: {
        maxRetries: 2,
        backoffMs: 1500,
        exponentialBackoff: true,
    },
};
let SpreadsheetAgentService = class SpreadsheetAgentService extends base_agent_service_1.BaseAgentService {
    constructor() {
        super(...arguments);
        this.spreadsheets = new Map();
        this.spreadsheetCounter = 0;
        this.chartCounter = 0;
        this.pivotCounter = 0;
    }
    defineConfig() {
        return exports.SPREADSHEET_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'createSpreadsheet',
            description: 'Create a new spreadsheet with optional sheets and initial data',
            execute: async (params) => this.createSpreadsheet(params),
        });
        this.registerTool({
            name: 'updateCell',
            description: 'Update one or more cells in a spreadsheet',
            execute: async (params) => this.updateCell(params),
        });
        this.registerTool({
            name: 'applyFormula',
            description: 'Apply a formula to a cell or range',
            execute: async (params) => this.applyFormula(params),
        });
        this.registerTool({
            name: 'createChart',
            description: 'Create a chart from spreadsheet data',
            execute: async (params) => this.createChart(params),
        });
        this.registerTool({
            name: 'importData',
            description: 'Import data into a spreadsheet',
            execute: async (params) => this.importData(params),
        });
        this.registerTool({
            name: 'exportData',
            description: 'Export spreadsheet data',
            execute: async (params) => this.exportData(params),
        });
        this.registerTool({
            name: 'pivotTable',
            description: 'Generate a pivot table from spreadsheet data',
            execute: async (params) => this.pivotTable(params),
        });
        await this.storeInWorkingMemory('spreadsheet:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('Spreadsheet agent initialized with 7 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        const supportedActions = [
            'createSpreadsheet',
            'updateCell',
            'applyFormula',
            'createChart',
            'importData',
            'exportData',
            'pivotTable',
        ];
        if (!supportedActions.includes(action)) {
            return this.createAgentOutput(input.taskId, false, null, `Unknown spreadsheet action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        }
        try {
            const tool = this.getTool(action);
            if (!tool) {
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            }
            const result = await tool.execute(params);
            await this.storeInWorkingMemory(`spreadsheet:last:${action}`, { params, result, timestamp: new Date() }, 300000);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`Spreadsheet execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.spreadsheets.clear();
        this.spreadsheetCounter = 0;
        this.chartCounter = 0;
        this.pivotCounter = 0;
        this.logger.log('Spreadsheet agent destroyed, all data cleared');
    }
    async createSpreadsheet(params) {
        const { title, sheets = [], author = 'agent@aenews.system', format = 'xlsx' } = params;
        if (!title || typeof title !== 'string') {
            throw new Error('A valid spreadsheet title is required');
        }
        const validFormats = ['xlsx', 'csv', 'ods'];
        if (!validFormats.includes(format)) {
            throw new Error(`Invalid format: ${format}. Supported: ${validFormats.join(', ')}`);
        }
        const spreadsheetId = this.generateSpreadsheetId();
        const sheetsMap = new Map();
        const defaultSheet = {
            name: 'Sheet1',
            cells: new Map(),
            rowCount: 1000,
            columnCount: 26,
        };
        sheetsMap.set('Sheet1', defaultSheet);
        for (const sheetDef of sheets) {
            const sheet = {
                name: sheetDef.name,
                cells: new Map(),
                rowCount: 1000,
                columnCount: 26,
            };
            if (sheetDef.data) {
                for (let row = 0; row < sheetDef.data.length; row++) {
                    for (let col = 0; col < sheetDef.data[row].length; col++) {
                        const cellRef = this.columnToLetter(col + 1) + (row + 1);
                        sheet.cells.set(cellRef, {
                            value: sheetDef.data[row][col],
                        });
                    }
                }
            }
            sheetsMap.set(sheetDef.name, sheet);
        }
        const spreadsheet = {
            id: spreadsheetId,
            title,
            author,
            format,
            sheets: sheetsMap,
            charts: [],
            pivotTables: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.spreadsheets.set(spreadsheetId, spreadsheet);
        this.logger.log(`Created spreadsheet: ${spreadsheetId}, title="${title}", sheets=${sheetsMap.size}`);
        return {
            spreadsheetId,
            title,
            createdAt: spreadsheet.createdAt.toISOString(),
        };
    }
    async updateCell(params) {
        const { spreadsheetId, sheet = 'Sheet1', cell, value, formula, format, rangeUpdates } = params;
        if (!spreadsheetId || typeof spreadsheetId !== 'string') {
            throw new Error('A valid spreadsheetId is required');
        }
        const spreadsheet = this.spreadsheets.get(spreadsheetId);
        if (!spreadsheet) {
            throw new Error(`Spreadsheet not found: ${spreadsheetId}`);
        }
        const targetSheet = spreadsheet.sheets.get(sheet);
        if (!targetSheet) {
            throw new Error(`Sheet not found: ${sheet}`);
        }
        let updatedCells = 0;
        if (cell && (value !== undefined || formula !== undefined || format !== undefined)) {
            this.validateCellReference(cell);
            const existingCell = targetSheet.cells.get(cell) || { value: null };
            targetSheet.cells.set(cell, {
                ...existingCell,
                ...(value !== undefined ? { value } : {}),
                ...(formula !== undefined ? { formula } : {}),
                ...(format !== undefined ? { format } : {}),
            });
            if (formula) {
                const computed = this.evaluateFormula(formula, targetSheet);
                targetSheet.cells.get(cell).computedValue = computed;
            }
            updatedCells++;
        }
        if (rangeUpdates && Array.isArray(rangeUpdates)) {
            for (const update of rangeUpdates) {
                this.validateCellReference(update.cell);
                const existingCell = targetSheet.cells.get(update.cell) || { value: null };
                targetSheet.cells.set(update.cell, {
                    ...existingCell,
                    ...(update.value !== undefined ? { value: update.value } : {}),
                    ...(update.formula !== undefined ? { formula: update.formula } : {}),
                });
                if (update.formula) {
                    const computed = this.evaluateFormula(update.formula, targetSheet);
                    targetSheet.cells.get(update.cell).computedValue = computed;
                }
                updatedCells++;
            }
        }
        spreadsheet.updatedAt = new Date();
        this.logger.log(`Updated cells in spreadsheet: ${spreadsheetId}, sheet=${sheet}, count=${updatedCells}`);
        return {
            spreadsheetId,
            updatedCells,
            status: 'updated',
        };
    }
    async applyFormula(params) {
        const { spreadsheetId, sheet = 'Sheet1', cell, formula, range } = params;
        if (!spreadsheetId || typeof spreadsheetId !== 'string') {
            throw new Error('A valid spreadsheetId is required');
        }
        if (!formula || typeof formula !== 'string') {
            throw new Error('A valid formula is required');
        }
        this.validateCellReference(cell);
        const spreadsheet = this.spreadsheets.get(spreadsheetId);
        if (!spreadsheet) {
            throw new Error(`Spreadsheet not found: ${spreadsheetId}`);
        }
        const targetSheet = spreadsheet.sheets.get(sheet);
        if (!targetSheet) {
            throw new Error(`Sheet not found: ${sheet}`);
        }
        const existingCell = targetSheet.cells.get(cell) || { value: null };
        const computedValue = this.evaluateFormula(formula, targetSheet);
        targetSheet.cells.set(cell, {
            ...existingCell,
            formula,
            computedValue,
        });
        if (range) {
            const { startCell, endCell } = this.parseRange(range);
            const start = this.parseCellReference(startCell);
            const end = this.parseCellReference(endCell);
            for (let row = start.row; row <= end.row; row++) {
                for (let col = start.col; col <= end.col; col++) {
                    const cellRef = this.columnToLetter(col) + row;
                    if (cellRef !== cell) {
                        const adjustedFormula = this.adjustFormulaForCell(formula, cellRef);
                        const cellExisting = targetSheet.cells.get(cellRef) || { value: null };
                        const cellComputed = this.evaluateFormula(adjustedFormula, targetSheet);
                        targetSheet.cells.set(cellRef, {
                            ...cellExisting,
                            formula: adjustedFormula,
                            computedValue: cellComputed,
                        });
                    }
                }
            }
        }
        spreadsheet.updatedAt = new Date();
        this.logger.log(`Applied formula to ${cell}: ${formula}, computed=${computedValue}`);
        return {
            spreadsheetId,
            cell,
            formula,
            computedValue,
            status: 'applied',
        };
    }
    async createChart(params) {
        const { spreadsheetId, sheet = 'Sheet1', chartType, dataRange, title = 'Chart', xLabel, yLabel, legend = true, } = params;
        if (!spreadsheetId || typeof spreadsheetId !== 'string') {
            throw new Error('A valid spreadsheetId is required');
        }
        const validChartTypes = ['bar', 'line', 'pie', 'scatter', 'area', 'column'];
        if (!validChartTypes.includes(chartType)) {
            throw new Error(`Invalid chart type: ${chartType}. Supported: ${validChartTypes.join(', ')}`);
        }
        const spreadsheet = this.spreadsheets.get(spreadsheetId);
        if (!spreadsheet) {
            throw new Error(`Spreadsheet not found: ${spreadsheetId}`);
        }
        if (!spreadsheet.sheets.has(sheet)) {
            throw new Error(`Sheet not found: ${sheet}`);
        }
        const chartId = `chart-${++this.chartCounter}`;
        const chart = {
            id: chartId,
            type: chartType,
            title,
            dataRange,
            sheet,
            xLabel,
            yLabel,
            legend,
            createdAt: new Date(),
        };
        spreadsheet.charts.push(chart);
        spreadsheet.updatedAt = new Date();
        this.logger.log(`Created chart: ${chartId}, type=${chartType}, range=${dataRange}`);
        return {
            chartId,
            chartType,
            status: 'created',
        };
    }
    async importData(params) {
        const { spreadsheetId, sheet = 'Sheet1', data, format, startCell = 'A1', hasHeaders = true, } = params;
        if (!spreadsheetId || typeof spreadsheetId !== 'string') {
            throw new Error('A valid spreadsheetId is required');
        }
        if (!data) {
            throw new Error('Data is required for import');
        }
        const validFormats = ['csv', 'json', 'array'];
        if (!validFormats.includes(format)) {
            throw new Error(`Invalid import format: ${format}. Supported: ${validFormats.join(', ')}`);
        }
        const spreadsheet = this.spreadsheets.get(spreadsheetId);
        if (!spreadsheet) {
            throw new Error(`Spreadsheet not found: ${spreadsheetId}`);
        }
        const targetSheet = spreadsheet.sheets.get(sheet);
        if (!targetSheet) {
            throw new Error(`Sheet not found: ${sheet}`);
        }
        let rows;
        switch (format) {
            case 'csv':
                rows = this.parseCsv(data);
                break;
            case 'json':
                rows = this.parseJsonData(data);
                break;
            case 'array':
                rows = Array.isArray(data) ? data.map((row) => row.map(String)) : [];
                break;
            default:
                rows = [];
        }
        const startPos = this.parseCellReference(startCell);
        let importedRows = 0;
        let importedColumns = 0;
        for (let r = 0; r < rows.length; r++) {
            for (let c = 0; c < rows[r].length; c++) {
                const cellRef = this.columnToLetter(startPos.col + c) + (startPos.row + r);
                targetSheet.cells.set(cellRef, { value: rows[r][c] });
            }
            importedRows++;
            importedColumns = Math.max(importedColumns, rows[r].length);
        }
        spreadsheet.updatedAt = new Date();
        this.logger.log(`Imported data into spreadsheet: ${spreadsheetId}, rows=${importedRows}, cols=${importedColumns}`);
        return {
            spreadsheetId,
            importedRows,
            importedColumns,
            status: 'imported',
        };
    }
    async exportData(params) {
        const { spreadsheetId, sheet = 'Sheet1', format, range, includeHeaders = true } = params;
        if (!spreadsheetId || typeof spreadsheetId !== 'string') {
            throw new Error('A valid spreadsheetId is required');
        }
        const validFormats = ['csv', 'json', 'array'];
        if (!validFormats.includes(format)) {
            throw new Error(`Invalid export format: ${format}. Supported: ${validFormats.join(', ')}`);
        }
        const spreadsheet = this.spreadsheets.get(spreadsheetId);
        if (!spreadsheet) {
            throw new Error(`Spreadsheet not found: ${spreadsheetId}`);
        }
        const targetSheet = spreadsheet.sheets.get(sheet);
        if (!targetSheet) {
            throw new Error(`Sheet not found: ${sheet}`);
        }
        let cells;
        if (range) {
            const { startCell, endCell } = this.parseRange(range);
            const start = this.parseCellReference(startCell);
            const end = this.parseCellReference(endCell);
            cells = [];
            for (let row = start.row; row <= end.row; row++) {
                for (let col = start.col; col <= end.col; col++) {
                    const ref = this.columnToLetter(col) + row;
                    const cellData = targetSheet.cells.get(ref);
                    cells.push({ ref, value: cellData?.computedValue ?? cellData?.value ?? '' });
                }
            }
        }
        else {
            cells = Array.from(targetSheet.cells.entries()).map(([ref, data]) => ({
                ref,
                value: data.computedValue ?? data.value ?? '',
            }));
        }
        let exportData;
        let rowCount = 0;
        let columnCount = 0;
        switch (format) {
            case 'csv':
                exportData = this.convertToCsv(cells, range);
                break;
            case 'json':
                exportData = this.convertToJson(cells, range, includeHeaders);
                break;
            case 'array':
                exportData = JSON.stringify(this.convertTo2DArray(cells, range));
                break;
            default:
                exportData = '';
        }
        const maxRow = cells.reduce((max, c) => {
            const ref = this.parseCellReference(c.ref);
            return Math.max(max, ref.row);
        }, 0);
        const maxCol = cells.reduce((max, c) => {
            const ref = this.parseCellReference(c.ref);
            return Math.max(max, ref.col);
        }, 0);
        rowCount = maxRow;
        columnCount = maxCol;
        this.logger.log(`Exported data from spreadsheet: ${spreadsheetId}, format=${format}, rows=${rowCount}`);
        return {
            data: exportData,
            format,
            rowCount,
            columnCount,
        };
    }
    async pivotTable(params) {
        const { spreadsheetId, sheet = 'Sheet1', dataRange, rows = [], columns = [], values, filters = [], } = params;
        if (!spreadsheetId || typeof spreadsheetId !== 'string') {
            throw new Error('A valid spreadsheetId is required');
        }
        if (!values || !Array.isArray(values) || values.length === 0) {
            throw new Error('At least one value field with aggregation is required');
        }
        const spreadsheet = this.spreadsheets.get(spreadsheetId);
        if (!spreadsheet) {
            throw new Error(`Spreadsheet not found: ${spreadsheetId}`);
        }
        const targetSheet = spreadsheet.sheets.get(sheet);
        if (!targetSheet) {
            throw new Error(`Sheet not found: ${sheet}`);
        }
        const { startCell, endCell } = this.parseRange(dataRange);
        const start = this.parseCellReference(startCell);
        const end = this.parseCellReference(endCell);
        const headers = [];
        for (let col = start.col; col <= end.col; col++) {
            const cellRef = this.columnToLetter(col) + start.row;
            const cellData = targetSheet.cells.get(cellRef);
            headers.push(String(cellData?.value ?? `Col${col}`));
        }
        const dataRows = [];
        for (let row = start.row + 1; row <= end.row; row++) {
            const rowMap = new Map();
            for (let col = start.col; col <= end.col; col++) {
                const cellRef = this.columnToLetter(col) + row;
                const cellData = targetSheet.cells.get(cellRef);
                const header = headers[col - start.col];
                rowMap.set(header, cellData?.computedValue ?? cellData?.value ?? null);
            }
            dataRows.push(rowMap);
        }
        let filteredRows = dataRows;
        for (const filter of filters) {
            filteredRows = filteredRows.filter((rowMap) => {
                const val = rowMap.get(filter.field);
                switch (filter.operator) {
                    case 'eq': return val === filter.value;
                    case 'neq': return val !== filter.value;
                    case 'gt': return Number(val) > Number(filter.value);
                    case 'lt': return Number(val) < Number(filter.value);
                    case 'gte': return Number(val) >= Number(filter.value);
                    case 'lte': return Number(val) <= Number(filter.value);
                    case 'contains': return String(val).includes(String(filter.value));
                    default: return true;
                }
            });
        }
        const pivotData = this.aggregatePivotData(filteredRows, rows, columns, values);
        const pivotTableId = `pivot-${++this.pivotCounter}`;
        const pivotDef = {
            id: pivotTableId,
            sourceRange: dataRange,
            rows,
            columns,
            values: values.map((v) => ({
                field: v.field,
                aggregation: v.aggregation,
            })),
            filters,
            resultRange: `Pivot!A1:${this.columnToLetter(pivotData.columnCount)}${pivotData.rowCount}`,
            createdAt: new Date(),
        };
        spreadsheet.pivotTables.push(pivotDef);
        spreadsheet.updatedAt = new Date();
        this.logger.log(`Created pivot table: ${pivotTableId}, rows=${pivotData.rowCount}, cols=${pivotData.columnCount}`);
        return {
            pivotTableId,
            rowCount: pivotData.rowCount,
            columnCount: pivotData.columnCount,
            status: 'created',
        };
    }
    generateSpreadsheetId() {
        this.spreadsheetCounter++;
        return `ss-${Date.now()}-${this.spreadsheetCounter}`;
    }
    validateCellReference(ref) {
        const match = /^([A-Z]+)(\d+)$/.test(ref);
        if (!match) {
            throw new Error(`Invalid cell reference: ${ref}. Expected format like A1, B2, AA10.`);
        }
    }
    parseCellReference(ref) {
        const match = ref.match(/^([A-Z]+)(\d+)$/);
        if (!match) {
            throw new Error(`Invalid cell reference: ${ref}`);
        }
        const col = this.letterToColumn(match[1]);
        const row = parseInt(match[2], 10);
        return { col, row };
    }
    columnToLetter(col) {
        let result = '';
        while (col > 0) {
            col--;
            result = String.fromCharCode(65 + (col % 26)) + result;
            col = Math.floor(col / 26);
        }
        return result;
    }
    letterToColumn(letters) {
        let col = 0;
        for (let i = 0; i < letters.length; i++) {
            col = col * 26 + (letters.charCodeAt(i) - 64);
        }
        return col;
    }
    parseRange(range) {
        const parts = range.split(':');
        if (parts.length !== 2) {
            throw new Error(`Invalid range format: ${range}. Expected format like A1:D10.`);
        }
        return { startCell: parts[0], endCell: parts[1] };
    }
    evaluateFormula(formula, sheet) {
        const upperFormula = formula.toUpperCase();
        const funcMatch = upperFormula.match(/^(SUM|AVG|AVERAGE|COUNT|MIN|MAX)\(([A-Z]+\d+):([A-Z]+\d+)\)$/);
        if (funcMatch) {
            const [, func, startRef, endRef] = funcMatch;
            const start = this.parseCellReference(startRef);
            const end = this.parseCellReference(endRef);
            const values = [];
            for (let row = start.row; row <= end.row; row++) {
                for (let col = start.col; col <= end.col; col++) {
                    const cellRef = this.columnToLetter(col) + row;
                    const cellData = sheet.cells.get(cellRef);
                    const val = cellData?.computedValue ?? cellData?.value;
                    if (val !== null && val !== undefined && !isNaN(Number(val))) {
                        values.push(Number(val));
                    }
                }
            }
            switch (func) {
                case 'SUM':
                    return values.reduce((a, b) => a + b, 0);
                case 'AVG':
                case 'AVERAGE':
                    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
                case 'COUNT':
                    return values.length;
                case 'MIN':
                    return values.length > 0 ? Math.min(...values) : 0;
                case 'MAX':
                    return values.length > 0 ? Math.max(...values) : 0;
            }
        }
        try {
            let expression = formula;
            const cellRefPattern = /([A-Z]+\d+)/g;
            let match;
            while ((match = cellRefPattern.exec(formula)) !== null) {
                const cellData = sheet.cells.get(match[1]);
                const val = cellData?.computedValue ?? cellData?.value ?? 0;
                expression = expression.replace(match[1], String(val));
            }
            if (/^[\d\s+\-*/().]+$/.test(expression)) {
                const result = new Function(`return ${expression}`)();
                return typeof result === 'number' ? Math.round(result * 1000) / 1000 : result;
            }
        }
        catch {
        }
        return formula;
    }
    adjustFormulaForCell(formula, targetCell) {
        return formula;
    }
    parseCsv(csvString) {
        const lines = csvString.split('\n').filter((line) => line.trim().length > 0);
        return lines.map((line) => {
            const cells = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                }
                else if (char === ',' && !inQuotes) {
                    cells.push(current.trim());
                    current = '';
                }
                else {
                    current += char;
                }
            }
            cells.push(current.trim());
            return cells;
        });
    }
    parseJsonData(data) {
        if (!Array.isArray(data)) {
            throw new Error('JSON data must be an array of objects');
        }
        if (data.length === 0)
            return [];
        const headers = Object.keys(data[0]);
        const rows = [headers];
        for (const item of data) {
            rows.push(headers.map((h) => String(item[h] ?? '')));
        }
        return rows;
    }
    convertToCsv(cells, range) {
        if (cells.length === 0)
            return '';
        const grid = this.convertTo2DArray(cells, range);
        return grid.map((row) => row.map((cell) => {
            const str = String(cell);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        }).join(',')).join('\n');
    }
    convertToJson(cells, range, includeHeaders) {
        const grid = this.convertTo2DArray(cells, range);
        if (grid.length === 0)
            return '[]';
        if (includeHeaders && grid.length > 1) {
            const headers = grid[0];
            const dataRows = grid.slice(1).map((row) => {
                const obj = {};
                headers.forEach((header, i) => {
                    obj[header] = row[i] ?? null;
                });
                return obj;
            });
            return JSON.stringify(dataRows, null, 2);
        }
        return JSON.stringify(grid, null, 2);
    }
    convertTo2DArray(cells, range) {
        if (cells.length === 0)
            return [];
        let minRow = Infinity, maxRow = 0, minCol = Infinity, maxCol = 0;
        for (const cell of cells) {
            const ref = this.parseCellReference(cell.ref);
            minRow = Math.min(minRow, ref.row);
            maxRow = Math.max(maxRow, ref.row);
            minCol = Math.min(minCol, ref.col);
            maxCol = Math.max(maxCol, ref.col);
        }
        const numRows = maxRow - minRow + 1;
        const numCols = maxCol - minCol + 1;
        const grid = Array.from({ length: numRows }, () => Array(numCols).fill(''));
        for (const cell of cells) {
            const ref = this.parseCellReference(cell.ref);
            grid[ref.row - minRow][ref.col - minCol] = String(cell.value ?? '');
        }
        return grid;
    }
    aggregatePivotData(rows, rowFields, columnFields, valueFields) {
        const groups = new Map();
        for (const row of rows) {
            const key = rowFields.length > 0
                ? rowFields.map((f) => String(row.get(f) ?? 'undefined')).join('|')
                : '__all__';
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push(row);
        }
        const pivotData = new Map();
        for (const [groupKey, groupRows] of groups) {
            const aggregated = new Map();
            for (const vf of valueFields) {
                const vals = groupRows
                    .map((r) => Number(r.get(vf.field)))
                    .filter((v) => !isNaN(v));
                let result;
                switch (vf.aggregation.toLowerCase()) {
                    case 'sum':
                        result = vals.reduce((a, b) => a + b, 0);
                        break;
                    case 'avg':
                    case 'average':
                        result = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
                        break;
                    case 'count':
                        result = vals.length;
                        break;
                    case 'min':
                        result = vals.length > 0 ? Math.min(...vals) : 0;
                        break;
                    case 'max':
                        result = vals.length > 0 ? Math.max(...vals) : 0;
                        break;
                    default:
                        result = 0;
                }
                const valueKey = `${vf.field}_${vf.aggregation}`;
                aggregated.set(valueKey, [result]);
            }
            pivotData.set(groupKey, aggregated);
        }
        const rowCount = groups.size + 1;
        const columnCount = valueFields.length + rowFields.length;
        return { rowCount, columnCount, data: pivotData };
    }
};
exports.SpreadsheetAgentService = SpreadsheetAgentService;
exports.SpreadsheetAgentService = SpreadsheetAgentService = __decorate([
    (0, common_1.Injectable)()
], SpreadsheetAgentService);
//# sourceMappingURL=spreadsheet-agent.service.js.map