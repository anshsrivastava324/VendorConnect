const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  priceAtTime: { type: Number, required: true },
  productName: String, // Store name in case product is deleted
  productImage: String
});

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema],
  totalAmount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'], 
    default: 'pending' 
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: String,
  deliveryAddress: String,
  estimatedDelivery: Date,
  actualDelivery: Date,
  notes: String,
  cancelReason: String,
  rating: { type: Number, min: 1, max: 5 },
  review: String,
  trackingNumber: String
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Generate order number before saving
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `VND${Date.now()}${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Virtual for order age
orderSchema.virtual('orderAge').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Method to update status
orderSchema.methods.updateStatus = function(newStatus, notes = '') {
  this.status = newStatus;
  if (notes) this.notes = notes;
  
  if (newStatus === 'delivered') {
    this.actualDelivery = new Date();
  }
  
  return this.save();
};

// Static method to get orders by status
orderSchema.statics.findByStatus = function(status) {
  return this.find({ status }).populate('vendor supplier items.product');
};

// Static method to get vendor's orders
orderSchema.statics.findByVendor = function(vendorId) {
  return this.find({ vendor: vendorId })
    .populate('supplier', 'name businessName')
    .populate('items.product', 'name image')
    .sort({ createdAt: -1 });
};

// Static method to get supplier's orders
orderSchema.statics.findBySupplier = function(supplierId) {
  return this.find({ supplier: supplierId })
    .populate('vendor', 'name location')
    .populate('items.product', 'name image')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('Order', orderSchema);
