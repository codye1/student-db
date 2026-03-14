const idFromPath = (url) => {
  const match = url.match(/^\/students\/([^/]+)$/);
  return match ? match[1] : null;
};

export default idFromPath;
