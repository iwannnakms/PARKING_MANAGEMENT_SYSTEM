const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./backend/models/User');
const Spot = require('./backend/models/Spot');
const Booking = require('./backend/models/Booking');

// Replace with your MongoDB connection string or use environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/parking_db';

async function seedDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Wipe the database
    await User.deleteMany({});
    await Spot.deleteMany({});
    await Booking.deleteMany({});
    console.log('Cleared existing data');

    // Hash passwords
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('admin123', salt);
    const guardPassword = await bcrypt.hash('guard123', salt);

    // Initialize Admin
    const admin = new User({
      name: 'Admin User',
      email: 'admin@system.com',
      password: adminPassword,
      role: 'admin',
    });
    await admin.save();
    console.log('Admin user created');

    // Initialize Guard
    const guard = new User({
      name: 'Security Guard',
      email: 'guard@system.com',
      password: guardPassword,
      role: 'guard',
    });
    await guard.save();
    console.log('Guard user created');

    // Initialize 50 Parking Spots
    const spots = [];
    for (let i = 1; i <= 50; i++) {
      spots.push({
        spotNumber: `A${i.toString().padStart(2, '0')}`,
        status: 'Available',
      });
    }
    await Spot.insertMany(spots);
    console.log('50 Parking spots created');

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding the database:', error);
    process.exit(1);
  }
}

seedDB();
