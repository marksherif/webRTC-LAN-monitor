var current_user;
module.exports = function (app, passport) {

	/* GET home page. */
	app.get('/', isAuthenticated, function (req, res) {
		res.redirect('/dashboard');
	});

	app.post('/login', passport.authenticate('login', {
		successRedirect: '/dashboard',
		failureRedirect: '/login',
		failureFlash: true
	}));

	app.get('/login', function (req, res) {
		res.render('template/login', { message: req.flash('message') });
	});

	app.get('/logout', function (req, res) {
		req.logout();
		res.redirect('/');
	});


	app.get('/signup', function (req, res) {
		res.render('template/signup', { message: req.flash('message') });
	});

	/* Handle Registration POST */
	app.post('/signup', passport.authenticate('signup', {
		successRedirect: '/login',
		failureRedirect: '/signup',
		failureFlash: true
	}));
	app.get('/dashboard', isAuthenticated, function (req, res) {
		module.exports.current_user = req.session.passport.user
		res.render('template/index', {});
	});

	app.get('/monitor', function (req, res) {
		res.render('template/monitor');
	});
}
// As with any middleware it is quintessential to call next()
// if the user is authenticated
var isAuthenticated = function (req, res, next) {
	if (req.isAuthenticated())
		return next();
	res.redirect('/login');
}



