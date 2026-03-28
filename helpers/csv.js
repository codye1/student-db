import { stringify } from 'csv-stringify/sync';

export function studentsToCsv(items, getImageUrl) {
  // getImageUrl(item) — функція для формування повного URL зображення
  return stringify(
    items.map((item) => ({
      ...item,
      image: item.image ? getImageUrl(item) : '',
    })),
    { header: true }
  );
}
