const mongoose = require('mongoose');

// Function to connect to Mongoose and export the connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`database CampusKart Connected: ${conn.connection.host}`);
    
    // Seed Admin User
    const User = require('../models/user.model');
    const bcrypt = require('bcryptjs');
    const adminEmail = 'admin@iitp.ac.in';
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('Admin@123', 10);
      await User.create({
        name: 'Super Admin',
        email: adminEmail,
        password: hashedPassword,
        isVerified: true,
        role: 'admin'
      });
      console.log('Admin user seeded: admin@iitp.ac.in / Admin@123');
    }

  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

connectDB();

module.exports = mongoose;
