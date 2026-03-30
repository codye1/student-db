// helpers/csvImport.js
// Імпорт студентів з CSV або JSON
import { parse as parseCsv } from 'csv-parse/sync';

export function parseImportFile(buffer, filename, mimetype) {
  if (mimetype === 'application/json' || filename.endsWith('.json')) {
    return JSON.parse(buffer.toString());
  } else if (mimetype === 'text/csv' || filename.endsWith('.csv')) {
    const records = parseCsv(buffer, { columns: true, skip_empty_lines: true });
    return records.map((item) => {
      if (typeof item.age === 'string') {
        const n = Number(item.age);
        item.age = isNaN(n) ? undefined : n;
      }
      if (typeof item.course === 'string') {
        const n = Number(item.course);
        item.course = isNaN(n) ? undefined : n;
      }
      if (typeof item.grades === 'string') {
        try {
          let arr = JSON.parse(item.grades);
          if (Array.isArray(arr)) {
            item.grades = arr.map(Number);
          } else {
            item.grades = [];
          }
        } catch {
          item.grades = item.grades
            .split(',')
            .map((v) => Number(v.trim()))
            .filter((v) => !isNaN(v));
        }
      }
      return item;
    });
  }
  throw new Error('Unsupported file type');
}
