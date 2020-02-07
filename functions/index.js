/*

This is the backend of PYPAY system,using Firebase funcions and Express.

*/


//import libraries
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const ejs = require("ejs");
var cookieParser = require('cookie-parser');
var nodemailer = require('nodemailer');
var fs = require('fs');


//set google 
var transporter = nodemailer.createTransport({
	service: 'Gmail',
	auth: {
		user: 'pysales9029@gmail.com',
		pass: 'Databaseinfo123'
	}
});



//initialize firebase and express
admin.initializeApp(functions.config().firebase);
const app = express();


// Automatically allow cross-origin requests
app.use(cors({ origin: true }));


//combine cookieparser with express
app.use(cookieParser());


//serving static files with express
app.use(express.static('./public'));


//set .ejs folder
app.set('views', './views');


//initialize ejs engine,combining with express
app.set('view engine', 'ejs');


//create new user by frontend javascript,define HTTP port
app.post('/new', (req, res) => {

	let user = JSON.parse(req.body);

	console.log(`Received auth payload: ${req.body}`);

	res.set("Content-Type", "application/json;charset=UTF-8");

	const root = admin.database().ref(`/user-account`);


	root.orderByChild("user").equalTo(user.user).once("value", snapshot => {

		if (snapshot.val() !== null) {
			res.status(400).send(`{"error":"Username is already exists"}`);
		}

	});

	root.orderByChild("email").equalTo(user.email).once("value", snapshot => {

		if (snapshot.val() !== null) {
			res.status(400).send(`{"error":"Email is already exists"}`);
		} else {
			let newRef = root.push();

			newRef.set(JSON.parse(req.body), err => {
				if (err) {
					res.status(400).send(`{"error":"${err}"}`);
				} else {
					res.cookie('x-member-id', newRef.key, { maxAge: 900000 });
					res.status(201).send(`{"id":"${newRef.key}"}`);
				}

			});
		}
	});
});


app.post('/forgotemail', (req, res) => {

	let user = req.body;

	console.log(`Received auth payload: ${req.body}`);

	res.set("Content-Type", "application/json;charset=UTF-8");

	const root = admin.database().ref(`/user-account`);

	root.orderByChild("email").equalTo(user.remail).once("value", snapshot => {

		console.log(`found user: ${JSON.stringify(snapshot.val())}`);

		if (snapshot.val() !== null) {

			console.log(`${snapshot.val()[Object.keys(snapshot.val())[0]].pass}`);
			console.log(`${snapshot.val()[Object.keys(snapshot.val())[0]].email}`);
			var options = {

				from: 'pysales9029@gmail.com',

				to: snapshot.val()[Object.keys(snapshot.val())[0]].email,

				subject: 'PYPAY system - recover your account',

				text: 'Thanks for using PYPAY system.This is the password to recover your account:snapshot.val()[Object.keys(snapshot.val())[0]].pass\r\nThanks,\r\n PYPAY/PYsales team'

			};
			transporter.sendMail(options, function (error, info) {
				if (error) {
					res.status(401).send(`{"error":${error}}`);
				} else {
					res.status(201).send(`{"success":"Send email successfully!"}`);
				}
			});

		}
		else {
			res.status(400).send(`{"error":"The account does not exist"}`);
		}
	});
});



//create new user by URL
app.get('/create', (req, res) => {
	res.set("Content-Type", "application/json;charset=UTF-8");

	const root = admin.database().ref(`/user-account`);
	let newRef = root.push();

	newRef.set(req.query, err => {
		if (err) {
			res.status(400).send(`{"error":"${err}"}`);
		} else {
			res.status(201).send(`{"id":"${newRef.key}"}`);
		}
	});
});


//delete user account by URL
app.get('/user/:id/delete', (req, res) => {
	res.set("Content-Type", "application/json;charset=UTF-8");

	const user = admin.database().ref(`/user-account/${req.params.id}`);

	user.once('value', snapshot => {
		if (snapshot.val() !== null) {
			user.remove(err => {
				if (err) {
					res.status(400).send(`{"error":"${err}"}`);
				} else {
					res.status(200).send(`{"removed":"${req.params.id}"}`);
				}
			});
		}
		else {
			res.status(404).send(`{"error":"user ${req.params.id} does not exist"}`)
		}
	});
});


//delete user account by frontend javascript
app.post('/del', (req, res) => {

	let user = req.body;

	console.log(`Received auth payload: ${JSON.stringify(req.body)}`);

	res.set("Content-Type", "application/json;charset=UTF-8");

	const root = admin.database().ref(`/user-account/${user.user}`);

	root.once('value', snapshot => {
		if (snapshot.val() !== null) {
			root.remove(err => {
				if (err) {
					res.status(400).send(`{"error":"${err}"}`);
				} else {
					res.clearCookie('x-member-id');
					res.status(200).send(`{"removed":"${user.user}"}`);
				}
			});
		}
		else {
			res.status(404).send(`{"error":"user ${user.user} does not exist"}`)
		}
	});
});


//load user data by URL
app.get('/user/:id', (req, res) => {
	admin.database().ref(`/user-account/${req.params.id}`).once('value', (snapshot) => {
		res.set("Content-Type", "application/json;charset=UTF-8");

		if (snapshot.val() !== null) {
			res.status(200).send(JSON.stringify(snapshot.val()));
		} else {
			res.status(404).send(`{"error":"user ${req.params.id} does not exist"}`)
		}
	});
});


//load all users data by URL
app.get('/user', (req, res) => {
	admin.database().ref(`/user-account`).once('value', (snapshot) => {
		res.set("Content-Type", "application/json;charset=UTF-8");

		if (snapshot.val() !== null) {
			res.status(200).send(JSON.stringify(snapshot.val()));
		} else {
			res.status(404).send(`{"error":"the database is empty!"}`)
		}
	});
});


//pay money by URL
app.get('/pay', (req, res) => {
	res.set("Content-Type", "application/json;charset=UTF-8");

	const user = admin.database().ref(`/user-account/${req.query.id}`);

	user.once('value', snapshot => {

		if (snapshot.val() !== null) {

			let currentAmount = parseFloat(snapshot.val().balance);
			if (currentAmount >= parseFloat(req.query.amount)) {
				currentAmount -= parseFloat(req.query.amount);
				user.update({ balance: currentAmount }, () => {
					res.status(200).send(`${currentAmount}`);
				});
			} else {
				res.status(400).send(`${currentAmount}`)
			}
		}
		else {
			res.status(404).send(`{"error":"user ${req.query.id} does not exit"}`)
		}
	});
});


//add money by URL
app.get('/store', (req, res) => {
	res.set("Content-Type", "application/json;charset=UTF-8");

	const user = admin.database().ref(`/user-account/${req.query.id}`);

	user.once('value', snapshot => {

		if (snapshot.val() !== null) {
			let currentAmount = parseFloat(snapshot.val().balance);

			currentAmount += parseFloat(req.query.amount);
			user.update({ balance: currentAmount }, () => {
				res.status(200).send(`${currentAmount}`);
			});
		} else {
			res.status(404).send(`{"error":"user ${req.query.id} does not exit"}`);
		}

	});
});


//login API,define HTTP port POST/auth
app.post("/auth", (req, res) => {

	let user = req.body;

	console.log(`Received auth payload: ${JSON.stringify(req.body)}`);

	res.set("Content-Type", "application/json;charset=UTF-8");

	if (user && user.user && user.pass) {

		const root = admin.database().ref(`/user-account`);
		root.orderByChild("user").equalTo(user.user).once("value", snapshot => {

			console.log(`found user: ${JSON.stringify(snapshot.val())}`);

			if (snapshot.val() !== null && snapshot.val()[Object.keys(snapshot.val())[0]].pass === user.pass) {

				res.cookie('x-member-id', Object.keys(snapshot.val())[0], { maxAge: 900000 });

				res.status(200).send(`{"x-member-id":"${Object.keys(snapshot.val())[0]}"}`);

			} else {
				res.status(401).send(`{"error":"password incorrect or the account does not exit"}`);
			}
		});
	} else {
		console.log(`Database found no such user: ${req.user}`);
		res.status(401).send(`{"error":"password incorrect or the account does not exit"}`);
	}
});


//confirm password,modify password
app.post("/conpass", (req, res) => {

	let user = req.body;

	console.log(`Received auth payload: ${JSON.stringify(req.body)}`);

	res.set("Content-Type", "application/json;charset=UTF-8");

	if (user && user.user && user.pass && user.newpass) {

		const root = admin.database().ref(`/user-account/${user.user}`);

		root.once("value", snapshot => {

			console.log(`found user: ${JSON.stringify(snapshot.val())}`);

			if (snapshot.val() !== null && snapshot.val()[Object.keys(snapshot.val())[4]] === user.pass) {

				root.update({
					pass: user.newpass
				});
				res.status(200).send(`{"x-member-id":"${Object.keys(snapshot.val())[0]}"}`);

			} else {
				res.status(401).send(`{"error":"password incorrect"}`);
			}
		});
	} else {
		console.log(`Database found no such user: ${req.user}`);
		res.status(401).send(`{"error":"password incorrect"}`);
	}


});


//modify email
app.post("/newemail", (req, res) => {

	let user = req.body;

	console.log(`Received auth payload: ${JSON.stringify(req.body)}`);

	res.set("Content-Type", "application/json;charset=UTF-8");

	if (user && user.user && user.newemail) {

		const root = admin.database().ref(`/user-account/${user.user}`);

		root.once("value", snapshot => {

			root.update({
				email: user.newemail
			});
			res.status(200).send(`{"x-member-id":"${Object.keys(snapshot.val())[0]}"}`);

		});
	}
	else {
		console.log(`Database found no such user: ${req.user}`);
		res.status(401).send(`{"error":"Cannot modify email!"}`);
	}


});


//modify first name
app.post("/newFn", (req, res) => {

	let user = req.body;

	console.log(`Received auth payload: ${JSON.stringify(req.body)}`);

	res.set("Content-Type", "application/json;charset=UTF-8");

	if (user && user.user && user.newFn) {

		const root = admin.database().ref(`/user-account/${user.user}`);

		root.once("value", snapshot => {

			root.update({
				fname: user.newFn
			});
			res.status(200).send(`{"x-member-id":"${Object.keys(snapshot.val())[0]}"}`);

		});
	}
	else {
		console.log(`Database found no such user: ${req.user}`);
		res.status(401).send(`{"error":"Cannot modify first name!"}`);
	}
});


//modify last name
app.post("/newLn", (req, res) => {

	let user = req.body;

	console.log(`Received auth payload: ${JSON.stringify(req.body)}`);

	res.set("Content-Type", "application/json;charset=UTF-8");

	if (user && user.user && user.newLn) {

		const root = admin.database().ref(`/user-account/${user.user}`);

		root.once("value", snapshot => {

			root.update({
				lname: user.newLn
			});
			res.status(200).send(`{"x-member-id":"${Object.keys(snapshot.val())[0]}"}`);

		});
	}
	else {
		console.log(`Database found no such user: ${req.user}`);
		res.status(401).send(`{"error":"Cannot modify last name!"}`);
	}
});


//render signup HTML
app.get('/signup', (req, res) => {
	res.render('signup');
});


//render login HTML
app.get('/login', (req, res) => {
	res.render('login');
});


//render main HTML:index
app.get('/', function (req, res) {
	const member_cookie = req.cookies["x-member-id"];

	if (member_cookie) {

		res.render('index', { anonymous: 'none', member: 'block' });

	} else {

		res.render('index', { anonymous: 'block', member: 'none' });
	}
});


//render main HTML:PYPAY
app.get('/PYPAY', function (req, res) {
	const member_cookie = req.cookies["x-member-id"];

	if (member_cookie) {

		res.render('PYPAY', { anonymous: 'none', member: 'block' });

	} else {

		res.render('PYPAY', { anonymous: 'block', member: 'none' });
	}
});


//render main HTML:PYsales
app.get('/PYsales', function (req, res) {
	const member_cookie = req.cookies["x-member-id"];

	if (member_cookie) {

		res.render('PYsales', { anonymous: 'none', member: 'block' });

	} else {

		res.render('PYsales', { anonymous: 'block', member: 'none' });
	}
});


//render main HTML:demo
app.get('/demo', function (req, res) {
	const member_cookie = req.cookies["x-member-id"];

	if (member_cookie) {

		res.render('demo', { anonymous: 'none', member: 'block' });

	} else {

		res.render('demo', { anonymous: 'block', member: 'none' });
	}
});


//render main HTML:download
app.get('/download', function (req, res) {
	const member_cookie = req.cookies["x-member-id"];

	if (member_cookie) {

		res.render('download', { anonymous: 'none', member: 'block' });

	} else {

		res.render('download', { anonymous: 'block', member: 'none' });
	}
});


//logout
app.get('/logout', function (req, res) {

	res.clearCookie('x-member-id');

	res.redirect('https://us-central1-pypay-cloudserver.cloudfunctions.net/payment');
});


//render account HTML
app.get("/account", (req, res) => {

	const member_cookie = req.cookies["x-member-id"];

	if (member_cookie) {

		admin.database().ref(`/user-account/${member_cookie}`).once('value', (snapshot) => {

			if (snapshot.val() !== null) {

				res.render('account', snapshot.val());
			} else {
				res.clearCookie('x-member-id');
				res.redirect('https://us-central1-pypay-cloudserver.cloudfunctions.net/payment');
			}
		});
	} else {
		res.redirect('https://us-central1-pypay-cloudserver.cloudfunctions.net/payment');
	}
});


//request error
app.get('*', function (req, res) {

	res.set("Content-Type", "application/json;charset=UTF-8");

	res.status(404).send(`{"error": "request error"}`);

});


//android check
app.post("/androidchk", (req, res) => {

	let user = req.body;

	console.log(`Received auth payload: ${JSON.stringify(req.body)}`);

	res.set("Content-Type", "application/json;charset=UTF-8");

	if (user && user.user) {

		const root = admin.database().ref(`/user-account/${user.user}`);

		root.once("value", snapshot => {

			if(snapshot.val() !== null){

				res.status(200).send(`${snapshot.val()[Object.keys(snapshot.val())[2]]}`);
			}

			else

				console.log(`${snapshot.val()}`);
				res.status(401).send(`{"error":"Cannot found the account!"}`);

		});
	}
	else {
		console.log(`Database found no such user: ${req.user}`);
		res.status(401).send(`{"error":"Cannot found the account!"}`);
	}
});


//android data
app.post("/androiddata", (req, res) => {

	let user = req.body;

	console.log(`Received auth payload: ${JSON.stringify(req.body)}`);

	res.set("Content-Type", "application/json;charset=UTF-8");

	if (user && user.user) {

		const root = admin.database().ref(`/user-account/${user.user}`);

		root.once("value", snapshot => {

			if(snapshot.val() !== null)

				res.status(200).send(`${JSON.stringify(snapshot.val())}`);

			else

				console.log(`${snapshot.val()}`);
				res.status(401).send(`{"error":"Cannot found the account!"}`);

		});
	}
	else {
		console.log(`Database found no such user: ${req.user}`);
		res.status(401).send(`{"error":"Cannot found the account!"}`);
	}
});


//android login
app.post("/androidauth", (req, res) => {

	let user = req.body;

	console.log(`Received auth payload: ${JSON.stringify(req.body)}`);

	res.set("Content-Type", "application/json;charset=UTF-8");

	if (user && user.user && user.pass) {

		const root = admin.database().ref(`/user-account`);
		root.orderByChild("user").equalTo(user.user).once("value", snapshot => {

			console.log(`found user: ${JSON.stringify(snapshot.val())}`);

			if (snapshot.val() !== null && snapshot.val()[Object.keys(snapshot.val())[0]].pass === user.pass) {


				res.status(200).send(`${Object.keys(snapshot.val())[0]}`);

			} else {
				res.status(401).send(`{"error":"password incorrect or the account does not exit"}`);
			}
		});
	} else {
		console.log(`Database found no such user: ${req.user}`);
		res.status(401).send(`{"error":"password incorrect or the account does not exit"}`);
	}
});


//android signup
app.post('/androidnew', (req, res) => {

	let user = req.body;

	console.log(`Received auth payload: ${JSON.stringify(req.body)}`);

	console.log(`${user.user}`);

	res.set("Content-Type", "application/json;charset=UTF-8");

	const root = admin.database().ref(`/user-account`);


	root.orderByChild("user").equalTo(user.user).once("value", snapshot => {

		if (snapshot.val() !== null) {
			res.status(400).send(`{"error":"Username is already exists"}`);
		}
		else
		{
			root.orderByChild("email").equalTo(user.email).once("value", snapshot => {

				if (snapshot.val() !== null) {
					res.status(400).send(`{"error":"Email is already exists"}`);
				} else {
					let newRef = root.push();
		
					newRef.set(user, err => {
						if (err) {
							res.status(400).send(`{"error":"${err}"}`);
						} else {
							res.status(201).send(`${newRef.key}`);
						}
		
					});
				}
			});
		}

	});

	
});





//export all express definition to firebase
exports.payment = functions.https.onRequest(app);