# VendorConnect - Street Food Marketplace

A full-stack web application connecting street food vendors with trusted suppliers, built with Node.js, Express, MongoDB, and vanilla JavaScript.

## 🚀 Features

### For Vendors
- **Smart Recipe Search**: Search for dishes and get ingredient recommendations
- **Supplier Discovery**: Browse verified suppliers with ratings and reviews
- **Cart Management**: Add items to cart, manage quantities, and checkout
- **Cross-Device Sync**: Access your cart from any device
- **Order Tracking**: Track your orders and delivery status

### For Suppliers
- **Product Management**: Add, edit, and manage your product inventory
- **Order Management**: View and process incoming orders
- **Business Profile**: Manage your business information and hours
- **Analytics Dashboard**: View sales statistics and performance metrics

## 🛠 Tech Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with Flexbox and Grid
- **Vanilla JavaScript** - No frameworks, pure JS
- **Font Awesome** - Icon library

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB Atlas** - Cloud database
- **Mongoose** - MongoDB object modeling
- **JWT** - Authentication
- **bcryptjs** - Password hashing

### External APIs
- **TheMealDB API** - Recipe and ingredient data

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account
- Git

### Backend Setup

1. **Clone the repository**

2. **Install dependencies**


3. **Configure environment variables**


4. **Start the development server**

### Frontend Setup

1. **Navigate to frontend directory**

2. **Open with Live Server**
- Use VS Code Live Server extension
- Or serve with any static file server
- Open `index.html` in your browser

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory:


### Database Setup

1. Create a MongoDB Atlas account
2. Create a new cluster
3. Create a database user
4. Whitelist your IP address
5. Get your connection string
6. Update the `.env` file

## 🚀 Deployment

### Backend Deployment (Render/Railway)

1. **Push to GitHub**

2. **Deploy on Render**
- Connect your GitHub repository
- Set environment variables
- Deploy automatically

### Frontend Deployment (Netlify/Vercel)

1. **Update API endpoint**

2. **Deploy to Netlify**
- Drag and drop the frontend folder
- Or connect your GitHub repository

## 📱 Usage

### Getting Started

1. **Visit the application**
- Open the deployed frontend URL
- Or run locally and visit `http://localhost:5500`

2. **Register an account**
- Choose "Vendor" to buy ingredients
- Choose "Supplier" to sell products

3. **For Vendors**
- Search for dishes to get ingredient suggestions
- Browse suppliers and add items to cart
- Place orders and track delivery

4. **For Suppliers**
- Add your products to the marketplace
- Manage inventory and pricing
- Process incoming orders

## 🔐 Security Features

- **Password Hashing**: bcryptjs for secure password storage
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Server-side validation for all inputs
- **CORS Protection**: Configured CORS for security
- **Environment Variables**: Sensitive data stored securely

## 🧪 Testing

Run the backend tests:

## 📊 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Product Endpoints
- `GET /api/products` - Get all products with filters
- `POST /api/products` - Add new product (suppliers only)
- `GET /api/products/my-products` - Get supplier's products
- `DELETE /api/products/:id` - Delete product

### Cart Endpoints
- `GET /api/cart` - Get user's cart
- `POST /api/cart/add` - Add item to cart
- `DELETE /api/cart/remove/:itemId` - Remove item from cart
- `POST /api/cart/checkout` - Checkout cart

### Order Endpoints
- `GET /api/orders/vendor` - Get vendor's orders
- `GET /api/orders/supplier` - Get supplier's orders

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [TheMealDB](https://www.themealdb.com/) for recipe data
- [Font Awesome](https://fontawesome.com/) for icons
- [MongoDB Atlas](https://www.mongodb.com/atlas) for database hosting

## 📞 Support

For support, email support@vendorconnect.com or create an issue in the repository.

## 🗺 Roadmap

- [ ] Real-time notifications
- [ ] Payment integration
- [ ] GPS tracking for deliveries
- [ ] Mobile app development
- [ ] Multi-language support
- [ ] Advanced analytics dashboard

