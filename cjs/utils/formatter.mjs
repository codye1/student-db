await new Promise(resolve => setTimeout(resolve, 0));

export const formatName = (name) => {
  return name.trim().toUpperCase();
};
