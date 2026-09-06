import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authorizeRoles } from '../src/middleware/auth';

test('authorizeRoles blocks users whose role is not in the allowed list', () => {
  let status = 0;
  let message = '';
  let nextCalled = false;
  const req: any = { user: { id: 'u1', role: 'ADMIN' } };
  const res: any = {
    status: (code: number) => {
      status = code;
      return res;
    },
    json: (body: { message?: string }) => {
      message = body.message || '';
      return res;
    },
  };

  authorizeRoles('INSPECTOR', 'SUPERVISOR')(req, res, () => {
    nextCalled = true;
  });

  assert.equal(status, 403);
  assert.equal(nextCalled, false);
  assert.match(message, /Forbidden/);
});

test('authorizeRoles allows approved reviewer roles', () => {
  let nextCalled = false;
  const req: any = { user: { id: 'u1', role: 'INSPECTOR' } };
  const res: any = { status: () => res, json: () => res };

  authorizeRoles('ADMIN', 'SUPERVISOR', 'INSPECTOR')(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});

test('authorizeRoles rejects requests without a user (unauthenticated)', () => {
  let status = 0;
  const req: any = {};
  const res: any = {
    status: (code: number) => {
      status = code;
      return res;
    },
    json: () => res,
  };

  authorizeRoles('INSPECTOR')(req, res, () => {});

  assert.equal(status, 403);
});