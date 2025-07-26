const express = require('express');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { auth, requireUserType } = require('../middleware/auth');

const router = express.Router();

// Get vendor's cart
router.get('/', [
  auth,
  requireUserType('vendor')
], async (req, res) => {
  try {
    let cart = await Cart.findOne({ 
      vendor: req.user._id, 
      status: 'active' 
    }).populate({
      path: 'items.product',
      populate: {
        path: 'supplier',
        select: 'businessName location rating'
      }
    });

    if (!cart) {
      cart = new Cart({ vendor: req.user._id, items: [] });
      await cart.save();
    }

    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add item to cart
router.post('/add', [
  auth,
  requireUserType('vendor')
], async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (!product.inStock) {
      return res.status(400).json({ message: 'Product is out of stock' });
    }

    let cart = await Cart.findOne({ 
      vendor: req.user._id, 
      status: 'active' 
    });

    if (!cart) {
      cart = new Cart({ vendor: req.user._id, items: [] });
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
        quantity: Math.max(quantity, product.minOrder),
        priceAtTime: product.price
      });
    }

    await cart.save();
    await cart.populate({
      path: 'items.product',
      populate: {
        path: 'supplier',
        select: 'businessName location rating'
      }
    });

    res.json({
      message: 'Item added to cart',
      cart
    });

  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update cart item quantity
router.put('/update/:itemId', [
  auth,
  requireUserType('vendor')
], async (req, res) => {
  try {
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }

    const cart = await Cart.findOne({ 
      vendor: req.user._id, 
      status: 'active' 
    });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(
      item => item._id.toString() === req.params.itemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    await cart.populate({
      path: 'items.product',
      populate: {
        path: 'supplier',
        select: 'businessName location rating'
      }
    });

    res.json({
      message: 'Cart updated',
      cart
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove item from cart
router.delete('/remove/:itemId', [
  auth,
  requireUserType('vendor')
], async (req, res) => {
  try {
    const cart = await Cart.findOne({ 
      vendor: req.user._id, 
      status: 'active' 
    });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.items = cart.items.filter(
      item => item._id.toString() !== req.params.itemId
    );

    await cart.save();
    await cart.populate({
      path: 'items.product',
      populate: {
        path: 'supplier',
        select: 'businessName location rating'
      }
    });

    res.json({
      message: 'Item removed from cart',
      cart
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Clear cart
router.delete('/clear', [
  auth,
  requireUserType('vendor')
], async (req, res) => {
  try {
    const cart = await Cart.findOne({ 
      vendor: req.user._id, 
      status: 'active' 
    });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.items = [];
    await cart.save();

    res.json({
      message: 'Cart cleared',
      cart
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Place order (convert cart to order)
router.post('/checkout', [
  auth,
  requireUserType('vendor')
], async (req, res) => {
  try {
    const cart = await Cart.findOne({ 
      vendor: req.user._id, 
      status: 'active' 
    }).populate('items.product');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Update cart status to ordered
    cart.status = 'ordered';
    await cart.save();

    // Create a new empty cart for the vendor
    const newCart = new Cart({ vendor: req.user._id, items: [] });
    await newCart.save();

    res.json({
      message: 'Order placed successfully',
      orderId: cart._id,
      totalAmount: cart.totalAmount
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
