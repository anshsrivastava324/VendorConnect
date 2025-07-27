const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true },
  minOrder: { type: Number, required: true, min: 1 },
  category: { 
    type: String, 
    required: true,
    enum: ['vegetables', 'spices', 'seafood', 'grains', 'dairy', 'meat', 'other']
  },
  stockQuantity: { type: Number, required: true, min: 0 },
  image: { type: String, default: '🍽️' },
  description: String,
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  inStock: { type: Boolean, default: true },
  featured: { type: Boolean, default: false },
  tags: [String],
  nutritionInfo: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number
  },
  shelfLife: String,
  origin: String,
  certifications: [String] // organic, halal, etc.
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1, inStock: 1 });
productSchema.index({ supplier: 1 });
productSchema.index({ featured: 1 });

// Virtual for price per gram (for comparison)
productSchema.virtual('pricePerGram').get(function() {
  if (this.unit === 'kg') return this.price / 1000;
  if (this.unit === 'gram') return this.price;
  return null;
});

// Update inStock based on stockQuantity
productSchema.pre('save', function(next) {
  this.inStock = this.stockQuantity > 0;
  next();
});

// Static method to find by category
productSchema.statics.findByCategory = function(category) {
  return this.find({ category, inStock: true }).populate('supplier');
};

// Static method to find featured products
productSchema.statics.findFeatured = function() {
  return this.find({ featured: true, inStock: true }).populate('supplier');
};

module.exports = mongoose.model('Product', productSchema);
