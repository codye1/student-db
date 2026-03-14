const userRepository = require('../repositories/user.repository');

const getFormatter = async () => (await import('../utils/formatter.mjs')).default;

const rolesMap = require('../data/roles.json');

const getPublicUsers = async () => {
  const users = await userRepository.findAll();
  const formatter = await getFormatter();

  return users.map(u => ({
    id: u.id,
    name: formatter.formatName(u.name),
    roleName: rolesMap[u.id] || 'Unknown'
  }));
};

const getUserFormatted = async (id, reply) => {
  const formatter = await getFormatter();
  const user = await userRepository.findById(id);

  if (!user) {
    return reply.status(404).send({ error: 'User not found' });
  }

  return {
    user: {
      ...user,
      name: formatter.formatName(user.name),
      roleName: rolesMap[user.id] || 'Unknown'
    }
  };
};

module.exports = {
  getPublicUsers,
  getUserFormatted
};
