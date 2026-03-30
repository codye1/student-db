// helpers/csvImport.js
// Імпорт студентів з CSV або JSON
import { parse as parseCsv } from 'csv-parse/sync';

export function parseImportFile(buffer, filename, mimetype) {
  if (mimetype === 'application/json' || filename.endsWith('.json')) {
    return JSON.parse(buffer.toString());
  } else if (mimetype === 'text/csv' || filename.endsWith('.csv')) {
    return parseCsv(buffer, { columns: true, skip_empty_lines: true });
  }
  throw new Error('Unsupported file type');
}
