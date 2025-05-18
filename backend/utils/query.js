// Load the Prisma client
const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

// The query object with user operations
module.exports = {
  user: {
    create: async (firstName, lastName, email, password, admin) => {
      return await prisma.user.create({
        data: {
          firstName,
          lastName,
          email,
          password,
          role: admin ? "ADMIN" : "USER",
        },
      });
    },
    getByEmail: async (email) => {
      return await prisma.user.findUnique({ where: { email } });
    },
    getById: async (id) => {
      return await prisma.user.findUnique({ where: { id } });
    },
    // New Prisma query to update user's first and last name
    updateName: async (id, firstName, lastName) => {
      return await prisma.user.update({
        where: { id },
        data: { firstName, lastName },
      });
    },
    // New Prisma query to update user's password
    updatePassword: async (id, password) => {
      return await prisma.user.update({
        where: { id },
        data: { password },
      });
    },
  },
};
