import { describe, it, expect } from 'vitest';
import { parsePagination, buildEnvelope } from './pagination.js';

describe('Pagination Utils', () => {
  describe('parsePagination', () => {
    it('defaults to page 1, pageSize 20 when missing', () => {
      const result = parsePagination({});
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(20);
    });

    it('clamps pageSize over 100', () => {
      const result = parsePagination({ pageSize: '250' });
      expect(result.pageSize).toBe(100);
      expect(result.take).toBe(100);
    });

    it('negative page becomes 1', () => {
      const result = parsePagination({ page: '-5' });
      expect(result.page).toBe(1);
      expect(result.skip).toBe(0);
    });

    it('parses sort and order correctly', () => {
      const result = parsePagination({ sort: 'name', order: 'desc' });
      expect(result.sort).toBe('name');
      expect(result.order).toBe('desc');
    });
  });

  describe('buildEnvelope', () => {
    it('computes totalPages ceil', () => {
      const result = buildEnvelope([], 45, 1, 20);
      expect(result.pagination.totalPages).toBe(3);
      expect(result.pagination.total).toBe(45);
    });
  });
});
