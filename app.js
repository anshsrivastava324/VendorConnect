const express = require('express');
const path = require('path');
const session = require('express-session');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'vendorsecretkey',
    resave: false,
    saveUninitialized: false
}));

const users = [];

const suppliers = [
    { name: 'Agarwal Wholesalers', material: 'Vegetable Carts', price: '₹1500', contact: '9876543210' },
    { name: 'Kumar Plastic Mart', material: 'Plastic Covers', price: '₹100/100pcs', contact: '9990001112' },
    { name: 'Delhi Wheels', material: 'Pushcart Wheels', price: '₹250 each', contact: '8881234567' }
];

app.use((req, res, next) => {
    res.locals.currentUser = req.session.user;
    next();
});

app.get('/', (req, res) => res.render('index'));
app.get('/suppliers', (req, res) => res.render('suppliers', { suppliers }));
app.get('/contact', (req, res) => res.render('contact'));
app.get('/login', (req, res) => res.render('login'));
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const found = users.find(u => u.username === username && u.password === password);
    if (found) {
        req.session.user = username;
        res.redirect('/suppliers');
    } else {
        res.send("Invalid login. <a href='/login'>Try again</a>");
    }
});
app.get('/register', (req, res) => res.render('register'));
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    users.push({ username, password });
    req.session.user = username;
    res.redirect('/suppliers');
});
app.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});
app.listen(3000, () => console.log("Server running at http://localhost:3000"));