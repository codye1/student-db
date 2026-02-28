
const idFromPath = (url) => {
  const match = url.match(/^\/students\/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

export default idFromPath;