"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var HttpExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
let HttpExceptionFilter = HttpExceptionFilter_1 = class HttpExceptionFilter {
    constructor() {
        this.logger = new common_1.Logger(HttpExceptionFilter_1.name);
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const statusCode = exception instanceof common_1.HttpException
            ? exception.getStatus()
            : common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        const exceptionResponse = exception instanceof common_1.HttpException ? exception.getResponse() : null;
        const message = typeof exceptionResponse === 'string'
            ? exceptionResponse
            : exceptionResponse?.message ||
                (exception instanceof Error ? exception.message : 'Internal server error');
        const error = typeof exceptionResponse === 'object' &&
            exceptionResponse?.error
            ? exceptionResponse.error
            : common_1.HttpStatus[statusCode] || 'Internal Server Error';
        const errorResponse = {
            statusCode,
            message: Array.isArray(message) ? message.join('; ') : String(message),
            error: String(error),
            timestamp: new Date().toISOString(),
            path: request.url,
            correlationId: request.headers['x-correlation-id'],
        };
        if (exception instanceof common_1.HttpException &&
            typeof exceptionResponse === 'object') {
            const details = exceptionResponse.details;
            if (details) {
                errorResponse.details = details;
            }
        }
        if (statusCode >= common_1.HttpStatus.INTERNAL_SERVER_ERROR) {
            this.logger.error(`${request.method} ${request.url} - ${statusCode}`, exception instanceof Error ? exception.stack : undefined);
        }
        else {
            this.logger.warn(`${request.method} ${request.url} - ${statusCode}: ${errorResponse.message}`);
        }
        response.status(statusCode).json(errorResponse);
    }
};
exports.HttpExceptionFilter = HttpExceptionFilter;
exports.HttpExceptionFilter = HttpExceptionFilter = HttpExceptionFilter_1 = __decorate([
    (0, common_1.Catch)()
], HttpExceptionFilter);
//# sourceMappingURL=http-exception.filter.js.map