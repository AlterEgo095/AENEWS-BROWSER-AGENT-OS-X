"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_WORKER_CONSTRAINTS = exports.WorkerStatus = void 0;
var WorkerStatus;
(function (WorkerStatus) {
    WorkerStatus["SPAWNING"] = "SPAWNING";
    WorkerStatus["READY"] = "READY";
    WorkerStatus["EXECUTING"] = "EXECUTING";
    WorkerStatus["IDLE"] = "IDLE";
    WorkerStatus["TERMINATING"] = "TERMINATING";
    WorkerStatus["TERMINATED"] = "TERMINATED";
    WorkerStatus["FAILED"] = "FAILED";
})(WorkerStatus || (exports.WorkerStatus = WorkerStatus = {}));
exports.DEFAULT_WORKER_CONSTRAINTS = {
    maxConcurrentWorkers: 25,
    maxWorkersPerCapability: 5,
    maxTotalCostUsd: 500,
    defaultLifetimeMs: 4 * 60 * 60 * 1000,
    defaultMaxTasksPerWorker: 50,
};
//# sourceMappingURL=worker.interface.js.map