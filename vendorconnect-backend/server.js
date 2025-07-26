const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vendorconnect', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  userType: { type: String, enum: ['vendor', 'supplier'], required: true },
  phone: String,
  location: String,
  businessName: String,
  businessAddress: String,
  businessHours: String,
  verified: { type: Boolean, default: false },
  rating: { type: Number, default: 4.5 }
}, { timestamps: true });

// Product Schema
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

// Cart Schema
const cartSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    priceAtTime: { type: Number, required: true }
  }],
  totalAmount: { type: Number, default: 0 }
}, { timestamps: true });

// Order Schema
const orderSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    priceAtTime: { type: Number, required: true }
  }],
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'processing', 'delivered', 'cancelled'], default: 'pending' }
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
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, userType, phone, location, businessName, businessAddress } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      userType,
      phone,
      location,
      businessName: userType === 'supplier' ? businessName : undefined,
      businessAddress: userType === 'supplier' ? businessAddress : undefined
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, userType: user.userType },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
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
        businessAddress: user.businessAddress
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, userType: user.userType },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
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
        businessAddress: user.businessAddress
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
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
    res.status(500).json({ message: 'Server error fetching products' });
  }
});

app.post('/api/products', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'supplier') {
      return res.status(403).json({ message: 'Only suppliers can add products' });
    }

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

    res.status(201).json(populatedProduct);
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ message: 'Server error adding product' });
  }
});

app.get('/api/products/my-products', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'supplier') {
      return res.status(403).json({ message: 'Only suppliers can view their products' });
    }

    const products = await Product.find({ supplier: req.user.userId })
      .populate('supplier', 'name businessName location rating verified')
      .exec();

    res.json(products);
  } catch (error) {
    console.error('Error fetching supplier products:', error);
    res.status(500).json({ message: 'Server error fetching products' });
  }
});

app.delete('/api/products/:id', authenticateToken, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.supplier.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this product' });
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Server error deleting product' });
  }
});

// Cart Routes (MongoDB-based)
app.get('/api/cart', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'vendor') {
      return res.status(403).json({ message: 'Only vendors can access cart' });
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

    res.json(cart);
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ message: 'Server error fetching cart' });
  }
});

app.post('/api/cart/add', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'vendor') {
      return res.status(403).json({ message: 'Only vendors can add to cart' });
    }

    const { productId, quantity = 1 } = req.body;

    // Find the product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (!product.inStock || product.stockQuantity < quantity) {
      return res.status(400).json({ message: 'Product not available in requested quantity' });
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
    } else {
      // Add new item
      cart.items.push({
        product: productId,
        quantity,
        priceAtTime: product.price
      });
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

    res.json({ message: 'Item added to cart successfully', cart });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ message: 'Server error adding to cart' });
  }
});

app.delete('/api/cart/remove/:itemId', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'vendor') {
      return res.status(403).json({ message: 'Only vendors can modify cart' });
    }

    const cart = await Cart.findOne({ vendor: req.user.userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

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

    res.json({ message: 'Item removed from cart successfully', cart });
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({ message: 'Server error removing from cart' });
  }
});

app.post('/api/cart/checkout', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'vendor') {
      return res.status(403).json({ message: 'Only vendors can checkout' });
    }

    const cart = await Cart.findOne({ vendor: req.user.userId })
      .populate('items.product')
      .exec();

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Create order
    const order = new Order({
      vendor: req.user.userId,
      items: cart.items.map(item => ({
        product: item.product._id,
        quantity: item.quantity,
        priceAtTime: item.priceAtTime
      })),
      totalAmount: cart.totalAmount,
      status: 'pending'
    });

    await order.save();

    // Clear cart
    cart.items = [];
    cart.totalAmount = 0;
    await cart.save();

    res.json({
      message: 'Order placed successfully',
      orderId: order._id,
      order
    });
  } catch (error) {
    console.error('Error during checkout:', error);
    res.status(500).json({ message: 'Server error during checkout' });
  }
});

// Clear entire cart
app.delete('/api/cart/clear', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'vendor') {
      return res.status(403).json({ message: 'Only vendors can clear cart' });
    }

    const cart = await Cart.findOne({ vendor: req.user.userId });
    if (cart) {
      cart.items = [];
      cart.totalAmount = 0;
      await cart.save();
    }

    res.json({ message: 'Cart cleared successfully' });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ message: 'Server error clearing cart' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
