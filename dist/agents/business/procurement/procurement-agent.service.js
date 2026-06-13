"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcurementAgentService = exports.PROCUREMENT_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
exports.PROCUREMENT_AGENT_CONFIG = {
    id: 'business-procurement',
    name: 'Procurement',
    cluster: agent_interface_1.AgentCluster.BUSINESS,
    version: '1.0.0',
    description: 'Procurement agent that handles vendor management, purchase order creation, shipment tracking, supplier comparison, contract negotiation, and procurement reporting.',
    capabilities: [
        {
            name: 'createPurchaseOrder',
            description: 'Create a new purchase order',
            inputSchema: {
                type: 'object',
                properties: {
                    vendorId: { type: 'string', description: 'Vendor ID' },
                    items: { type: 'array', items: { type: 'object' }, description: 'Line items' },
                    deliveryDate: { type: 'string', description: 'Expected delivery date' },
                    priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Order priority' },
                    notes: { type: 'string', description: 'Order notes' },
                },
                required: ['vendorId', 'items'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    orderId: { type: 'string' },
                    vendorId: { type: 'string' },
                    totalAmount: { type: 'number' },
                    status: { type: 'string' },
                    createdAt: { type: 'string' },
                },
            },
        },
        {
            name: 'manageVendor',
            description: 'Manage vendor profiles and relationships',
            inputSchema: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['create', 'update', 'evaluate', 'list'], description: 'Vendor management action' },
                    vendorId: { type: 'string', description: 'Vendor ID' },
                    name: { type: 'string', description: 'Vendor name' },
                    category: { type: 'string', description: 'Vendor category' },
                    contactEmail: { type: 'string', description: 'Vendor contact email' },
                    rating: { type: 'number', description: 'Vendor rating (1-5)' },
                },
                required: ['action'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    vendorId: { type: 'string' },
                    action: { type: 'string' },
                    name: { type: 'string' },
                    category: { type: 'string' },
                    rating: { type: 'number' },
                    status: { type: 'string' },
                },
            },
        },
        {
            name: 'trackShipment',
            description: 'Track shipment status and delivery progress',
            inputSchema: {
                type: 'object',
                properties: {
                    orderId: { type: 'string', description: 'Purchase order ID' },
                    trackingNumber: { type: 'string', description: 'Shipment tracking number' },
                    carrier: { type: 'string', description: 'Shipping carrier' },
                },
                required: ['orderId'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    trackingId: { type: 'string' },
                    status: { type: 'string' },
                    currentLocation: { type: 'string' },
                    estimatedDelivery: { type: 'string' },
                    history: { type: 'array' },
                },
            },
        },
        {
            name: 'compareSuppliers',
            description: 'Compare suppliers based on pricing, quality, delivery, and other criteria',
            inputSchema: {
                type: 'object',
                properties: {
                    category: { type: 'string', description: 'Product/service category' },
                    criteria: { type: 'array', items: { type: 'string' }, description: 'Comparison criteria' },
                    supplierIds: { type: 'array', items: { type: 'string' }, description: 'Specific supplier IDs to compare' },
                },
                required: ['category'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    comparisonId: { type: 'string' },
                    category: { type: 'string' },
                    suppliers: { type: 'array' },
                    recommendation: { type: 'string' },
                },
            },
        },
        {
            name: 'negotiateContract',
            description: 'Prepare and manage contract negotiations with vendors',
            inputSchema: {
                type: 'object',
                properties: {
                    vendorId: { type: 'string', description: 'Vendor ID' },
                    contractType: { type: 'string', enum: ['annual', 'multi-year', 'spot', 'framework'], description: 'Contract type' },
                    terms: { type: 'object', description: 'Proposed contract terms' },
                    targetDiscount: { type: 'number', description: 'Target discount percentage' },
                },
                required: ['vendorId', 'contractType'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    negotiationId: { type: 'string' },
                    vendorId: { type: 'string' },
                    contractType: { type: 'string' },
                    proposedTerms: { type: 'object' },
                    estimatedSavings: { type: 'number' },
                    status: { type: 'string' },
                },
            },
        },
        {
            name: 'generateProcurementReport',
            description: 'Generate a procurement analytics and status report',
            inputSchema: {
                type: 'object',
                properties: {
                    reportType: { type: 'string', enum: ['spend', 'vendor', 'efficiency', 'savings'], description: 'Type of procurement report' },
                    period: { type: 'string', description: 'Report period' },
                    category: { type: 'string', description: 'Procurement category filter' },
                },
                required: ['reportType'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    reportId: { type: 'string' },
                    reportType: { type: 'string' },
                    summary: { type: 'object' },
                    data: { type: 'object' },
                    generatedAt: { type: 'string' },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'read:business',
        'write:business',
        'read:procurement',
        'write:procurement',
        'approve:purchase',
    ],
    maxConcurrentTasks: 5,
    timeout: 30000,
    retryPolicy: {
        maxRetries: 2,
        backoffMs: 1000,
        exponentialBackoff: true,
    },
};
let ProcurementAgentService = class ProcurementAgentService extends base_agent_service_1.BaseAgentService {
    constructor() {
        super(...arguments);
        this.vendors = new Map();
        this.purchaseOrders = new Map();
        this.shipments = new Map();
        this.counter = 0;
    }
    defineConfig() {
        return exports.PROCUREMENT_AGENT_CONFIG;
    }
    async onInitialize() {
        this.seedVendors();
        this.registerTool({
            name: 'createPurchaseOrder',
            description: 'Create a purchase order',
            execute: async (params) => this.createPurchaseOrder(params),
        });
        this.registerTool({
            name: 'manageVendor',
            description: 'Manage vendor profiles',
            execute: async (params) => this.manageVendor(params),
        });
        this.registerTool({
            name: 'trackShipment',
            description: 'Track shipment status',
            execute: async (params) => this.trackShipment(params),
        });
        this.registerTool({
            name: 'compareSuppliers',
            description: 'Compare suppliers',
            execute: async (params) => this.compareSuppliers(params),
        });
        this.registerTool({
            name: 'negotiateContract',
            description: 'Negotiate contract with vendor',
            execute: async (params) => this.negotiateContract(params),
        });
        this.registerTool({
            name: 'generateProcurementReport',
            description: 'Generate a procurement report',
            execute: async (params) => this.generateProcurementReport(params),
        });
        await this.storeInWorkingMemory('procurement:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('Procurement agent initialized with 6 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        const supportedActions = [
            'createPurchaseOrder',
            'manageVendor',
            'trackShipment',
            'compareSuppliers',
            'negotiateContract',
            'generateProcurementReport',
        ];
        if (!supportedActions.includes(action)) {
            return this.createAgentOutput(input.taskId, false, null, `Unknown procurement action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        }
        try {
            const tool = this.getTool(action);
            if (!tool) {
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            }
            const result = await tool.execute(params);
            await this.storeInWorkingMemory(`procurement:last:${action}`, { params, result, timestamp: new Date() }, 300000);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`Procurement execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.vendors.clear();
        this.purchaseOrders.clear();
        this.shipments.clear();
        this.counter = 0;
        this.logger.log('Procurement agent destroyed, all data cleared');
    }
    async createPurchaseOrder(params) {
        const { vendorId, items, deliveryDate, priority = 'medium', notes = '' } = params;
        if (!vendorId || typeof vendorId !== 'string') {
            throw new Error('A valid vendorId is required');
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            throw new Error('At least one item is required');
        }
        const vendor = this.vendors.get(vendorId);
        if (!vendor) {
            throw new Error(`Vendor not found: ${vendorId}`);
        }
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        if (!validPriorities.includes(priority)) {
            throw new Error(`Invalid priority: ${priority}. Supported: ${validPriorities.join(', ')}`);
        }
        this.counter++;
        const orderId = `po-${Date.now()}-${this.counter}`;
        const lineItems = items.map((item) => {
            if (!item.name || item.quantity <= 0 || item.unitPrice < 0) {
                throw new Error(`Invalid item: ${JSON.stringify(item)}. Each item needs name, positive quantity, and non-negative unitPrice`);
            }
            return {
                name: item.name,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: Math.round(item.quantity * item.unitPrice * 100) / 100,
            };
        });
        const totalAmount = Math.round(lineItems.reduce((s, item) => s + item.total, 0) * 100) / 100;
        const deliveryDateObj = deliveryDate ? new Date(deliveryDate) : null;
        const order = {
            id: orderId,
            vendorId,
            items: lineItems,
            totalAmount,
            priority,
            status: 'draft',
            deliveryDate: deliveryDateObj,
            notes,
            createdAt: new Date(),
        };
        this.purchaseOrders.set(orderId, order);
        vendor.totalOrders++;
        vendor.totalSpend += totalAmount;
        this.logger.log(`Created PO: ${orderId}, vendor=${vendorId}, total=${totalAmount}, priority=${priority}`);
        return {
            orderId,
            vendorId,
            items: lineItems,
            totalAmount,
            priority,
            status: 'draft',
            deliveryDate: deliveryDateObj?.toISOString() || null,
            createdAt: order.createdAt.toISOString(),
        };
    }
    async manageVendor(params) {
        const { action: vendorAction, vendorId, name, category = 'general', contactEmail = '', rating } = params;
        const validActions = ['create', 'update', 'evaluate', 'list'];
        if (!validActions.includes(vendorAction)) {
            throw new Error(`Invalid vendor action: ${vendorAction}. Supported: ${validActions.join(', ')}`);
        }
        switch (vendorAction) {
            case 'create': {
                if (!name)
                    throw new Error('Vendor name is required for creation');
                this.counter++;
                const newVendorId = `vendor-${Date.now()}-${this.counter}`;
                const vendor = {
                    id: newVendorId,
                    name,
                    category,
                    contactEmail,
                    rating: rating || 0,
                    status: 'pending',
                    totalOrders: 0,
                    totalSpend: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
                this.vendors.set(newVendorId, vendor);
                this.logger.log(`Created vendor: ${newVendorId}, name=${name}, category=${category}`);
                return {
                    vendorId: newVendorId,
                    action: vendorAction,
                    name,
                    category,
                    rating: vendor.rating,
                    status: 'pending',
                    updatedAt: vendor.updatedAt.toISOString(),
                };
            }
            case 'update': {
                if (!vendorId)
                    throw new Error('vendorId is required for update');
                const vendor = this.vendors.get(vendorId);
                if (!vendor)
                    throw new Error(`Vendor not found: ${vendorId}`);
                if (name)
                    vendor.name = name;
                if (category)
                    vendor.category = category;
                if (contactEmail)
                    vendor.contactEmail = contactEmail;
                if (rating !== undefined) {
                    if (rating < 1 || rating > 5)
                        throw new Error('Rating must be between 1 and 5');
                    vendor.rating = rating;
                }
                vendor.updatedAt = new Date();
                if (vendor.status === 'pending' && vendor.rating > 0)
                    vendor.status = 'active';
                this.logger.log(`Updated vendor: ${vendorId}`);
                return {
                    vendorId,
                    action: vendorAction,
                    name: vendor.name,
                    category: vendor.category,
                    rating: vendor.rating,
                    status: vendor.status,
                    updatedAt: vendor.updatedAt.toISOString(),
                };
            }
            case 'evaluate': {
                if (!vendorId)
                    throw new Error('vendorId is required for evaluation');
                const vendor = this.vendors.get(vendorId);
                if (!vendor)
                    throw new Error(`Vendor not found: ${vendorId}`);
                const newRating = +(1 + Math.random() * 4).toFixed(1);
                vendor.rating = newRating;
                vendor.updatedAt = new Date();
                this.logger.log(`Evaluated vendor: ${vendorId}, new rating=${newRating}`);
                return {
                    vendorId,
                    action: vendorAction,
                    name: vendor.name,
                    category: vendor.category,
                    rating: vendor.rating,
                    status: vendor.status,
                    updatedAt: vendor.updatedAt.toISOString(),
                };
            }
            case 'list': {
                const vendorList = Array.from(this.vendors.values());
                this.logger.log(`Listed vendors: count=${vendorList.length}`);
                return {
                    vendorId: 'all',
                    action: vendorAction,
                    name: `${vendorList.length} vendors`,
                    category: 'all',
                    rating: vendorList.length > 0
                        ? +(vendorList.reduce((s, v) => s + v.rating, 0) / vendorList.length).toFixed(1)
                        : 0,
                    status: 'listed',
                    updatedAt: new Date().toISOString(),
                };
            }
            default:
                throw new Error(`Unhandled vendor action: ${vendorAction}`);
        }
    }
    async trackShipment(params) {
        const { orderId, trackingNumber, carrier = 'Standard Carrier' } = params;
        if (!orderId || typeof orderId !== 'string') {
            throw new Error('A valid orderId is required');
        }
        const order = this.purchaseOrders.get(orderId);
        if (!order) {
            throw new Error(`Purchase order not found: ${orderId}`);
        }
        const existingShipment = Array.from(this.shipments.values()).find((s) => s.orderId === orderId);
        if (existingShipment) {
            const statuses = ['picked_up', 'in_transit', 'out_for_delivery', 'delivered'];
            const currentIdx = statuses.indexOf(existingShipment.status);
            if (currentIdx < statuses.length - 1) {
                existingShipment.status = statuses[currentIdx + 1];
                existingShipment.history.push({
                    status: existingShipment.status,
                    location: `Hub ${Math.floor(Math.random() * 10) + 1}`,
                    timestamp: new Date(),
                });
            }
            this.logger.log(`Updated shipment for order: ${orderId}, status=${existingShipment.status}`);
            return {
                trackingId: existingShipment.id,
                orderId,
                carrier: existingShipment.carrier,
                status: existingShipment.status,
                currentLocation: existingShipment.currentLocation,
                estimatedDelivery: existingShipment.estimatedDelivery.toISOString(),
                history: existingShipment.history.map((h) => ({
                    status: h.status,
                    location: h.location,
                    timestamp: h.timestamp.toISOString(),
                })),
            };
        }
        this.counter++;
        const trackingId = trackingNumber || `track-${Date.now()}-${this.counter}`;
        const statuses = ['order_placed', 'processing', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'];
        const currentStatusIdx = Math.min(2, Math.floor(Math.random() * 4));
        const estimatedDelivery = order.deliveryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const locations = ['Warehouse A', 'Distribution Center B', 'Sorting Facility C', 'Local Hub D'];
        const history = statuses.slice(0, currentStatusIdx + 1).map((status, i) => ({
            status,
            location: locations[i] || `Facility ${i}`,
            timestamp: new Date(Date.now() - (currentStatusIdx - i) * 24 * 60 * 60 * 1000),
        }));
        const shipment = {
            id: trackingId,
            orderId,
            carrier,
            status: statuses[currentStatusIdx],
            currentLocation: locations[currentStatusIdx] || 'Unknown',
            estimatedDelivery,
            history,
        };
        this.shipments.set(trackingId, shipment);
        if (shipment.status === 'delivered') {
            order.status = 'delivered';
        }
        else if (shipment.status === 'in_transit' || shipment.status === 'picked_up') {
            order.status = 'shipped';
        }
        this.logger.log(`Created shipment tracking: ${trackingId}, order=${orderId}, status=${shipment.status}`);
        return {
            trackingId,
            orderId,
            carrier,
            status: shipment.status,
            currentLocation: shipment.currentLocation,
            estimatedDelivery: estimatedDelivery.toISOString(),
            history: history.map((h) => ({
                status: h.status,
                location: h.location,
                timestamp: h.timestamp.toISOString(),
            })),
        };
    }
    async compareSuppliers(params) {
        const { category, criteria = [], supplierIds = [] } = params;
        if (!category || typeof category !== 'string') {
            throw new Error('A valid category is required');
        }
        this.counter++;
        const comparisonId = `comp-${Date.now()}-${this.counter}`;
        const defaultCriteria = ['price', 'quality', 'delivery', 'service', 'reliability'];
        const comparisonCriteria = criteria.length > 0 ? criteria : defaultCriteria;
        let vendorsToCompare;
        if (supplierIds.length > 0) {
            vendorsToCompare = supplierIds
                .map((id) => this.vendors.get(id))
                .filter((v) => v !== undefined);
        }
        else {
            vendorsToCompare = Array.from(this.vendors.values())
                .filter((v) => v.category === category || v.category === 'general');
        }
        if (vendorsToCompare.length === 0) {
            vendorsToCompare = [
                { id: 'sim-1', name: 'Supplier Alpha', category, rating: 4.2, status: 'active', totalOrders: 25, totalSpend: 150000, contactEmail: '', createdAt: new Date(), updatedAt: new Date() },
                { id: 'sim-2', name: 'Supplier Beta', category, rating: 3.8, status: 'active', totalOrders: 18, totalSpend: 120000, contactEmail: '', createdAt: new Date(), updatedAt: new Date() },
                { id: 'sim-3', name: 'Supplier Gamma', category, rating: 4.5, status: 'active', totalOrders: 30, totalSpend: 200000, contactEmail: '', createdAt: new Date(), updatedAt: new Date() },
            ];
        }
        const suppliers = vendorsToCompare.map((vendor) => {
            const scores = {};
            for (const criterion of comparisonCriteria) {
                switch (criterion) {
                    case 'price':
                        scores[criterion] = Math.round(60 + Math.random() * 35);
                        break;
                    case 'quality':
                        scores[criterion] = Math.round(vendor.rating * 20);
                        break;
                    case 'delivery':
                        scores[criterion] = Math.round(65 + Math.random() * 30);
                        break;
                    case 'service':
                        scores[criterion] = Math.round(70 + Math.random() * 25);
                        break;
                    case 'reliability':
                        scores[criterion] = Math.round(vendor.rating * 18 + Math.random() * 10);
                        break;
                    default:
                        scores[criterion] = Math.round(50 + Math.random() * 40);
                }
            }
            const overallScore = Math.round(Object.values(scores).reduce((s, v) => s + v, 0) / Object.values(scores).length);
            return { id: vendor.id, name: vendor.name, scores, overallScore, rank: 0 };
        });
        suppliers.sort((a, b) => b.overallScore - a.overallScore);
        suppliers.forEach((s, i) => { s.rank = i + 1; });
        const topSupplier = suppliers[0];
        const recommendation = topSupplier
            ? `Recommended supplier: ${topSupplier.name} (overall score: ${topSupplier.overallScore}/100, rank #1)`
            : 'No suppliers available for comparison';
        this.logger.log(`Compared suppliers: ${comparisonId}, category=${category}, count=${suppliers.length}`);
        return {
            comparisonId,
            category,
            suppliers,
            recommendation,
        };
    }
    async negotiateContract(params) {
        const { vendorId, contractType, terms = {}, targetDiscount = 10 } = params;
        if (!vendorId || typeof vendorId !== 'string') {
            throw new Error('A valid vendorId is required');
        }
        const vendor = this.vendors.get(vendorId);
        if (!vendor) {
            throw new Error(`Vendor not found: ${vendorId}`);
        }
        const validContractTypes = ['annual', 'multi-year', 'spot', 'framework'];
        if (!validContractTypes.includes(contractType)) {
            throw new Error(`Invalid contract type: ${contractType}. Supported: ${validContractTypes.join(', ')}`);
        }
        this.counter++;
        const negotiationId = `neg-${Date.now()}-${this.counter}`;
        const achievableDiscount = Math.min(targetDiscount, +(5 + Math.random() * (targetDiscount - 3)).toFixed(1));
        const estimatedSavings = Math.round(vendor.totalSpend * achievableDiscount / 100);
        const proposedTerms = {
            contractType,
            duration: contractType === 'annual' ? '12 months' : contractType === 'multi-year' ? '36 months' : contractType === 'spot' ? 'one-time' : '24 months',
            paymentTerms: terms.paymentTerms || 'Net 30',
            discount: achievableDiscount,
            minimumOrderValue: terms.minimumOrderValue || Math.round(5000 + Math.random() * 15000),
            deliveryTerms: terms.deliveryTerms || 'FOB Destination',
            warrantyPeriod: terms.warrantyPeriod || '12 months',
            autoRenewal: terms.autoRenewal !== undefined ? terms.autoRenewal : true,
            penaltyClause: terms.penaltyClause || '2% per week for late delivery',
        };
        const nextSteps = [
            `Review proposed terms with ${vendor.name}`,
            `Schedule negotiation meeting with vendor representative`,
            'Prepare internal approval documentation',
            `Target final discount of ${achievableDiscount}% or higher`,
            'Define KPIs and SLA metrics for the contract',
        ];
        this.logger.log(`Contract negotiation: ${negotiationId}, vendor=${vendor.name}, discount=${achievableDiscount}%, savings=${estimatedSavings}`);
        return {
            negotiationId,
            vendorId,
            contractType,
            proposedTerms,
            estimatedSavings,
            savingsPercent: achievableDiscount,
            status: 'proposed',
            nextSteps,
        };
    }
    async generateProcurementReport(params) {
        const { reportType, period = 'current', category = 'all' } = params;
        const validReportTypes = ['spend', 'vendor', 'efficiency', 'savings'];
        if (!validReportTypes.includes(reportType)) {
            throw new Error(`Invalid reportType: ${reportType}. Supported: ${validReportTypes.join(', ')}`);
        }
        this.counter++;
        const reportId = `proc-rpt-${Date.now()}-${this.counter}`;
        const totalSpend = Array.from(this.purchaseOrders.values()).reduce((s, o) => s + o.totalAmount, 0) || 500000 + Math.floor(Math.random() * 500000);
        const totalOrders = this.purchaseOrders.size || 50 + Math.floor(Math.random() * 50);
        let summary = {};
        let data = {};
        switch (reportType) {
            case 'spend': {
                summary = {
                    totalSpend,
                    totalOrders,
                    avgOrderValue: Math.round(totalSpend / totalOrders),
                    spendByCategory: {
                        IT: Math.round(totalSpend * 0.35),
                        Office: Math.round(totalSpend * 0.2),
                        Services: Math.round(totalSpend * 0.25),
                        RawMaterials: Math.round(totalSpend * 0.2),
                    },
                };
                data = {
                    monthlySpend: Array.from({ length: 6 }, (_, i) => ({
                        month: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0].substring(0, 7),
                        amount: Math.round(totalSpend / 6 * (0.8 + Math.random() * 0.4)),
                    })),
                    topVendorsBySpend: Array.from(this.vendors.values())
                        .sort((a, b) => b.totalSpend - a.totalSpend)
                        .slice(0, 5)
                        .map((v) => ({ name: v.name, spend: v.totalSpend })),
                };
                break;
            }
            case 'vendor': {
                const vendorList = Array.from(this.vendors.values());
                summary = {
                    totalVendors: vendorList.length,
                    activeVendors: vendorList.filter((v) => v.status === 'active').length,
                    avgRating: vendorList.length > 0
                        ? +(vendorList.reduce((s, v) => s + v.rating, 0) / vendorList.length).toFixed(1)
                        : 0,
                };
                data = {
                    vendorsByCategory: this.groupVendorsByField(vendorList, 'category'),
                    ratingDistribution: {
                        excellent: vendorList.filter((v) => v.rating >= 4).length,
                        good: vendorList.filter((v) => v.rating >= 3 && v.rating < 4).length,
                        needsImprovement: vendorList.filter((v) => v.rating > 0 && v.rating < 3).length,
                        unrated: vendorList.filter((v) => v.rating === 0).length,
                    },
                };
                break;
            }
            case 'efficiency': {
                summary = {
                    avgProcessingTime: `${3 + Math.floor(Math.random() * 5)} days`,
                    onTimeDeliveryRate: +(85 + Math.random() * 12).toFixed(1),
                    orderAccuracyRate: +(95 + Math.random() * 4).toFixed(1),
                    avgApprovalTime: `${1 + Math.floor(Math.random() * 3)} days`,
                };
                data = {
                    processingTimeTrend: 'improving',
                    bottleneckStages: ['approval', 'vendor_confirmation'],
                    automationOpportunities: ['auto-approval for < $5K', 'recurring order templates', 'vendor portal integration'],
                };
                break;
            }
            case 'savings': {
                const totalSavings = Math.round(totalSpend * (0.05 + Math.random() * 0.1));
                summary = {
                    totalSavings,
                    savingsPercent: +((totalSavings / totalSpend) * 100).toFixed(1),
                    negotiatedSavings: Math.round(totalSavings * 0.6),
                    processSavings: Math.round(totalSavings * 0.25),
                    consolidationSavings: Math.round(totalSavings * 0.15),
                };
                data = {
                    savingsByCategory: {
                        IT: Math.round(totalSavings * 0.4),
                        Office: Math.round(totalSavings * 0.15),
                        Services: Math.round(totalSavings * 0.3),
                        RawMaterials: Math.round(totalSavings * 0.15),
                    },
                    savingsInitiatives: [
                        { name: 'Vendor consolidation', savings: Math.round(totalSavings * 0.3) },
                        { name: 'Volume discount renegotiation', savings: Math.round(totalSavings * 0.25) },
                        { name: 'Process automation', savings: Math.round(totalSavings * 0.2) },
                        { name: 'Alternative supplier sourcing', savings: Math.round(totalSavings * 0.15) },
                    ],
                };
                break;
            }
        }
        this.logger.log(`Generated procurement report: ${reportId}, type=${reportType}`);
        return {
            reportId,
            reportType,
            period,
            summary,
            data,
            generatedAt: new Date().toISOString(),
        };
    }
    seedVendors() {
        const vendors = [
            { name: 'TechSupply Inc.', category: 'IT', rating: 4.5 },
            { name: 'OfficeMax Pro', category: 'Office', rating: 3.8 },
            { name: 'CloudServices Ltd.', category: 'IT', rating: 4.2 },
            { name: 'GlobalLogistics Co.', category: 'Services', rating: 4.0 },
            { name: 'RawMaterials Direct', category: 'RawMaterials', rating: 3.5 },
        ];
        vendors.forEach((v, i) => {
            const id = `vendor-seed-${i + 1}`;
            this.vendors.set(id, {
                id,
                name: v.name,
                category: v.category,
                contactEmail: `contact@${v.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.com`,
                rating: v.rating,
                status: 'active',
                totalOrders: 5 + Math.floor(Math.random() * 20),
                totalSpend: 10000 + Math.floor(Math.random() * 90000),
                createdAt: new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)),
                updatedAt: new Date(),
            });
        });
    }
    groupVendorsByField(vendors, field) {
        const grouped = {};
        for (const vendor of vendors) {
            const key = String(vendor[field] || 'unknown');
            grouped[key] = (grouped[key] || 0) + 1;
        }
        return grouped;
    }
};
exports.ProcurementAgentService = ProcurementAgentService;
exports.ProcurementAgentService = ProcurementAgentService = __decorate([
    (0, common_1.Injectable)()
], ProcurementAgentService);
//# sourceMappingURL=procurement-agent.service.js.map