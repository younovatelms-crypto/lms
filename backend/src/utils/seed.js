// src/utils/seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Batch = require('../models/Batch');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'younovate_lms' });
  console.log('Connected to MongoDB');

  // Clear existing
  await Promise.all([User.deleteMany({}), Batch.deleteMany({})]);
  console.log('Cleared existing data');

  // Create batch
  const batch = await Batch.create({
    name: 'Full Stack Cohort 1',
    description: 'MERN Stack + DevOps',
    startDate: new Date(),
    status: 'active',
    maxStudents: 20,
    course: 'Full Stack Development',
  });

  // Create users
  const users = await User.create([
    {
      name: 'Admin User',
      email: 'admin@younovate.com',
      password: 'Admin@123456',
      role: 'admin',
      isActive: true,
    },
    {
      name: 'Trainer One',
      email: 'trainer1@younovate.com',
      password: 'Trainer@123456',
      role: 'trainer',
      isActive: true,
      expertise: ['React', 'Node.js', 'MongoDB'],
      bio: 'Senior full-stack engineer with 8 years of experience.',
    },
    {
      name: 'Arjun Kumar',
      email: 'arjun@example.com',
      password: 'Trainee@123456',
      role: 'trainee',
      isActive: true,
      batchId: batch._id,
      enrolledAt: new Date(),
    },
    {
      name: 'HR Manager',
      email: 'hr@younovate.com',
      password: 'HR@123456',
      role: 'hr',
      isActive: true,
    },
  ]);

  // Link trainer to batch
  batch.trainerId = users[1]._id;
  await batch.save();

  console.log('\n✅ Seed complete!\n');
  console.log('Demo credentials:');
  console.log('  Admin:   admin@younovate.com   / Admin@123456');
  console.log('  Trainer: trainer1@younovate.com / Trainer@123456');
  console.log('  Trainee: arjun@example.com      / Trainee@123456');
  console.log('  HR:      hr@younovate.com        / HR@123456');

  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
