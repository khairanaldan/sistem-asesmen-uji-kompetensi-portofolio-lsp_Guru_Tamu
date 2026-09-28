const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ejs = require('ejs');
const { requireAuth, allowRoles } = require('../src/middlewares/auth');

function mockResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = body; return this; },
    redirect(path) { this.redirectedTo = path; return this; },
    accepts() { return false; }
  };
}

test('unauthenticated protected requests receive 401', () => {
  const response = mockResponse();
  let continued = false;
  requireAuth({ session: {}, accepts: () => false }, response, () => { continued = true; });
  assert.equal(response.statusCode, 401);
  assert.equal(continued, false);
});

test('authenticated users with an unassigned role receive 403', () => {
  const response = mockResponse();
  let continued = false;
  allowRoles('ADMIN_LSP')({ session: { user: { role: 'ASESI_SISWA' } } }, response, () => { continued = true; });
  assert.equal(response.statusCode, 403);
  assert.equal(response.body, '403 Forbidden');
  assert.equal(continued, false);
});

test('a matching role is allowed through the guard', () => {
  const response = mockResponse();
  let continued = false;
  allowRoles('ASESOR')({ session: { user: { role: 'ASESOR' } } }, response, () => { continued = true; });
  assert.equal(continued, true);
});

test('all portal EJS views compile', () => {
  for (const file of ['views/login.ejs', 'views/portal.ejs', 'views/report.ejs']) {
    assert.doesNotThrow(() => ejs.compile(fs.readFileSync(file, 'utf8'), { filename: file }), file);
  }
});