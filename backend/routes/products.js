const express = require('express');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const User = require('../models/User');
const { auth, requireUserType } = require('../middleware/auth');

const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
  try {
    const { category, supplier, search } = req.query;
    let filter = { inStock: true };

    if (category) filter.category = category;
    if (supplier) filter.supplier = supplier;
    if (search) {
      filter.$text = { $search: search };
    }

    const products = await Product.find(filter)
      .populate('supplier', 'businessName location rating verified')
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get products by supplier
router.get('/supplier/:supplierId', async (req, res) => {
  try {
    const products = await Product.find({ 
      supplier: req.params.supplierId,
      inStock: true 
    }).populate('supplier', 'businessName location rating verified');

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add new product (suppliers only)
router.post('/', [
  auth,
  requireUserType('supplier'),
  body('name').trim().isLength({ min: 2 }).withMessage('Product name is required'),
  body('price').isNumeric().withMessage('Price must be a number'),
  body('unit').isIn(['kg', 'gram', 'piece', 'liter', 'dozen']).withMessage('Invalid unit'),
  body('minOrder').isInt({ min: 1 }).withMessage('Minimum order must be at least 1')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, price, unit, minOrder, description, category, image, stockQuantity } = req.body;

    const product = new Product({
      name,
      price,
      unit,
      minOrder,
      description,
      category,
      image: image || '🍽️',
      stockQuantity: stockQuantity || 100,
      supplier: req.user._id
    });

    await product.save();
    await product.populate('supplier', 'businessName location rating verified');

    res.status(201).json({
      message: 'Product added successfully',
      product
    });

  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update product (suppliers only)
router.put('/:id', [
  auth,
  requireUserType('supplier')
], async (req, res) => {
  try {
    const product = await Product.findOne({ 
      _id: req.params.id, 
      supplier: req.user._id 
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const allowedUpdates = ['name', 'price', 'unit', 'minOrder', 'description', 'category', 'image', 'stockQuantity', 'inStock'];
    const updates = Object.keys(req.body);
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ message: 'Invalid updates' });
    }

    updates.forEach(update => product[update] = req.body[update]);
    await product.save();

    res.json({
      message: 'Product updated successfully',
      product
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete product (suppliers only)
router.delete('/:id', [
  auth,
  requireUserType('supplier')
], async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ 
      _id: req.params.id, 
      supplier: req.user._id 
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get my products (suppliers only)
router.get('/my-products', [
  auth,
  requireUserType('supplier')
], async (req, res) => {
  try {
    const products = await Product.find({ supplier: req.user._id })
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
