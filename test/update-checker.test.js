'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { compareVersions, normalizeVersion } = require('../lib/update-checker');

test('normalizeVersion removes release tag prefixes and metadata', () => {
  assert.equal(normalizeVersion('v1.2.3-beta+build'), '1.2.3');
});

test('compareVersions compares semantic version numbers', () => {
  assert.equal(compareVersions('1.2.4', '1.2.3'), 1);
  assert.equal(compareVersions('1.2.3', '1.2.4'), -1);
  assert.equal(compareVersions('1.2.3', 'v1.2.3'), 0);
});
