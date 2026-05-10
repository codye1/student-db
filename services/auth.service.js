export const createAuthService = ({ usersRepository, argon2 }) => {
  const register = async ({ email, password }) => {
    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await usersRepository.findByEmail(normalizedEmail);
    if (existing) {
      const error = new Error('Email already exists');
      error.statusCode = 409;
      throw error;
    }

    const passwordHash = await argon2.hash(password);
    const created = await usersRepository.create({
      email: normalizedEmail,
      password: passwordHash,
    });

    return { id: created.id, email: created.email };
  };

  const login = async ({ email, password }) => {
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await usersRepository.findByEmail(normalizedEmail);
    if (!user) return null;

    const isValid = await argon2.verify(user.password, password);
    if (!isValid) return null;

    return { id: user.id, email: user.email };
  };

  return {
    register,
    login,
  };
};
