// helpers/imageUrl.js
// Формування повного URL для зображення студента
export function getImageUrl(item, req) {
  if (!item.image) return null;
  return `${req.protocol}://${req.hostname}/uploads${item.image}`;
}
