const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  userType: { type: String, enum: ['vendor', 'supplier'], required: true },
  phone: String,
  location: String,
  businessName: String,
  businessAddress: String,
  businessHours: { type: String, default: '9:00 AM - 6:00 PM' },
  verified: { type: Boolean, default: true },
  rating: { type: Number, default: 4.5 },
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  profilePicture: String
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const saltRounds = 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

// Virtual for full business info
userSchema.virtual('businessInfo').get(function() {
  return {
    name: this.businessName,
    address: this.businessAddress,
    hours: this.businessHours,
    rating: this.rating,
    verified: this.verified
  };
});

module.exports = mongoose.model('User', userSchema);
