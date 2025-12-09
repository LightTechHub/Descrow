// createAdmin.js - Direct admin creation
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createMasterAdmin() {
  try {
    // Connect to your Railway MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dealcross');
    console.log('✅ Connected to MongoDB');
    
    // Define Admin model (simple version)
    const adminSchema = new mongoose.Schema({
      name: String,
      email: { type: String, unique: true },
      password: String,
      role: String,
      permissions: Object,
      status: String
    });
    
    // Hash password function
    const hashPassword = async (password) => {
      const salt = await bcrypt.genSalt(10);
      return await bcrypt.hash(password, salt);
    };
    
    const Admin = mongoose.model('Admin', adminSchema);
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'admin@dealcross.com' });
    if (existingAdmin) {
      console.log('⚠️ Admin already exists:', existingAdmin.email);
      console.log('You can reset password if needed');
      process.exit(0);
    }
    
    // Create master admin
    const hashedPassword = await hashPassword('Admin123!@#');
    
    const masterAdmin = new Admin({
      name: 'Master Administrator',
      email: 'admin@dealcross.com',
      password: hashedPassword,
      role: 'master',
      permissions: {
        viewTransactions: true,
        manageDisputes: true,
        verifyUsers: true,
        viewAnalytics: true,
        managePayments: true,
        manageAPI: true,
        manageAdmins: true,
        manageFees: true
      },
      status: 'active'
    });
    
    await masterAdmin.save();
    
    console.log('=============================================');
    console.log('✅ MASTER ADMIN CREATED SUCCESSFULLY!');
    console.log('=============================================');
    console.log('📧 Email: admin@dealcross.com');
    console.log('🔑 Password: Admin123!@#');
    console.log('👑 Role: Master Admin');
    console.log('=============================================');
    console.log('⚠️ IMPORTANT: Change password after first login!');
    console.log('=============================================');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  }
}

createMasterAdmin();
