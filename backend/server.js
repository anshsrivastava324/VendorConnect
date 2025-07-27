const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:8000', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

// MongoDB Connection Function
const connectDB = async () => {
  try {
    console.log('🔄 Attempting to connect to MongoDB Atlas...');
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      maxPoolSize: 10
    });

    console.log(`✅ MongoDB Connected Successfully!`);
    console.log(`📍 Database: ${conn.connection.name}`);
    console.log(`🌐 Host: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('💡 Please check:');
    console.error('   1. Your MongoDB Atlas connection string');
    console.error('   2. Network access settings (IP whitelist)');
    console.error('   3. Database user credentials');
    process.exit(1);
  }
};

// Connect to MongoDB
connectDB();

// Connection event listeners
mongoose.connection.on('connected', () => {
  console.log('📡 Mongoose connected to MongoDB Atlas');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('📡 Mongoose disconnected');
});

// Schemas
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
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  unit: { type: String, required: true },
  minOrder: { type: Number, required: true },
  category: { type: String, required: true },
  stockQuantity: { type: Number, required: true },
  image: { type: String, default: '🍽️' },
  description: String,
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  inStock: { type: Boolean, default: true }
}, { timestamps: true });

const cartSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    priceAtTime: { type: Number, required: true }
  }],
  totalAmount: { type: Number, default: 0 }
}, { timestamps: true });

const orderSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    priceAtTime: { type: Number, required: true }
  }],
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'processing', 'delivered', 'cancelled'], default: 'pending' },
  orderDate: { type: Date, default: Date.now }
}, { timestamps: true });

// Models
const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Cart = mongoose.model('Cart', cartSchema);
const Order = mongoose.model('Order', orderSchema);

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: 'Access token required' 
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      console.log('Token verification error:', err);
      return res.status(403).json({ 
        success: false,
        message: 'Invalid or expired token' 
      });
    }
    req.user = user;
    next();
  });
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, userType, phone, location, businessName, businessAddress } = req.body;

    console.log('Registration attempt:', { email, userType, name });

    // Validation
    if (!name || !email || !password || !userType) {
      return res.status(400).json({ 
        success: false,
        message: 'Name, email, password, and user type are required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'User already exists with this email' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const userData = {
      name,
      email,
      password: hashedPassword,
      userType,
      phone,
      location
    };

    if (userType === 'supplier') {
      userData.businessName = businessName;
      userData.businessAddress = businessAddress;
    }

    const user = new User(userData);
    await user.save();

    console.log('User created successfully:', user._id);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, userType: user.userType },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        phone: user.phone,
        location: user.location,
        businessName: user.businessName,
        businessAddress: user.businessAddress,
        verified: user.verified,
        rating: user.rating
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during registration' 
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt:', email);

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    console.log('Login successful for user:', user._id);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, userType: user.userType },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        phone: user.phone,
        location: user.location,
        businessName: user.businessName,
        businessAddress: user.businessAddress,
        verified: user.verified,
        rating: user.rating
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during login' 
    });
  }
});

// Product Routes
app.get('/api/products', async (req, res) => {
  try {
    const { search, category, location } = req.query;
    let query = {};

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    if (category) {
      query.category = category;
    }

    const products = await Product.find(query)
      .populate('supplier', 'name businessName location rating verified')
      .exec();

    let filteredProducts = products;

    if (location) {
      filteredProducts = products.filter(product => 
        product.supplier.location && 
        product.supplier.location.toLowerCase().includes(location.toLowerCase())
      );
    }

    res.json(filteredProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching products' 
    });
  }
});

app.post('/api/products', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'supplier') {
      return res.status(403).json({ 
        success: false,
        message: 'Only suppliers can add products' 
      });
    }

    console.log('Adding product for supplier:', req.user.userId);

    const productData = {
      ...req.body,
      supplier: req.user.userId,
      inStock: req.body.stockQuantity > 0
    };

    const product = new Product(productData);
    await product.save();

    const populatedProduct = await Product.findById(product._id)
      .populate('supplier', 'name businessName location rating verified')
      .exec();

    console.log('Product added successfully:', product._id);

    res.status(201).json({
      success: true,
      message: 'Product added successfully',
      product: populatedProduct
    });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error adding product' 
    });
  }
});

app.get('/api/products/my-products', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'supplier') {
      return res.status(403).json({ 
        success: false,
        message: 'Only suppliers can view their products' 
      });
    }

    const products = await Product.find({ supplier: req.user.userId })
      .populate('supplier', 'name businessName location rating verified')
      .exec();

    console.log(`Found ${products.length} products for supplier:`, req.user.userId);

    res.json(products);
  } catch (error) {
    console.error('Error fetching supplier products:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching products' 
    });
  }
});

app.delete('/api/products/:id', authenticateToken, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: 'Product not found' 
      });
    }

    if (product.supplier.toString() !== req.user.userId) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to delete this product' 
      });
    }

    await Product.findByIdAndDelete(req.params.id);
    console.log('Product deleted:', req.params.id);
    
    res.json({ 
      success: true,
      message: 'Product deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error deleting product' 
    });
  }
});

// Cart Routes (Database-based for cross-device access)
app.get('/api/cart', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'vendor') {
      return res.status(403).json({ 
        success: false,
        message: 'Only vendors can access cart' 
      });
    }

    let cart = await Cart.findOne({ vendor: req.user.userId })
      .populate({
        path: 'items.product',
        populate: {
          path: 'supplier',
          select: 'name businessName location rating verified'
        }
      })
      .exec();

    if (!cart) {
      cart = new Cart({ vendor: req.user.userId, items: [], totalAmount: 0 });
      await cart.save();
    }

    console.log(`Cart loaded for vendor ${req.user.userId}: ${cart.items.length} items`);

    res.json(cart);
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching cart' 
    });
  }
});

app.post('/api/cart/add', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'vendor') {
      return res.status(403).json({ 
        success: false,
        message: 'Only vendors can add to cart' 
      });
    }

    const { productId, quantity = 1 } = req.body;

    console.log(`Adding to cart: product ${productId}, quantity ${quantity} for vendor ${req.user.userId}`);

    // Find the product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: 'Product not found' 
      });
    }

    if (!product.inStock || product.stockQuantity < quantity) {
      return res.status(400).json({ 
        success: false,
        message: 'Product not available in requested quantity' 
      });
    }

    // Find or create cart
    let cart = await Cart.findOne({ vendor: req.user.userId });
    if (!cart) {
      cart = new Cart({ vendor: req.user.userId, items: [], totalAmount: 0 });
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (existingItemIndex > -1) {
      // Update quantity
      cart.items[existingItemIndex].quantity += quantity;
      console.log('Updated existing item quantity');
    } else {
      // Add new item
      cart.items.push({
        product: productId,
        quantity,
        priceAtTime: product.price
      });
      console.log('Added new item to cart');
    }

    // Calculate total amount
    await cart.populate({
      path: 'items.product',
      select: 'price'
    });

    cart.totalAmount = cart.items.reduce((total, item) => {
      return total + (item.priceAtTime * item.quantity);
    }, 0);

    await cart.save();

    // Populate cart for response
    await cart.populate({
      path: 'items.product',
      populate: {
        path: 'supplier',
        select: 'name businessName location rating verified'
      }
    });

    console.log('Cart updated successfully');

    res.json({ 
      success: true,
      message: 'Item added to cart successfully', 
      cart 
    });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error adding to cart' 
    });
  }
});

app.delete('/api/cart/remove/:itemId', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'vendor') {
      return res.status(403).json({ 
        success: false,
        message: 'Only vendors can modify cart' 
      });
    }

    const cart = await Cart.findOne({ vendor: req.user.userId });
    if (!cart) {
      return res.status(404).json({ 
        success: false,
        message: 'Cart not found' 
      });
    }

    console.log(`Removing item ${req.params.itemId} from cart`);

    // Remove item from cart
    cart.items = cart.items.filter(item => item._id.toString() !== req.params.itemId);

    // Recalculate total
    await cart.populate({
      path: 'items.product',
      select: 'price'
    });

    cart.totalAmount = cart.items.reduce((total, item) => {
      return total + (item.priceAtTime * item.quantity);
    }, 0);

    await cart.save();

    console.log('Item removed from cart successfully');

    res.json({ 
      success: true,
      message: 'Item removed from cart successfully', 
      cart 
    });
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error removing from cart' 
    });
  }
});

app.post('/api/cart/checkout', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'vendor') {
      return res.status(403).json({ 
        success: false,
        message: 'Only vendors can checkout' 
      });
    }

    const cart = await Cart.findOne({ vendor: req.user.userId })
      .populate('items.product')
      .exec();

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Cart is empty' 
      });
    }

    console.log(`Processing checkout for vendor ${req.user.userId}`);

    // Group items by supplier
    const supplierGroups = {};
    cart.items.forEach(item => {
      const supplierId = item.product.supplier.toString();
      if (!supplierGroups[supplierId]) {
        supplierGroups[supplierId] = {
          supplier: supplierId,
          items: [],
          totalAmount: 0
        };
      }
      supplierGroups[supplierId].items.push(item);
      supplierGroups[supplierId].totalAmount += item.priceAtTime * item.quantity;
    });

    // Create orders for each supplier
    const orders = [];
    for (const group of Object.values(supplierGroups)) {
      const order = new Order({
        vendor: req.user.userId,
        supplier: group.supplier,
        items: group.items.map(item => ({
          product: item.product._id,
          quantity: item.quantity,
          priceAtTime: item.priceAtTime
        })),
        totalAmount: group.totalAmount,
        status: 'pending'
      });

      await order.save();
      orders.push(order);
    }

    // Clear cart
    cart.items = [];
    cart.totalAmount = 0;
    await cart.save();

    console.log(`Checkout completed: ${orders.length} orders created`);

    res.json({
      success: true,
      message: 'Orders placed successfully',
      orders: orders.map(order => ({
        orderId: order._id,
        supplier: order.supplier,
        totalAmount: order.totalAmount,
        status: order.status
      }))
    });
  } catch (error) {
    console.error('Error during checkout:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during checkout' 
    });
  }
});

// Order Routes
app.get('/api/orders/vendor', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'vendor') {
      return res.status(403).json({ 
        success: false,
        message: 'Only vendors can view their orders' 
      });
    }

    const orders = await Order.find({ vendor: req.user.userId })
      .populate('supplier', 'name businessName')
      .populate('items.product', 'name image')
      .sort({ createdAt: -1 })
      .exec();

    res.json(orders);
  } catch (error) {
    console.error('Error fetching vendor orders:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching orders' 
    });
  }
});

app.get('/api/orders/supplier', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'supplier') {
      return res.status(403).json({ 
        success: false,
        message: 'Only suppliers can view their orders' 
      });
    }

    const orders = await Order.find({ supplier: req.user.userId })
      .populate('vendor', 'name location')
      .populate('items.product', 'name image')
      .sort({ createdAt: -1 })
      .exec();

    res.json(orders);
  } catch (error) {
    console.error('Error fetching supplier orders:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching orders' 
    });
  }
});

// Profile Routes
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching profile' 
    });
  }
});

app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const updateData = { ...req.body };
    delete updateData.password; // Don't allow password updates through this route

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    console.log('Profile updated for user:', req.user.userId);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error updating profile' 
    });
  }
});

// Clear entire cart
app.delete('/api/cart/clear', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'vendor') {
      return res.status(403).json({ 
        success: false,
        message: 'Only vendors can clear cart' 
      });
    }

    const cart = await Cart.findOne({ vendor: req.user.userId });
    if (cart) {
      cart.items = [];
      cart.totalAmount = 0;
      await cart.save();
    }

    res.json({ 
      success: true,
      message: 'Cart cleared successfully' 
    });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error clearing cart' 
    });
  }
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true,
    status: 'OK', 
    message: 'VendorConnect API is running',
    timestamp: new Date().toISOString()
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to VendorConnect API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      cart: '/api/cart',
      orders: '/api/orders',
      profile: '/api/profile',
      health: '/api/health'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down server...');
  await mongoose.connection.close();
  console.log('📡 MongoDB connection closed');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 API URL: http://localhost:${PORT}`);
  console.log(`💡 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
