"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_GRAPH_OPTIONS = exports.GraphStatus = exports.EdgeType = exports.GraphNodeStatus = exports.GraphNodeType = void 0;
var GraphNodeType;
(function (GraphNodeType) {
    GraphNodeType["RESEARCH"] = "RESEARCH";
    GraphNodeType["BUILD"] = "BUILD";
    GraphNodeType["TEST"] = "TEST";
    GraphNodeType["CERTIFY"] = "CERTIFY";
    GraphNodeType["DELIVER"] = "DELIVER";
})(GraphNodeType || (exports.GraphNodeType = GraphNodeType = {}));
var GraphNodeStatus;
(function (GraphNodeStatus) {
    GraphNodeStatus["PENDING"] = "PENDING";
    GraphNodeStatus["READY"] = "READY";
    GraphNodeStatus["RUNNING"] = "RUNNING";
    GraphNodeStatus["COMPLETED"] = "COMPLETED";
    GraphNodeStatus["FAILED"] = "FAILED";
    GraphNodeStatus["SKIPPED"] = "SKIPPED";
})(GraphNodeStatus || (exports.GraphNodeStatus = GraphNodeStatus = {}));
var EdgeType;
(function (EdgeType) {
    EdgeType["DEPENDS_ON"] = "DEPENDS_ON";
    EdgeType["RECOMMENDED"] = "RECOMMENDED";
    EdgeType["PARALLEL"] = "PARALLEL";
})(EdgeType || (exports.EdgeType = EdgeType = {}));
var GraphStatus;
(function (GraphStatus) {
    GraphStatus["DRAFT"] = "DRAFT";
    GraphStatus["READY"] = "READY";
    GraphStatus["RUNNING"] = "RUNNING";
    GraphStatus["COMPLETED"] = "COMPLETED";
    GraphStatus["FAILED"] = "FAILED";
    GraphStatus["PARTIAL"] = "PARTIAL";
})(GraphStatus || (exports.GraphStatus = GraphStatus = {}));
exports.DEFAULT_GRAPH_OPTIONS = {
    maxParallelism: 25,
    maxRetriesPerNode: 2,
    costBudgetUsd: 100,
    timeBudgetMs: 48 * 60 * 60 * 1000,
    skipOptional: false,
};
//# sourceMappingURL=execution-graph.interface.js.map