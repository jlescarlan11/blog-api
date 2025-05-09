// Load the Prisma client
const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

// The query object with user operations
module.exports = {
  user: {
    create: async (firstName, lastName, email, password) => {
      return await prisma.user.create({
        data: { firstName, lastName, email, password },
      });
    },
    getByEmail: async (email) => {
      return await prisma.user.findUnique({ where: { email } });
    },
    getById: async (id) => {
      return await prisma.user.findUnique({ where: { id } });
    },
  },
};
