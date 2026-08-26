'use strict'
// Single source of truth for fixture-side constants shared by server.js and
// grader.js. Keep every literal here; nothing else may hardcode report names.

const crypto = require('node:crypto')

// Task 3 expected artifact.
const REPORT_FILE = 'sales-report-2026-08.csv'
const REPORT_CONTENT =
  'report,date,value\n' +
  'sales,2026-08-01,1042\n' +
  'sales,2026-08-02,1047\n'

// Deterministic checksum of the only valid artifact content (non-empty).
const REPORT_SHA256 = crypto
  .createHash('sha256')
  .update(REPORT_CONTENT)
  .digest('hex')

module.exports = { REPORT_FILE, REPORT_CONTENT, REPORT_SHA256 }