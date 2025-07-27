const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Product = require('../models/Product');

describe('VendorConnect API Tests', () => {
  let vendorToken, supplierToken, productId;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/vendorconnect_test');
  });

  afterAll(async () => {
    // Clean up and close connection
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear collections before each test
    await User.deleteMany({});
    await Product.deleteMany({});
  });

  describe('Authentication', () => {
    test('Should register a new vendor', async () => {
      const vendorData = {
        name: 'Test Vendor',
        email: 'vendor@test.com',
        password: 'password123',
        userType: 'vendor',
        phone: '9876543210',
        location: 'Mumbai'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(vendorData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(vendorData.email);
      expect(response.body.token).toBeDefined();

      vendorToken = response.body.token;
    });

    test('Should register a new supplier', async () => {
      const supplierData = {
        name: 'Test Supplier',
        email: 'supplier@test.com',
        password: 'password123',
        userType: 'supplier',
        phone: '9876543211',
        location: 'Delhi',
        businessName: 'Test Supplies',
        businessAddress: '123 Test Street'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(supplierData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user.userType).toBe('supplier');
      expect(response.body.user.businessName).toBe(supplierData.businessName);

      supplierToken = response.body.token;
    });

    test('Should login existing user', async () => {
      // First register a user
      const userData = {
        name: 'Login Test',
        email: 'login@test.com',
        password: 'password123',
        userType: 'vendor',
        phone: '9876543212',
        location: 'Chennai'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Then login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
    });

    test('Should reject invalid login credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'wrongpassword'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid email or password');
    });
  });

  describe('Products', () => {
    beforeEach(async () => {
      // Register a supplier for product tests
      const supplierData = {
        name: 'Product Test Supplier',
        email: 'productsupplier@test.com',
        password: 'password123',
        userType: 'supplier',
        phone: '9876543213',
        location: 'Bangalore',
        businessName: 'Product Supplies',
        businessAddress: '456 Product Street'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(supplierData);

      supplierToken = response.body.token;
    });

    test('Should add a new product', async () => {
      const productData = {
        name: 'Test Tomatoes',
        price: 40,
        unit: 'kg',
        minOrder: 5,
        category: 'vegetables',
        stockQuantity: 100,
        image: '🍅',
        description: 'Fresh red tomatoes'
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${supplierToken}`)
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.product.name).toBe(productData.name);
      expect(response.body.product.supplier).toBeDefined();

      productId = response.body.product._id;
    });

    test('Should get all products', async () => {
      // First add a product
      const productData = {
        name: 'Test Onions',
        price: 30,
        unit: 'kg',
        minOrder: 3,
        category: 'vegetables',
        stockQuantity: 80,
        image: '🧅'
      };

      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${supplierToken}`)
        .send(productData);

      const response = await request(app)
        .get('/api/products')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.products).toHaveLength(1);
      expect(response.body.products[0].name).toBe(productData.name);
    });

    test('Should filter products by category', async () => {
      // Add products in different categories
      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({
          name: 'Test Spice',
          price: 200,
          unit: 'kg',
          minOrder: 1,
          category: 'spices',
          stockQuantity: 50
        });

      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({
          name: 'Test Vegetable',
          price: 25,
          unit: 'kg',
          minOrder: 2,
          category: 'vegetables',
          stockQuantity: 60
        });

      const response = await request(app)
        .get('/api/products?category=spices')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.products).toHaveLength(1);
      expect(response.body.products[0].category).toBe('spices');
    });

    test('Should reject unauthorized product addition', async () => {
      const productData = {
        name: 'Unauthorized Product',
        price: 100,
        unit: 'kg',
        minOrder: 1,
        category: 'other',
        stockQuantity: 10
      };

      const response = await request(app)
        .post('/api/products')
        .send(productData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access token required');
    });
  });

  describe('Cart Management', () => {
    beforeEach(async () => {
      // Register vendor and supplier, add a product
      const vendorData = {
        name: 'Cart Test Vendor',
        email: 'cartvendor@test.com',
        password: 'password123',
        userType: 'vendor',
        phone: '9876543214',
        location: 'Hyderabad'
      };

      const supplierData = {
        name: 'Cart Test Supplier',
        email: 'cartsupplier@test.com',
        password: 'password123',
        userType: 'supplier',
        phone: '9876543215',
        location: 'Kolkata',
        businessName: 'Cart Supplies',
        businessAddress: '789 Cart Street'
      };

      const vendorResponse = await request(app)
        .post('/api/auth/register')
        .send(vendorData);

      const supplierResponse = await request(app)
        .post('/api/auth/register')
        .send(supplierData);

      vendorToken = vendorResponse.body.token;
      supplierToken = supplierResponse.body.token;

      // Add a product
      const productResponse = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({
          name: 'Cart Test Product',
          price: 50,
          unit: 'kg',
          minOrder: 2,
          category: 'vegetables',
          stockQuantity: 20
        });

      productId = productResponse.body.product._id;
    });

    test('Should add item to cart', async () => {
      const response = await request(app)
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          productId,
          quantity: 3
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.cart.items).toHaveLength(1);
      expect(response.body.cart.items[0].quantity).toBe(3);
    });

    test('Should get vendor cart', async () => {
      // First add item to cart
      await request(app)
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          productId,
          quantity: 2
        });

      const response = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.totalAmount).toBeGreaterThan(0);
    });

    test('Should checkout cart', async () => {
      // Add item to cart
      await request(app)
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          productId,
          quantity: 2
        });

      const response = await request(app)
        .post('/api/cart/checkout')
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);

      expect(response.body.message).toContain('Orders placed successfully');
      expect(response.body.orders).toBeDefined();
    });
  });
});
