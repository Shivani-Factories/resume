const express = require("express"),
    mongoose = require("mongoose"),
    passport = require("passport"),
    bodyParser = require("body-parser"),
    LocalStrategy = require("passport-local").Strategy,
    flash = require("connect-flash"),
    path = require('path');

const User = require("./model/User");

let app = express();

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/feedbackAppDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Set views directory
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(require("express-session")({
    secret: "Rusty is a dog",
    resave: false,
    saveUninitialized: false
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());
app.use(flash()); // Use connect-flash

// Passport configuration
passport.use(new LocalStrategy(
    async function(username, password, done) {
        try {
            const user = await User.findOne({ username: username }).exec();
            if (!user) {
                return done(null, false, { message: 'Incorrect username.' });
            }
            if (user.password !== password) {
                return done(null, false, { message: 'Incorrect password.' });
            }
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }
));
passport.serializeUser(function(user, done) {
    done(null, user.id);
});
passport.deserializeUser(async function(id, done) {
    try {
        const user = await User.findById(id).exec();
        done(null, user);
    } catch (err) {
        done(err);
    }
});

// Routes
app.get("/", function (req, res) {
    res.render("home.ejs");
});

app.get("/register", function (req, res) {
    res.render("register.ejs", { message: req.flash("error") });
});

app.post("/register", async (req, res) => {
    try {
        const user = new User({
            username: req.body.username,
            password: req.body.password // Store plain text password
        });
        await user.save();
        res.redirect("/login");
    } catch (error) {
        req.flash("error", error.message);
        res.redirect("/register");
    }
});

app.get("/login", function (req, res) {
    res.render("login.ejs", { message: req.flash("error") });
});

app.post("/login", passport.authenticate("local", {
    successRedirect: "/home",
    failureRedirect: "/login",
    failureFlash: true
}));

app.get("/home", isLoggedIn, function (req, res) {
    res.sendFile(path.join(__dirname, "/public/home.html"));
});

app.get("/logout", function (req, res) {
    req.logout(function (err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

app.get("/feedback_form", function (req, res) {
    res.render("feedback_form.pug");
});

app.post("/feedback_form", function (req, res) {
    const feedData = new feedModal({
        Name: req.body.name,
        Email: req.body.email,
        Feedback: req.body.feedback
    });
    feedData.save()
        .then(data => {
            res.render('feedback_form.pug', { msg: "Your feedback has been successfully saved." });
        })
        .catch(err => {
            res.render('feedback_form.pug', { msg: "Error! Check your details and try again." });
        });
});

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect("/login");
}

const feedschema = mongoose.Schema({
    Name: String,
    Email: String,
    Feedback: String
});

const feedModal = mongoose.model('feeds', feedschema);

let port = process.env.PORT || 5500;
app.listen(port, function () {
    console.log("Server Has Started!");
});
