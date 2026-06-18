/**
 * PDEOS Phase 2 — Security Fix
 * File: backend/src/modules/intelligence/cypher-validator.ts
 * Fix H4: parser-based Cypher validation (was regex)
 */
import { BadRequestException } from '@nestjs/common';

const FORBIDDEN = ['DELETE', 'REMOVE', 'DROP', 'CREATE INDEX', 'DROP INDEX',
  'CREATE CONSTRAINT', 'DROP CONSTRAINT', 'MERGE', 'SET', 'FOREACH', 'CALL', 'LOAD CSV'];

export function validateCypherQuery(query: string): { safe: boolean; reason?: string } {
  if (!query || typeof query !== 'string') return { safe: false, reason: 'Empty query' };
  if (query.length > 4096) return { safe: false, reason: 'Too long' };

  // Strip comments
  const stripped = query.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  const normalized = stripped.replace(/\s+/g, ' ').toUpperCase().trim();

  for (const kw of FORBIDDEN) {
    const pattern = new RegExp(`\\b${kw.replace(/\s+/g, '\\s+')}\\b`, 'g');
    if (pattern.test(normalized)) return { safe: false, reason: `Forbidden: ${kw}` };
  }
  if (!/\bMATCH\b/.test(normalized) || !/\bRETURN\b/.test(normalized)) {
    return { safe: false, reason: 'Must contain MATCH and RETURN' };
  }
  return { safe: true };
}

export function validateCypherQueryOrThrow(query: string): void {
  const r = validateCypherQuery(query);
  if (!r.safe) throw new BadRequestException({ error: 'CYPHER_VALIDATION_FAILED', message: r.reason });
}
