"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const memory_service_1 = require("./memory.service");
const working_memory_service_1 = require("./working-memory.service");
const session_memory_service_1 = require("./session-memory.service");
const long_term_memory_service_1 = require("./long-term-memory.service");
const knowledge_graph_service_1 = require("./knowledge-graph.service");
const vector_search_service_1 = require("./vector-search.service");
const rag_service_1 = require("./rag.service");
let MemoryModule = class MemoryModule {
};
exports.MemoryModule = MemoryModule;
exports.MemoryModule = MemoryModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule],
        providers: [
            memory_service_1.MemoryService,
            working_memory_service_1.WorkingMemoryService,
            session_memory_service_1.SessionMemoryService,
            long_term_memory_service_1.LongTermMemoryService,
            knowledge_graph_service_1.KnowledgeGraphService,
            vector_search_service_1.VectorSearchService,
            rag_service_1.RAGService,
        ],
        exports: [
            memory_service_1.MemoryService,
            working_memory_service_1.WorkingMemoryService,
            session_memory_service_1.SessionMemoryService,
            long_term_memory_service_1.LongTermMemoryService,
            knowledge_graph_service_1.KnowledgeGraphService,
            vector_search_service_1.VectorSearchService,
            rag_service_1.RAGService,
        ],
    })
], MemoryModule);
//# sourceMappingURL=memory.module.js.map