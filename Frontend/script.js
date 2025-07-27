// Global state
let currentUserType = null;
let cart = [];
let currentTab = "dashboard";
let currentUser = null;
let authToken = null;

// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// Initialize from localStorage (only for auth, not data)
authToken = localStorage.getItem('authToken');
currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

// API helper functions
const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { Authorization: `Bearer ${authToken}` })
    },
    ...options
  };

  try {
    console.log(`API Call: ${config.method || 'GET'} ${url}`);
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'API request failed');
    }
    
    const data = await response.json();
    console.log(`API Response successful for ${endpoint}`);
    return data;
  } catch (error) {
    console.error(`API Error for ${endpoint}:`, error);
    throw error;
  }
};

// Authentication functions
const login = async (email, password) => {
  try {
    const data = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    return data;
  } catch (error) {
    throw error;
  }
};

const register = async (userData) => {
  try {
    const data = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    return data;
  } catch (error) {
    throw error;
  }
};

// FIXED Dropdown functionality
function toggleDropdown(event) {
  console.log('Dropdown toggle called');
  event.preventDefault();
  event.stopPropagation();
  
  // Close any other open dropdowns first
  document.querySelectorAll('.dropdown-menu').forEach(menu => {
    menu.classList.remove('show');
  });
  
  // Find the dropdown menu in the same parent container
  const dropdownContainer = event.target.closest('.dropdown');
  const dropdown = dropdownContainer.querySelector('.dropdown-menu');
  
  if (dropdown) {
    console.log('Toggling dropdown:', dropdown.id);
    dropdown.classList.add('show');
  }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
  const isClickInsideDropdown = event.target.closest('.dropdown');
  
  if (!isClickInsideDropdown) {
    document.querySelectorAll('.dropdown-menu').forEach(dropdown => {
      dropdown.classList.remove('show');
    });
  }
});

// Close dropdown when pressing Escape key
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    document.querySelectorAll('.dropdown-menu').forEach(dropdown => {
      dropdown.classList.remove('show');
    });
  }
});

// Enhanced logout function
function logout() {
  console.log('Logout function called');
  
  if (confirm('Are you sure you want to logout?')) {
    // Clear all data
    authToken = null;
    currentUser = null;
    cart = [];
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    // Hide all dashboards
    document.getElementById('vendor-dashboard').style.display = 'none';
    document.getElementById('supplier-dashboard').style.display = 'none';
    
    // Show auth forms
    showAuthForms();
    
    showToast('Logged out successfully', 'success');
  }
  
  // Close dropdown after logout attempt
  document.querySelectorAll('.dropdown-menu').forEach(dropdown => {
    dropdown.classList.remove('show');
  });
}

// Authentication UI functions
function showAuthForms() {
  document.getElementById('auth-section').style.display = 'flex';
  document.getElementById('landing-page').style.display = 'none';
  document.getElementById('vendor-dashboard').style.display = 'none';
  document.getElementById('supplier-dashboard').style.display = 'none';
}

function switchAuthTab(tabName) {
  document.querySelectorAll('.auth-tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
  
  const tabButtons = document.querySelectorAll('.auth-tab');
  tabButtons.forEach(button => {
    if (button.textContent.toLowerCase().includes(tabName)) {
      button.classList.add('active');
    }
  });
  
  document.getElementById(`${tabName}-form`).classList.add('active');
  
  document.getElementById('login-error').style.display = 'none';
  document.getElementById('register-error').style.display = 'none';
  document.getElementById('register-success').style.display = 'none';
}

function switchToRegisterAsVendor() {
  switchAuthTab('register');
  document.getElementById('register-usertype').value = 'vendor';
  toggleBusinessFields();
  showToast('Ready to register as a Vendor!', 'info');
}

function switchToRegisterAsSupplier() {
  switchAuthTab('register');
  document.getElementById('register-usertype').value = 'supplier';
  toggleBusinessFields();
  showToast('Ready to register as a Supplier!', 'info');
}

function switchToLogin() {
  switchAuthTab('login');
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').style.display = 'none';
}

function toggleBusinessFields() {
  const userType = document.getElementById('register-usertype').value;
  const businessFields = document.getElementById('business-fields');
  const businessName = document.getElementById('register-business-name');
  const businessAddress = document.getElementById('register-business-address');
  
  if (userType === 'supplier') {
    businessFields.style.display = 'block';
    businessName.required = true;
    businessAddress.required = true;
  } else {
    businessFields.style.display = 'none';
    businessName.required = false;
    businessAddress.required = false;
  }
}

async function handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errorDiv = document.getElementById('login-error');
  
  console.log('Attempting login with:', email);
  
  try {
    showLoadingOverlay();
    await login(email, password);
    hideLoadingOverlay();
    
    console.log('Login successful, user:', currentUser);
    setUserType(currentUser.userType);
    showToast('Login successful!', 'success');
  } catch (error) {
    console.error('Login error:', error);
    hideLoadingOverlay();
    errorDiv.textContent = error.message;
    errorDiv.style.display = 'block';
  }
}

async function handleRegister(event) {
  event.preventDefault();
  
  const userData = {
    name: document.getElementById('register-name').value,
    email: document.getElementById('register-email').value,
    password: document.getElementById('register-password').value,
    userType: document.getElementById('register-usertype').value,
    phone: document.getElementById('register-phone').value,
    location: document.getElementById('register-location').value
  };
  
  if (userData.userType === 'supplier') {
    userData.businessName = document.getElementById('register-business-name').value;
    userData.businessAddress = document.getElementById('register-business-address').value;
  }
  
  const errorDiv = document.getElementById('register-error');
  const successDiv = document.getElementById('register-success');
  
  console.log('Attempting registration with:', userData);
  
  try {
    showLoadingOverlay();
    await register(userData);
    hideLoadingOverlay();
    
    console.log('Registration successful, user:', currentUser);
    setUserType(currentUser.userType);
    showToast('Registration successful!', 'success');
  } catch (error) {
    console.error('Registration error:', error);
    hideLoadingOverlay();
    errorDiv.textContent = error.message;
    errorDiv.style.display = 'block';
    successDiv.style.display = 'none';
  }
}

// User type selection
function setUserType(type) {
  console.log('Setting user type:', type);
  currentUserType = type;
  document.getElementById('auth-section').style.display = 'none';
  document.getElementById('landing-page').style.display = 'none';

  if (type === 'vendor') {
    document.getElementById('vendor-dashboard').style.display = 'block';
    document.getElementById('vendor-name').textContent = currentUser?.name || 'Vendor';
    renderSuppliers();
    loadVendorCart();
  } else if (type === 'supplier') {
    document.getElementById('supplier-dashboard').style.display = 'block';
    document.getElementById('supplier-name').textContent = currentUser?.name || 'Supplier';
    renderRecentOrders();
    renderSupplierProducts();
    loadSupplierStats();
  }
}

// TheMealDB API Integration
async function searchMealByName(mealName) {
  try {
    const response = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(mealName)}`);
    const data = await response.json();
    return data.meals && data.meals.length > 0 ? data.meals[0] : null;
  } catch (error) {
    console.error('Error fetching meal data:', error);
    return null;
  }
}

function extractIngredients(meal) {
  const ingredients = [];
  
  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    
    if (ingredient && ingredient.trim()) {
      ingredients.push({
        name: ingredient.trim(),
        measure: measure ? measure.trim() : ''
      });
    }
  }
  
  return ingredients;
}

function matchIngredientsToProducts(apiIngredients, allProducts) {
  const matchedProducts = [];

  apiIngredients.forEach(apiIngredient => {
    const matches = allProducts.filter(product => {
      const productName = product.name.toLowerCase();
      const ingredientName = apiIngredient.name.toLowerCase();
      
      if (productName.includes(ingredientName) || ingredientName.includes(productName)) {
        return true;
      }
      
      const mappings = {
        'tomato': 'tomatoes',
        'onion': 'onions', 
        'chili': 'chilies',
        'chilli': 'chilies',
        'turmeric': 'turmeric powder',
        'red chili powder': 'red chili powder',
        'garam masala': 'garam masala',
        'coriander': 'coriander',
        'cumin': 'cumin',
        'garlic': 'garlic',
        'ginger': 'ginger',
        'coconut': 'coconut',
        'lime': 'lime',
        'lemon': 'lime',
        'butter': 'butter',
        'cream': 'cream',
        'chicken': 'chicken',
        'fish': 'fish',
        'prawn': 'prawns',
        'shrimp': 'prawns',
        'rice': 'rice',
        'potato': 'potatoes',
        'lentil': 'lentils'
      };
      
      for (const [key, value] of Object.entries(mappings)) {
        if (ingredientName.includes(key) && productName.includes(value)) {
          return true;
        }
        if (ingredientName.includes(value) && productName.includes(key)) {
          return true;
        }
      }
      
      return false;
    });
    
    if (matches.length > 0) {
      matchedProducts.push({
        ...matches[0],
        originalIngredient: apiIngredient.name,
        measure: apiIngredient.measure
      });
    }
  });

  return matchedProducts.filter((product, index, self) => 
    index === self.findIndex(p => p._id === product._id)
  );
}

async function searchDishIngredients() {
  const dishInput = document.getElementById("dish-input").value.trim();
  const ingredientsDiv = document.getElementById("dish-ingredients-list");

  if (!dishInput) {
    ingredientsDiv.innerHTML = "<span style='color:#888'>Please enter a dish name</span>";
    return;
  }

  ingredientsDiv.innerHTML = "<span style='color:#666'>🔍 Searching for ingredients...</span>";

  try {
    const meal = await searchMealByName(dishInput);
    
    if (!meal) {
      ingredientsDiv.innerHTML = "<span style='color:#888'>Dish not found. Try searching for popular dishes like 'Chicken Curry', 'Biryani', 'Fish Curry', etc.</span>";
      return;
    }

    const apiIngredients = extractIngredients(meal);
    const allProducts = await fetchProducts();
    const matchedProducts = matchIngredientsToProducts(apiIngredients, allProducts);

    if (matchedProducts.length === 0) {
      ingredientsDiv.innerHTML = `
        <div style='color:#888'>
          <p>Found recipe for "${meal.strMeal}" but no matching ingredients available in our suppliers.</p>
          <p><strong>Recipe ingredients:</strong> ${apiIngredients.map(ing => ing.name).join(', ')}</p>
        </div>
      `;
      return;
    }

    ingredientsDiv.innerHTML = `
      <div style='margin-bottom:1rem;'>
        <h4 style='color:#f97316;margin-bottom:0.5rem;'>Recipe: ${meal.strMeal}</h4>
        <p style='font-size:0.875rem;color:#666;margin-bottom:1rem;'>Found ${matchedProducts.length} matching ingredients from our suppliers:</p>
      </div>
      <form id="ingredient-checkbox-form" style="display:flex;flex-direction:column;gap:0.5rem;">
        ${matchedProducts.map(prod => `
          <label style="display:flex;align-items:center;gap:0.5rem;padding:0.5rem;border-radius:0.25rem;border:1px solid #e5e7eb;">
            <input type="checkbox" value="${prod._id}" checked>
            <span>
              <strong>${prod.name}</strong> 
              ${prod.measure ? `(${prod.measure})` : ''} 
              from <span style="color:#f97316;font-weight:600">${prod.supplier.businessName}</span>
              - ₹${prod.price}/${prod.unit}, min ${prod.minOrder}
            </span>
          </label>
        `).join("")}
        <button type="submit" class="btn btn-primary" style="margin-top:1rem;align-self:flex-start">Add Selected to Cart</button>
      </form>
    `;

    document.getElementById("ingredient-checkbox-form").onsubmit = async function(e){
      e.preventDefault();
      const chosen = Array.from(this.querySelectorAll('input[type=checkbox]:checked'));
      if(chosen.length === 0) {
        showToast("No ingredients selected.", 'warning');
        return;
      }
      
      try {
        for (const inp of chosen) {
          await addToCartAPI(inp.value);
        }
        showToast(`${chosen.length} ingredients added to cart for ${meal.strMeal}!`, 'success');
        updateCartCount();
        ingredientsDiv.innerHTML = "";
        document.getElementById("dish-input").value = "";
      } catch (error) {
        showToast('Error adding ingredients to cart: ' + error.message, 'error');
      }
    }

  } catch (error) {
    console.error('Error searching for dish:', error);
    ingredientsDiv.innerHTML = "<span style='color:#dc2626'>Error searching for dish. Please try again.</span>";
  }
}

// Product functions
const fetchProducts = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams(filters).toString();
    const data = await apiCall(`/products?${queryParams}`);
    return data;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

const addProduct = async (productData) => {
  try {
    const data = await apiCall('/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    });
    return data;
  } catch (error) {
    throw error;
  }
};

// Filter functionality
function applyFilters() {
  const productSearch = document.getElementById('product-search').value.toLowerCase();
  const categoryFilter = document.getElementById('category-filter').value;
  const locationFilter = document.getElementById('location-filter').value;
  
  document.getElementById('suppliers-loading').style.display = 'block';
  
  const filters = {};
  if (productSearch) filters.search = productSearch;
  if (categoryFilter) filters.category = categoryFilter;
  if (locationFilter) filters.location = locationFilter;
  
  fetchProducts(filters).then(products => {
    renderSuppliers(products);
    document.getElementById('suppliers-loading').style.display = 'none';
  }).catch(error => {
    console.error('Error applying filters:', error);
    document.getElementById('suppliers-loading').style.display = 'none';
    showToast('Error loading products', 'error');
  });
}

// Vendor Dashboard Functions
async function renderSuppliers(products = null) {
  const container = document.getElementById("suppliers-list");
  const loadingSpinner = document.getElementById("suppliers-loading");
  
  if (!products) {
    loadingSpinner.style.display = 'block';
    try {
      products = await fetchProducts();
    } catch (error) {
      console.error('Error fetching products:', error);
      container.innerHTML = '<div class="error-state"><i class="fas fa-exclamation-circle"></i><p>Error loading suppliers. Please check your connection and try again.</p></div>';
      loadingSpinner.style.display = 'none';
      return;
    }
    loadingSpinner.style.display = 'none';
  }
  
  container.innerHTML = "";

  if (products.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-store"></i><p>No suppliers found</p></div>';
    return;
  }

  // Group products by supplier
  const supplierGroups = {};
  products.forEach(product => {
    const supplierId = product.supplier._id;
    if (!supplierGroups[supplierId]) {
      supplierGroups[supplierId] = {
        supplier: product.supplier,
        products: []
      };
    }
    supplierGroups[supplierId].products.push(product);
  });

  Object.values(supplierGroups).forEach((group) => {
    const supplierCard = document.createElement("div");
    supplierCard.className = "supplier-card";

    supplierCard.innerHTML = `
      <div class="supplier-header">
        <div class="supplier-info">
          <h3>
            ${group.supplier.businessName}
            ${group.supplier.verified ? '<span class="verified-badge"><i class="fas fa-check"></i> Verified</span>' : ""}
          </h3>
          <div class="supplier-meta">
            <span class="rating">
              <i class="fas fa-star star"></i>
              ${group.supplier.rating}
            </span>
            <span>
              <i class="fas fa-map-marker-alt"></i>
              ${group.supplier.location}
            </span>
          </div>
        </div>
      </div>
      <div class="products-grid">
        ${group.products
          .map(
            (product) => `
            <div class="product-card">
              <div class="product-image">${product.image}</div>
              <h4>${product.name}</h4>
              <div class="product-details">
                <p>₹${product.price}/${product.unit}</p>
                <p>Min order: ${product.minOrder} ${product.unit}</p>
                <p>Stock: ${product.stockQuantity}</p>
                ${product.description ? `<p class="product-desc">${product.description}</p>` : ''}
              </div>
              <button class="btn btn-primary" onclick="addToCartFromList('${product._id}')" 
                      ${!product.inStock ? 'disabled' : ''}>
                ${product.inStock ? '<i class="fas fa-cart-plus"></i> Add to Cart' : 'Out of Stock'}
              </button>
            </div>
          `,
          )
          .join("")}
      </div>
    `;

    container.appendChild(supplierCard);
  });
}

// Database-based Cart functions (Cross-device compatible)
async function addToCartFromList(productId) {
  console.log('Adding product to cart:', productId);
  try {
    await addToCartAPI(productId);
    showToast('Product added to cart!', 'success');
    updateCartCount();
  } catch (error) {
    console.error('Error adding to cart:', error);
    showToast('Error adding to cart: ' + error.message, 'error');
  }
}

const fetchCart = async () => {
  try {
    const data = await apiCall('/cart');
    return data;
  } catch (error) {
    console.error('Error fetching cart:', error);
    throw error;
  }
};

const addToCartAPI = async (productId, quantity = 1) => {
  try {
    const data = await apiCall('/cart/add', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity })
    });
    
    // Update local cart state
    const updatedCart = await fetchCart();
    cart = updatedCart.items || [];
    
    return data;
  } catch (error) {
    console.error('Error adding to cart:', error);
    throw error;
  }
};

const removeFromCartAPI = async (itemId) => {
  try {
    const data = await apiCall(`/cart/remove/${itemId}`, {
      method: 'DELETE'
    });
    
    // Update local cart state
    const updatedCart = await fetchCart();
    cart = updatedCart.items || [];
    
    return data;
  } catch (error) {
    console.error('Error removing from cart:', error);
    throw error;
  }
};

const checkoutCart = async () => {
  try {
    const data = await apiCall('/cart/checkout', {
      method: 'POST'
    });
    
    // Clear local cart state
    cart = [];
    
    return data;
  } catch (error) {
    console.error('Error during checkout:', error);
    throw error;
  }
};

async function loadVendorCart() {
  try {
    console.log('Loading vendor cart from database...');
    const cartData = await fetchCart();
    cart = cartData.items || [];
    updateCartCount();
    console.log(`Cart loaded: ${cart.length} items`);
  } catch (error) {
    console.error('Error loading cart:', error);
    cart = [];
    updateCartCount();
    showToast('Unable to load cart. Please try again.', 'error');
  }
}

function updateCartCount() {
  const cartCount = document.getElementById("cart-count");
  if (cartCount) {
    cartCount.textContent = cart.length;
  }
}

// Cart Modal Functions
async function openCart() {
  document.getElementById("cart-modal").classList.add("active");
  await renderCartItems();
}

function closeCart() {
  document.getElementById("cart-modal").classList.remove("active");
}

async function renderCartItems() {
  const container = document.getElementById("cart-items");
  const totalContainer = document.getElementById("cart-total");

  try {
    container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><p>Loading cart...</p></div>';
    
    const cartData = await fetchCart();
    cart = cartData.items || [];

    if (cart.length === 0) {
      container.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>Your cart is empty</p></div>';
      totalContainer.innerHTML = "";
      return;
    }

    container.innerHTML = cart
      .map(
        (item) => `
        <div class="cart-item">
          <div class="cart-item-info">
            <h4>${item.product.name}</h4>
            <p>From: ${item.product.supplier.businessName}</p>
            <p>₹${item.priceAtTime}/${item.product.unit} × ${item.quantity} ${item.product.unit}</p>
          </div>
          <div class="cart-item-actions">
            <span class="cart-item-price">₹${item.priceAtTime * item.quantity}</span>
            <button class="btn btn-outline" onclick="removeFromCart('${item._id}')">
              <i class="fas fa-trash"></i> Remove
            </button>
          </div>
        </div>
      `,
      )
      .join("");

    totalContainer.innerHTML = `
      <div class="cart-total">
        <span>Total: ₹${cartData.totalAmount}</span>
        <button class="btn btn-primary" onclick="placeOrder()">
          <i class="fas fa-credit-card"></i> Place Order
        </button>
      </div>
    `;
  } catch (error) {
    console.error('Error rendering cart:', error);
    container.innerHTML = '<div class="error-state">Error loading cart. Please try again.</div>';
  }
}

async function removeFromCart(itemId) {
  try {
    await removeFromCartAPI(itemId);
    await renderCartItems();
    updateCartCount();
    showToast('Item removed from cart', 'success');
  } catch (error) {
    showToast('Error removing item: ' + error.message, 'error');
  }
}

async function placeOrder() {
  if (cart.length === 0) return;

  try {
    showLoadingOverlay();
    const result = await checkoutCart();
    hideLoadingOverlay();
    
    showToast('Order placed successfully!', 'success');
    cart = [];
    updateCartCount();
    closeCart();
  } catch (error) {
    hideLoadingOverlay();
    showToast('Error placing order: ' + error.message, 'error');
  }
}

// Supplier Dashboard Functions
function switchTab(tabName) {
  document.querySelectorAll(".tab-button").forEach((btn) => btn.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach((content) => content.classList.remove("active"));

  document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add("active");
  document.getElementById(`tab-${tabName}`).classList.add("active");

  currentTab = tabName;

  if (tabName === "products") {
    renderSupplierProducts();
  } else if (tabName === "orders") {
    renderOrders();
  } else if (tabName === "profile") {
    loadUserProfile();
  }
}

async function loadSupplierStats() {
  if (currentUser && currentUser.userType === 'supplier') {
    try {
      const products = await apiCall('/products/my-products');
      document.getElementById('active-products').textContent = products.length;
    } catch (error) {
      console.error('Error loading stats:', error);
      document.getElementById('active-products').textContent = '0';
    }
  }
}

async function renderSupplierProducts() {
  const container = document.getElementById("products-grid");
  if (!container) return;

  try {
    container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><p>Loading products...</p></div>';
    
    const products = await apiCall('/products/my-products');
    
    if (products.length === 0) {
      container.innerHTML = '<div class="empty-state"><i class="fas fa-box-open"></i><p>No products added yet</p><button class="btn btn-primary" onclick="openAddProductModal()" style="margin-top:1rem;"><i class="fas fa-plus"></i> Add Your First Product</button></div>';
      return;
    }

    container.innerHTML = products
      .map(
        (product) => `
        <div class="product-card">
          <div class="product-image">${product.image}</div>
          <h4>${product.name}</h4>
          <div class="product-details">
            <p>Price: ₹${product.price}/${product.unit}</p>
            <p>Min order: ${product.minOrder} ${product.unit}</p>
            <p>Stock: ${product.stockQuantity}</p>
            <p>Status: ${product.inStock ? '<span style="color: #10b981;">In Stock</span>' : '<span style="color: #ef4444;">Out of Stock</span>'}</p>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-outline" style="flex: 1;" onclick="editProduct('${product._id}')">
              <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn btn-outline" style="flex: 1;" onclick="deleteProduct('${product._id}')">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        </div>
      `,
      )
      .join("");
  } catch (error) {
    console.error('Error loading products:', error);
    container.innerHTML = '<div class="error-state">Error loading products. Please check your connection.</div>';
  }
}

async function renderRecentOrders() {
  const container = document.getElementById("recent-orders");
  if (!container) return;

  try {
    container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><p>Loading orders...</p></div>';
    
    const orders = await apiCall('/orders/supplier');
    
    if (orders.length === 0) {
      container.innerHTML = '<div class="empty-state"><i class="fas fa-shopping-bag"></i><p>No orders yet</p></div>';
      return;
    }

    container.innerHTML = orders.slice(0, 5).map(order => `
      <div class="order-item">
        <div class="order-info">
          <h4>Order #${order._id.slice(-6)}</h4>
          <p>${order.vendor.name}</p>
          <p>${order.items.length} items</p>
        </div>
        <div class="order-details">
          <p class="order-amount">₹${order.totalAmount}</p>
          <span class="status-badge ${order.status}">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
        </div>
      </div>
    `).join("");

  } catch (error) {
    console.error('Error loading orders:', error);
    container.innerHTML = '<div class="error-state">Error loading orders</div>';
  }
}

function renderOrders() {
  const container = document.querySelector("#all-orders");
  if (!container) return;

  renderRecentOrders();
}

async function refreshOrders() {
  if (currentUser && currentUser.userType === 'supplier') {
    try {
      showToast('Refreshing orders...', 'info');
      await renderRecentOrders();
      showToast('Orders refreshed!', 'success');
    } catch (error) {
      showToast('Failed to refresh orders', 'error');
    }
  }
}

// Product Management
function openAddProductModal() {
  document.getElementById("add-product-modal").classList.add("active");
}

function closeAddProductModal() {
  document.getElementById("add-product-modal").classList.remove("active");
  document.getElementById("add-product-form").reset();
  document.getElementById('add-product-error').style.display = 'none';
  document.getElementById('add-product-success').style.display = 'none';
}

async function handleAddProduct(event) {
  event.preventDefault();

  const productData = {
    name: document.getElementById("product-name").value,
    price: parseFloat(document.getElementById("product-price").value),
    unit: document.getElementById("product-unit").value,
    minOrder: parseInt(document.getElementById("product-min-order").value),
    category: document.getElementById("product-category").value,
    stockQuantity: parseInt(document.getElementById("product-stock").value),
    image: document.getElementById("product-image").value || '🍽️',
    description: document.getElementById("product-description").value,
  };

  const errorDiv = document.getElementById('add-product-error');
  const successDiv = document.getElementById('add-product-success');

  try {
    await addProduct(productData);
    successDiv.textContent = 'Product added successfully!';
    successDiv.style.display = 'block';
    errorDiv.style.display = 'none';
    
    setTimeout(() => {
      closeAddProductModal();
      renderSupplierProducts();
      loadSupplierStats();
      showToast('Product added successfully!', 'success');
    }, 1500);
  } catch (error) {
    errorDiv.textContent = error.message;
    errorDiv.style.display = 'block';
    successDiv.style.display = 'none';
  }
}

function editProduct(productId) {
  showToast('Edit functionality coming soon!', 'info');
}

async function deleteProduct(productId) {
  if (!confirm('Are you sure you want to delete this product?')) {
    return;
  }

  try {
    await apiCall(`/products/${productId}`, { method: 'DELETE' });
    showToast('Product deleted successfully!', 'success');
    renderSupplierProducts();
    loadSupplierStats();
  } catch (error) {
    showToast('Error deleting product: ' + error.message, 'error');
  }
}

// Profile Management
async function loadUserProfile() {
  if (currentUser && currentUser.userType === 'supplier') {
    try {
      const profile = await apiCall('/profile');
      document.getElementById('profile-business-name').value = profile.businessName || '';
      document.getElementById('profile-contact-person').value = profile.name || '';
      document.getElementById('profile-business-address').value = profile.businessAddress || '';
      document.getElementById('profile-phone').value = profile.phone || '';
      document.getElementById('profile-email').value = profile.email || '';
      document.getElementById('profile-business-hours').value = profile.businessHours || '9:00 AM - 6:00 PM';
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }
}

async function updateProfile(event) {
  event.preventDefault();
  
  if (!currentUser || currentUser.userType !== 'supplier') {
    showToast('Unauthorized access', 'error');
    return;
  }
  
  try {
    const profileData = {
      businessName: document.getElementById('profile-business-name').value,
      name: document.getElementById('profile-contact-person').value,
      businessAddress: document.getElementById('profile-business-address').value,
      phone: document.getElementById('profile-phone').value,
      email: document.getElementById('profile-email').value,
      businessHours: document.getElementById('profile-business-hours').value
    };
    
    await apiCall('/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
    
    // Update current user data
    currentUser = { ...currentUser, ...profileData };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    showToast('Profile updated successfully!', 'success');
    
  } catch (error) {
    console.error('Profile update error:', error);
    showToast('Failed to update profile: ' + error.message, 'error');
  }
}

// Utility Functions
function showToast(message, type = 'info') {
  // Create toast container if it doesn't exist
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <i class="fas fa-${getToastIcon(type)}"></i>
      <span>${message}</span>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;
  
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    if (toast.parentElement) {
      toast.remove();
    }
  }, 5000);
}

function getToastIcon(type) {
  switch(type) {
    case 'success': return 'check-circle';
    case 'error': return 'exclamation-circle';
    case 'warning': return 'exclamation-triangle';
    default: return 'info-circle';
  }
}

function showLoadingOverlay() {
  let loadingOverlay = document.getElementById('loading-overlay');
  if (!loadingOverlay) {
    loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'loading-overlay';
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
      <div class="loading-content">
        <i class="fas fa-spinner fa-spin fa-3x"></i>
        <p>Loading...</p>
      </div>
    `;
    document.body.appendChild(loadingOverlay);
  }
  loadingOverlay.style.display = 'flex';
}

function hideLoadingOverlay() {
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.style.display = 'none';
  }
}

// Close modals when clicking outside
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal")) {
    e.target.classList.remove("active");
  }
});

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  console.log('Application starting with MongoDB backend...');
  
  if (authToken && currentUser) {
    console.log('User found in localStorage:', currentUser);
    // Verify token is still valid by making a test API call
    apiCall('/profile')
      .then(() => {
        setUserType(currentUser.userType);
      })
      .catch(() => {
        // Token is invalid, clear storage and show auth
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        authToken = null;
        currentUser = null;
        showAuthForms();
      });
  } else {
    console.log('No user found, showing auth forms');
    showAuthForms();
  }
});
