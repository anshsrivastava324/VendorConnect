// Global state
let currentUserType = null
let cart = []
let currentTab = "dashboard"

// Sample data
const suppliers = [
  {
    id: 1,
    name: "Fresh Farm Supplies",
    rating: 4.8,
    location: "Mumbai Central Market",
    verified: true,
    products: [
      {
        id: 1,
        name: "Tomatoes",
        price: 45,
        unit: "kg",
        minOrder: 5,
        image: "🍅",
      },
      {
        id: 2,
        name: "Onions",
        price: 35,
        unit: "kg",
        minOrder: 10,
        image: "🧅",
      },
      {
        id: 3,
        name: "Green Chilies",
        price: 80,
        unit: "kg",
        minOrder: 2,
        image: "🌶️",
      },
      {
        id: 4,
        name: "Turmeric Powder",
        price: 120,
        unit: "kg",
        minOrder: 5,
        image: "🟡",
      },
      {
        id: 5,
        name: "Red Chili Powder",
        price: 150,
        unit: "kg",
        minOrder: 3,
        image: "🔴",
      },
      {
        id: 6,
        name: "Garam Masala",
        price: 200,
        unit: "kg",
        minOrder: 2,
        image: "🟤",
      },
      {
        id: 7,
        name: "Fish",
        price: 300,
        unit: "kg",
        minOrder: 5,
        image: "🐟",
      },
      {
        id: 8,
        name: "Prawns",
        price: 450,
        unit: "kg",
        minOrder: 3,
        image: "🦐",
      },
      {
        id: 9,
        name: "Chicken",
        price: 250,
        unit: "kg",
        minOrder: 3,
        image: "🍗",
      },
      {
        id: 10,
        name: "Rice",
        price: 60,
        unit: "kg",
        minOrder: 10,
        image: "🍚",
      },
      {
        id: 11,
        name: "Potatoes",
        price: 30,
        unit: "kg",
        minOrder: 5,
        image: "🥔",
      },
      {
        id: 12,
        name: "Lentils",
        price: 80,
        unit: "kg",
        minOrder: 5,
        image: "🟤",
      },
      {
        id: 13,
        name: "Coconut",
        price: 40,
        unit: "piece",
        minOrder: 5,
        image: "🥥",
      },
      {
        id: 14,
        name: "Garlic",
        price: 120,
        unit: "kg",
        minOrder: 2,
        image: "🧄",
      },
      {
        id: 15,
        name: "Ginger",
        price: 150,
        unit: "kg",
        minOrder: 2,
        image: "🫚",
      },
      {
        id: 16,
        name: "Coriander",
        price: 40,
        unit: "kg",
        minOrder: 1,
        image: "🌿",
      },
      {
        id: 17,
        name: "Cumin",
        price: 200,
        unit: "kg",
        minOrder: 1,
        image: "🟤",
      },
      {
        id: 18,
        name: "Lime",
        price: 60,
        unit: "kg",
        minOrder: 2,
        image: "🍋",
      },
      {
        id: 19,
        name: "Butter",
        price: 300,
        unit: "kg",
        minOrder: 2,
        image: "🧈",
      },
      {
        id: 20,
        name: "Cream",
        price: 150,
        unit: "liter",
        minOrder: 2,
        image: "🥛",
      }
    ],
  },
  {
    id: 2,
    name: "Spice World Wholesale",
    rating: 4.6,
    location: "Andheri Spice Market",
    verified: true,
    products: [
      // References to same products with different suppliers
    ],
  },
  {
    id: 3,
    name: "Ocean Fresh Seafood",
    rating: 4.7,
    location: "Sassoon Dock",
    verified: true,
    products: [
      // References to same products with different suppliers
    ],
  },
]

const recentOrders = [
  {
    id: "ORD001",
    vendor: "Raj's Vada Pav",
    items: "Tomatoes, Onions",
    amount: "₹450",
    status: "pending",
  },
  {
    id: "ORD002",
    vendor: "Mumbai Chaat Corner",
    items: "Spices Mix",
    amount: "₹320",
    status: "delivered",
  },
  {
    id: "ORD003",
    vendor: "Street Biryani",
    items: "Fresh Fish",
    amount: "₹1,200",
    status: "processing",
  },
]

// TheMealDB API Integration
async function searchMealByName(mealName) {
  try {
    const response = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(mealName)}`)
    const data = await response.json()
    return data.meals && data.meals.length > 0 ? data.meals[0] : null
  } catch (error) {
    console.error('Error fetching meal data:', error)
    return null
  }
}

function extractIngredients(meal) {
  const ingredients = []
  
  // TheMealDB stores ingredients as strIngredient1, strIngredient2, etc.
  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`]
    const measure = meal[`strMeasure${i}`]
    
    if (ingredient && ingredient.trim()) {
      ingredients.push({
        name: ingredient.trim(),
        measure: measure ? measure.trim() : ''
      })
    }
  }
  
  return ingredients
}

// Function to match API ingredients with available products
function matchIngredientsToProducts(apiIngredients) {
  const matchedProducts = []
  const allProducts = suppliers.flatMap(supplier => 
    supplier.products.map(product => ({
      ...product,
      supplierName: supplier.name,
      supplierId: supplier.id
    }))
  )

  apiIngredients.forEach(apiIngredient => {
    // Try to find matching products using fuzzy matching
    const matches = allProducts.filter(product => {
      const productName = product.name.toLowerCase()
      const ingredientName = apiIngredient.name.toLowerCase()
      
      // Direct match
      if (productName.includes(ingredientName) || ingredientName.includes(productName)) {
        return true
      }
      
      // Common ingredient mappings
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
      }
      
      // Check mappings
      for (const [key, value] of Object.entries(mappings)) {
        if (ingredientName.includes(key) && productName.includes(value)) {
          return true
        }
        if (ingredientName.includes(value) && productName.includes(key)) {
          return true
        }
      }
      
      return false
    })
    
    // Add the first match (you could modify this to show all matches)
    if (matches.length > 0) {
      matchedProducts.push({
        ...matches[0],
        originalIngredient: apiIngredient.name,
        measure: apiIngredient.measure
      })
    }
  })

  // Remove duplicates based on product ID
  const uniqueProducts = matchedProducts.filter((product, index, self) => 
    index === self.findIndex(p => p.id === product.id)
  )

  return uniqueProducts
}

// Updated dish search function using TheMealDB API
async function searchDishIngredients() {
  const dishInput = document.getElementById("dish-input").value.trim()
  const ingredientsDiv = document.getElementById("dish-ingredients-list")

  if (!dishInput) {
    ingredientsDiv.innerHTML = "<span style='color:#888'>Please enter a dish name</span>"
    return
  }

  // Show loading message
  ingredientsDiv.innerHTML = "<span style='color:#666'>🔍 Searching for ingredients...</span>"

  try {
    // Search for the meal in TheMealDB
    const meal = await searchMealByName(dishInput)
    
    if (!meal) {
      ingredientsDiv.innerHTML = "<span style='color:#888'>Dish not found. Try searching for popular dishes like 'Chicken Curry', 'Biryani', 'Fish Curry', etc.</span>"
      return
    }

    // Extract ingredients from the meal
    const apiIngredients = extractIngredients(meal)
    
    // Match ingredients with available products
    const matchedProducts = matchIngredientsToProducts(apiIngredients)

    if (matchedProducts.length === 0) {
      ingredientsDiv.innerHTML = `
        <div style='color:#888'>
          <p>Found recipe for "${meal.strMeal}" but no matching ingredients available in our suppliers.</p>
          <p><strong>Recipe ingredients:</strong> ${apiIngredients.map(ing => ing.name).join(', ')}</p>
        </div>
      `
      return
    }

    // Display matched ingredients with checkboxes
    ingredientsDiv.innerHTML = `
      <div style='margin-bottom:1rem;'>
        <h4 style='color:#f97316;margin-bottom:0.5rem;'>Recipe: ${meal.strMeal}</h4>
        <p style='font-size:0.875rem;color:#666;margin-bottom:1rem;'>Found ${matchedProducts.length} matching ingredients from our suppliers:</p>
      </div>
      <form id="ingredient-checkbox-form" style="display:flex;flex-direction:column;gap:0.5rem;">
        ${matchedProducts.map(prod => `
          <label style="display:flex;align-items:center;gap:0.5rem;padding:0.5rem;border-radius:0.25rem;border:1px solid #e5e7eb;">
            <input type="checkbox" value="${prod.id}" data-supplier="${prod.supplierId}" checked>
            <span>
              <strong>${prod.name}</strong> 
              ${prod.measure ? `(${prod.measure})` : ''} 
              from <span style="color:#f97316;font-weight:600">${prod.supplierName}</span>
              - ₹${prod.price}/${prod.unit}, min ${prod.minOrder}
            </span>
          </label>
        `).join("")}
        <button type="submit" class="btn btn-primary" style="margin-top:1rem;align-self:flex-start">Add Selected to Cart</button>
      </form>
    `

    // Attach submit handler
    document.getElementById("ingredient-checkbox-form").onsubmit = function(e){
      e.preventDefault()
      const chosen = Array.from(this.querySelectorAll('input[type=checkbox]:checked'))
      if(chosen.length === 0) {
        alert("No ingredients selected.")
        return
      }
      chosen.forEach(inp => {
        addToCart(Number(inp.value), Number(inp.dataset.supplier), false)
      })
      alert(`${chosen.length} ingredients added to cart for ${meal.strMeal}!`)
      updateCartCount()
      ingredientsDiv.innerHTML = ""
      document.getElementById("dish-input").value = ""
    }

  } catch (error) {
    console.error('Error searching for dish:', error)
    ingredientsDiv.innerHTML = "<span style='color:#dc2626'>Error searching for dish. Please try again.</span>"
  }
}

// User type selection
function setUserType(type) {
  currentUserType = type
  document.getElementById("landing-page").style.display = "none"

  if (type === "vendor") {
    document.getElementById("vendor-dashboard").style.display = "block"
    renderSuppliers()
  } else if (type === "supplier") {
    document.getElementById("supplier-dashboard").style.display = "block"
    renderRecentOrders()
    renderSupplierProducts()
  }
}

function switchUser() {
  currentUserType = null
  cart = []
  document.getElementById("vendor-dashboard").style.display = "none"
  document.getElementById("supplier-dashboard").style.display = "none"
  document.getElementById("landing-page").style.display = "block"
  updateCartCount()
}

// Vendor Dashboard Functions
function renderSuppliers() {
  const container = document.getElementById("suppliers-list")
  container.innerHTML = ""

  suppliers.forEach((supplier) => {
    const supplierCard = document.createElement("div")
    supplierCard.className = "supplier-card"

    // Show only first 6 products per supplier for better UI
    const displayProducts = supplier.products.slice(0, 6)

    supplierCard.innerHTML = `
            <div class="supplier-header">
                <div class="supplier-info">
                    <h3>
                        ${supplier.name}
                        ${supplier.verified ? '<span class="verified-badge">Verified</span>' : ""}
                    </h3>
                    <div class="supplier-meta">
                        <span class="rating">
                            <i class="fas fa-star star"></i>
                            ${supplier.rating}
                        </span>
                        <span>
                            <i class="fas fa-map-marker-alt"></i>
                            ${supplier.location}
                        </span>
                    </div>
                </div>
            </div>
            <div class="products-grid">
                ${displayProducts
                  .map(
                    (product) => `
                    <div class="product-card">
                        <div class="product-image">${product.image}</div>
                        <h4>${product.name}</h4>
                        <div class="product-details">
                            <p>₹${product.price}/${product.unit}</p>
                            <p>Min order: ${product.minOrder} ${product.unit}</p>
                        </div>
                        <button class="btn btn-primary" onclick="addToCart(${product.id}, ${supplier.id})">
                            Add to Cart
                        </button>
                    </div>
                `,
                  )
                  .join("")}
            </div>
        `

    container.appendChild(supplierCard)
  })
}

function addToCart(productId, supplierId, showAlert = true) {
  const supplier = suppliers.find((s) => s.id === supplierId)
  const product = supplier.products.find((p) => p.id === productId)

  const cartItem = {
    ...product,
    supplier: supplier.name,
    supplierId: supplier.id,
  }

  cart.push(cartItem)
  updateCartCount()
  if (showAlert)
    alert(`${product.name} added to cart!`)
}

function removeFromCart(productId) {
  cart = cart.filter((item) => item.id !== productId)
  updateCartCount()
  renderCartItems()
}

function updateCartCount() {
  const cartCount = document.getElementById("cart-count")
  if (cartCount) {
    cartCount.textContent = cart.length
  }
}

function getTotalPrice() {
  return cart.reduce((total, item) => total + item.price * item.minOrder, 0)
}

// Cart Modal Functions
function openCart() {
  document.getElementById("cart-modal").classList.add("active")
  renderCartItems()
}

function closeCart() {
  document.getElementById("cart-modal").classList.remove("active")
}

function renderCartItems() {
  const container = document.getElementById("cart-items")
  const totalContainer = document.getElementById("cart-total")

  if (cart.length === 0) {
    container.innerHTML = '<div class="empty-cart">Your cart is empty</div>'
    totalContainer.innerHTML = ""
    return
  }

  container.innerHTML = cart
    .map(
      (item) => `
        <div class="cart-item">
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p>From: ${item.supplier}</p>
                <p>₹${item.price}/${item.unit} × ${item.minOrder} ${item.unit}</p>
            </div>
            <div class="cart-item-actions">
                <span class="cart-item-price">₹${item.price * item.minOrder}</span>
                <button class="btn btn-outline" onclick="removeFromCart(${item.id})">Remove</button>
            </div>
        </div>
    `,
    )
    .join("")

  totalContainer.innerHTML = `
        <div class="cart-total">
            <span>Total: ₹${getTotalPrice()}</span>
            <button class="btn btn-primary" onclick="placeOrder()">Place Order</button>
        </div>
    `
}

function placeOrder() {
  if (cart.length === 0) return

  alert("Order placed successfully!")
  cart = []
  updateCartCount()
  closeCart()
}

// Supplier Dashboard Functions
function switchTab(tabName) {
  document.querySelectorAll(".tab-button").forEach((btn) => btn.classList.remove("active"))
  document.querySelectorAll(".tab-content").forEach((content) => content.classList.remove("active"))

  document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add("active")
  document.getElementById(`tab-${tabName}`).classList.add("active")

  currentTab = tabName

  if (tabName === "products") {
    renderSupplierProducts()
  } else if (tabName === "orders") {
    renderOrders()
  }
}

function renderRecentOrders() {
  const container = document.getElementById("recent-orders")
  if (!container) return

  container.innerHTML = recentOrders
    .map(
      (order) => `
        <div class="order-item">
            <div class="order-info">
                <h4>${order.id}</h4>
                <p>${order.vendor}</p>
                <p>${order.items}</p>
            </div>
            <div class="order-details">
                <p class="order-amount">${order.amount}</p>
                <span class="status-badge ${order.status}">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
            </div>
        </div>
    `,
    )
    .join("")
}

function renderSupplierProducts() {
  const container = document.getElementById("products-grid")
  if (!container) return

  const myProducts = suppliers[0].products.slice(0, 8) // Show first 8 products

  container.innerHTML = myProducts
    .map(
      (product) => `
        <div class="product-card">
            <div class="product-image">${product.image}</div>
            <h4>${product.name}</h4>
            <div class="product-details">
                <p>Price: ₹${product.price}/${product.unit}</p>
                <p>Min order: ${product.minOrder} ${product.unit}</p>
            </div>
            <div style="display: flex; gap: 0.5rem;">
                <button class="btn btn-outline" style="flex: 1;">Edit</button>
                <button class="btn btn-outline" style="flex: 1;">Delete</button>
            </div>
        </div>
    `,
    )
    .join("")
}

function renderOrders() {
  const container = document.querySelector("#tab-orders .orders-list")
  if (!container) return

  container.innerHTML = recentOrders
    .map(
      (order) => `
        <div class="order-item">
            <div class="order-info">
                <h4>${order.id}</h4>
                <p>${order.vendor}</p>
                <p>${order.items}</p>
            </div>
            <div class="order-details">
                <p class="order-amount">${order.amount}</p>
                <span class="status-badge ${order.status}">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
            </div>
        </div>
    `,
    )
    .join("")
}

// Add Product Modal Functions
function openAddProductModal() {
  document.getElementById("add-product-modal").classList.add("active")
}

function closeAddProductModal() {
  document.getElementById("add-product-modal").classList.remove("active")
  document.getElementById("add-product-form").reset()
}

// Form submission handler
document.addEventListener("DOMContentLoaded", () => {
  const addProductForm = document.getElementById("add-product-form")
  if (addProductForm) {
    addProductForm.addEventListener("submit", (e) => {
      e.preventDefault()

      const productData = {
        name: document.getElementById("product-name").value,
        price: parseInt(document.getElementById("product-price").value),
        unit: document.getElementById("product-unit").value,
        minOrder: parseInt(document.getElementById("product-min-order").value),
        description: document.getElementById("product-description").value,
      }

      alert("Product added successfully!")
      closeAddProductModal()
      renderSupplierProducts()
    })
  }
})

// Close modals when clicking outside
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal")) {
    e.target.classList.remove("active")
  }
})

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  updateCartCount()
})
