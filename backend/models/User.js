const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  userType: {
    type: String,
    enum: ['vendor', 'supplier'],
    required: true
  },
  businessName: {
    type: String,
    required: function() {
      return this.userType === 'supplier';
    }
  },
  location: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  businessAddress: {
    type: String,
    required: function() {
      return this.userType === 'supplier';
    }
  },
  businessHours: {
    type: String,
    default: '9:00 AM - 6:00 PM'
  },
  rating: {
    type: Number,
    default: 4.0,
    min: 0,
    max: 5
  },
  verified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
