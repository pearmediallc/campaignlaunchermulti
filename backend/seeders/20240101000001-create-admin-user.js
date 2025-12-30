'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if admin user already exists
    const [existingUsers] = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE email = 'admin@example.com'"
    );

    if (existingUsers.length > 0) {
      console.log('Admin user already exists, skipping...');
      return;
    }

    // Create default admin user
    const hashedPassword = await bcrypt.hash('admin123456', 10);

    await queryInterface.bulkInsert('users', [{
      email: 'admin@example.com',
      password: hashedPassword,
      first_name: 'Admin',
      last_name: 'User',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }], {});

    // Get the admin user and super_admin role
    const [users] = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE email = 'admin@example.com'"
    );
    const [roles] = await queryInterface.sequelize.query(
      "SELECT id FROM roles WHERE name = 'super_admin'"
    );

    if (users.length > 0 && roles.length > 0) {
      // Check if role assignment already exists
      const [existingRoles] = await queryInterface.sequelize.query(
        `SELECT id FROM user_roles WHERE user_id = ${users[0].id} AND role_id = ${roles[0].id}`
      );

      if (existingRoles.length === 0) {
        await queryInterface.bulkInsert('user_roles', [{
          user_id: users[0].id,
          role_id: roles[0].id,
          assigned_at: new Date()
        }], {});
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('user_roles', null, {});
    await queryInterface.bulkDelete('users', { email: 'admin@example.com' }, {});
  }
};