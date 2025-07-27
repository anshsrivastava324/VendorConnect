const express = require('express');
const Product = require('../models/Product');
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get all products with filters and pagination
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { 
      search, 
      category, 
      location, 
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      featured
    } = req.query;

    let query = { inStock: true };

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    // Featured filter
    if (featured === 'true') {
      query.featured = true;
    }

    // Build aggregation pipeline
    const pipeline = [
      {
        $lookup: {
          from: 'users',
          localField: 'supplier',
          foreignField: '_id',
          as: 'supplier'
        }
      },
      {
        $unwind: '$supplier'
      },
      {
        $match: query
      }
    ];

    // Location filter (applied after supplier lookup)
    if (location) {
      pipeline.push({
        $match: {
          'supplier.location': { $regex: location, $options: 'i' }
        }
      });
    }

    // Sort
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;
    pipeline.push({ $sort: sortObj });

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: parseInt(limit) });

    // Project fields
    pipeline.push({
      $project: {
        name: 1,
        price: 1,
        unit: 1,
        minOrder: 1,
        category: 1,
        stockQuantity: 1,
        image: 1,
        description: 1,
        inStock: 1,
        featured: 1,
        tags: 1,
        createdAt: 1,
        'supplier._id': 1,
        'supplier.name': 1,
        'supplier.businessName': 1,
        'supplier.location': 1,
        'supplier.rating': 1,
        'supplier.verified': 1
      }
    });

    const products = await Product.aggregate(pipeline);

    // Get total count for pagination
    const totalQuery = Product.find(query).populate('supplier');
    if (location) {
      totalQuery.where('supplier.location').regex(location, 'i');
    }
    const total = await totalQuery.countDocuments();

    res.json({
      success: true,
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalProducts: total,
        hasNext: skip + products.length < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching products' 
    });
  }
});

// Get single product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('supplier', 'name businessName location rating verified businessHours');

    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: 'Product not found' 
      });
    }

    res.json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching product' 
    });
  }
});

// Add new product (suppliers only)
router.post('/', authenticateToken, requireRole('supplier'), async (req, res) => {
  try {
    console.log('Adding product for supplier:', req.user.userId);

    const productData = {
      ...req.body,
      supplier: req.user.userId
    };

    const product = new Product(productData);
    await product.save();

    const populatedProduct = await Product.findById(product._id)
      .populate('supplier', 'name businessName location rating verified');

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

// Get supplier's products
router.get('/my/products', authenticateToken, requireRole('supplier'), async (req, res) => {
  try {
    const { page = 1, limit = 20, category, inStock } = req.query;

    let query = { supplier: req.user.userId };

    if (category) query.category = category;
    if (inStock !== undefined) query.inStock = inStock === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find(query)
      .populate('supplier', 'name businessName location rating verified')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(query);

    console.log(`Found ${products.length} products for supplier:`, req.user.userId);

    res.json({
      success: true,
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalProducts: total
      }
    });
  } catch (error) {
    console.error('Error fetching supplier products:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching products' 
    });
  }
});

// Update product
router.put('/:id', authenticateToken, requireRole('supplier'), async (req, res) => {
  try {
    const product = await Product.findOne({ 
      _id: req.params.id, 
      supplier: req.user.userId 
    });

    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: 'Product not found or you are not authorized to edit it' 
      });
    }

    Object.assign(product, req.body);
    await product.save();

    const updatedProduct = await Product.findById(product._id)
      .populate('supplier', 'name businessName location rating verified');

    res.json({
      success: true,
      message: 'Product updated successfully',
      product: updatedProduct
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error updating product' 
    });
  }
});

// Delete product
router.delete('/:id', authenticateToken, requireRole('supplier'), async (req, res) => {
  try {
    const product = await Product.findOne({ 
      _id: req.params.id, 
      supplier: req.user.userId 
    });

    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: 'Product not found or you are not authorized to delete it' 
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

// Get featured products
router.get('/featured/list', async (req, res) => {
  try {
    const products = await Product.findFeatured().limit(6);

    res.json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Error fetching featured products:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching featured products' 
    });
  }
});

// Get products by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const products = await Product.findByCategory(category)
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Product.countDocuments({ category, inStock: true });

    res.json({
      success: true,
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalProducts: total
      }
    });
  } catch (error) {
    console.error('Error fetching products by category:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching products' 
    });
  }
});

module.exports = router;
