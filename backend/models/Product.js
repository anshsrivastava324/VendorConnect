const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    enum: ['kg', 'gram', 'piece', 'liter', 'dozen']
  },
  minOrder: {
    type: Number,
    required: true,
    min: 1
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['vegetables', 'spices', 'seafood', 'grains', 'dairy', 'meat', 'other'],
    default: 'other'
  },
  image: {
    type: String,
    default: '🍽️'
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  inStock: {
    type: Boolean,
    default: true
  },
  stockQuantity: {
    type: Number,
    default: 100
  }
}, {
  timestamps: true
});

// Index for better search performance
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ supplier: 1 });
productSchema.index({ category: 1 });

module.exports = mongoose.model('Product', productSchema);
