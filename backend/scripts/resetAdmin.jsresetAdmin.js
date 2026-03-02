// scripts/resetAdmin.js
// Run with: node scripts/resetAdmin.js
// DELETE THIS FILE after use

require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin.model');

const resetAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Delete ALL existing admin documents (including the broken one with double dot)
    const deleted = await Admin.deleteMany({});
    console.log(`🗑️  Deleted ${deleted.deletedCount} admin(s)`);

    // Create fresh master admin with correct email
    const masterAdmin = await Admin.create({
      name: 'Master Admin',
      email: 'admin@dealcross.net',
      password: 'MasterAdmin123!',
      role: 'master',
      status: 'active',
      isActive: true,
      permissions: {
        viewTransactions: true,
        manageDisputes: true,
        verifyUsers: true,
        viewAnalytics: true,
        managePayments: true,
        manageAPI: true,
        manageAdmins: true,
        manageFees: true,
        manageSettings: true
      }
    });

    console.log('✅ Master admin created successfully');
    console.log('📧 Email:   ', masterAdmin.email);
    console.log('🔑 Password: MasterAdmin123!');
    console.log('⚠️  CHANGE PASSWORD IMMEDIATELY AFTER FIRST LOGIN');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

resetAdmin();
