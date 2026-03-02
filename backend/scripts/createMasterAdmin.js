// File: scripts/createMasterAdmin.js
const mongoose = require('mongoose');
const Admin = require('../models/Admin.model');
require('dotenv').config();

const createMasterAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const masterAdmin = await Admin.create({
      name: 'Master Admin',
      email: 'admin@dealcross.net',
      password: 'MasterAdmin123!',
      role: 'master',
      status: 'active',
      permissions: {
        viewTransactions: true,
        manageDisputes: true,
        verifyUsers: true,
        viewAnalytics: true,
        managePayments: true,
        manageAPI: true,
        manageAdmins: true,
        manageFees: true,       // ✅ Added
        manageSettings: true    // ✅ Added
      }
    });

    console.log('✅ Master admin created successfully');
    console.log('Email:', masterAdmin.email);
    console.log('Password: MasterAdmin123!');
    console.log('⚠️  CHANGE PASSWORD IMMEDIATELY AFTER FIRST LOGIN');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

createMasterAdmin();
