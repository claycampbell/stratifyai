// Test runner not yet wired up — see docs/INVESTIGATION_K6_kpi_history.md.
//
// This scaffold uses the same Jest + supertest pattern as
// backend/src/routes/__tests__/users.impersonation.test.ts. To run, the project
// will need a `jest.config.js` (or vitest equivalent) and `npm test` script
// added to backend/package.json. Install once:
//   cd backend && npm i -D jest ts-jest @types/jest supertest @types/supertest
//
// These tests guard against the K-6 regression: an entry submitted to
// POST /api/kpis/:id/history MUST be retrievable via GET /api/kpis/:id/history
// in the same request lifecycle, with the recorded_date preserved exactly as
// submitted (no timezone-induced day shift).

import request from 'supertest';
import app from '../server';
import pool from '../config/database';

describe('KPI History API — regression coverage for K-6', () => {
  let testKpiId: string;

  beforeAll(async () => {
    const result = await pool.query(
      `INSERT INTO kpis (name, target_value, current_value, unit, frequency, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      ['K-6 Regression KPI', 100, 0, 'count', 'monthly', 'on_track']
    );
    testKpiId = result.rows[0].id;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM kpi_history WHERE kpi_id = $1', [testKpiId]);
    await pool.query('DELETE FROM kpis WHERE id = $1', [testKpiId]);
    await pool.end();
  });

  describe('POST /api/kpis/:id/history', () => {
    it('returns 201 with the inserted row when value + recorded_date are valid', async () => {
      const payload = {
        value: 42,
        recorded_date: '2026-05-07',
        notes: 'Demo entry from Stephen',
      };

      const response = await request(app)
        .post(`/api/kpis/${testKpiId}/history`)
        .send(payload)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('kpi_id', testKpiId);
      expect(parseFloat(response.body.value)).toBe(42);
      expect(response.body).toHaveProperty('recorded_date');
      expect(response.body.notes).toBe('Demo entry from Stephen');
    });

    it('returns 400 when value is missing', async () => {
      const response = await request(app)
        .post(`/api/kpis/${testKpiId}/history`)
        .send({ recorded_date: '2026-05-07' })
        .expect(400);

      expect(response.body.error).toMatch(/value/i);
    });

    it('returns 400 when recorded_date is missing', async () => {
      const response = await request(app)
        .post(`/api/kpis/${testKpiId}/history`)
        .send({ value: 5 })
        .expect(400);

      expect(response.body.error).toMatch(/recorded_date/i);
    });
  });

  describe('GET /api/kpis/:id/history — round-trip after POST', () => {
    it('returns the just-inserted row immediately after POST', async () => {
      const payload = {
        value: 17,
        recorded_date: '2026-04-15',
        notes: 'Round-trip test',
      };

      const postResponse = await request(app)
        .post(`/api/kpis/${testKpiId}/history`)
        .send(payload)
        .expect(201);
      const insertedId = postResponse.body.id;

      const getResponse = await request(app)
        .get(`/api/kpis/${testKpiId}/history`)
        .expect(200);

      expect(Array.isArray(getResponse.body)).toBe(true);
      const found = getResponse.body.find((row: any) => row.id === insertedId);
      expect(found).toBeDefined();
      expect(parseFloat(found.value)).toBe(17);
      expect(found.notes).toBe('Round-trip test');
    });

    it('preserves the submitted recorded_date without a timezone day-shift', async () => {
      // K-6 hypothesis: pg's default DATE parser returns a JS Date in the
      // server's local timezone, which can cause a one-day shift on display.
      // Submitting '2026-03-10' should round-trip as '2026-03-10', not the day
      // before/after.
      const payload = {
        value: 99,
        recorded_date: '2026-03-10',
        notes: 'Timezone guard',
      };

      await request(app)
        .post(`/api/kpis/${testKpiId}/history`)
        .send(payload)
        .expect(201);

      const getResponse = await request(app)
        .get(`/api/kpis/${testKpiId}/history`)
        .expect(200);

      const matches = getResponse.body.filter(
        (row: any) => row.notes === 'Timezone guard'
      );
      expect(matches.length).toBeGreaterThan(0);

      // The recorded_date may come back as a Date object or a string depending
      // on whether the pg type-parser fix has been applied. In either form,
      // the *date portion* must be 2026-03-10.
      const raw = matches[0].recorded_date;
      const datePart =
        typeof raw === 'string'
          ? raw.slice(0, 10)
          : new Date(raw).toISOString().slice(0, 10);
      expect(datePart).toBe('2026-03-10');
    });
  });
});
