await new Promise(resolve => setTimeout(resolve, 0));

const formatName = (name) => {
  return name.trim().toUpperCase();
};

export default {
  formatName
};