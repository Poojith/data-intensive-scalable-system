var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('http');
var mysql = require('mysql');
var validator = require('validator');
var session = require('client-sessions');

var index = require('./routes/index');
var users = require('./routes/users');
var app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.listen(8000, function () {
    console.log("Express server listening on port 8000");
});

app.use(session({
    cookieName: 'session',
    secret: 'eCommerce_session_secret',
    duration: 15 * 60 * 1000,
    activeDuration: 15 * 60 * 1000
}));

app.use('/', index);
app.use('/users', users);

var con = mysql.createConnection({
    host: "ediss.cewtnbpxcfvo.us-east-1.rds.amazonaws.com",
    port: "3306",
    user: "ediss_db_user",
    password: "edissdbpass"
});

con.connect(function (err) {

    if (err) throw err;
    console.log("Connected!");
    con.query("CREATE DATABASE IF NOT EXISTS eCommerce CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ;", function (err, result) {
        if (err) throw err;
        console.log("Database created");
    });

    con.query('use eCommerce');

    var createCustomerTable = "CREATE TABLE IF NOT EXISTS users " +
        "(fname VARCHAR(255), " + "lname VARCHAR(255), address TEXT, city TEXT, " +
        "state TEXT, zip VARCHAR(255), " +
        "email TEXT, username VARCHAR(100) PRIMARY KEY, password VARCHAR(255), " +
        "isAdmin TINYINT(0) UNSIGNED NOT NULL)";

    con.query(createCustomerTable, function (err, result) {
        if (err) throw err;
        console.log("Table users created");
    });

    var insertAdminCredentials = "INSERT INTO users " +
        "(fname, lname, address, city, state, zip, email, username, password, isAdmin) VALUES ?";
    var values = [
        ['Jenny', 'Admin', '5000 Forbes Ave', 'Pittsburgh', 'PA', '15213',
            'jenny@ecom.com', 'jadmin', 'admin', 1]];

    con.query(insertAdminCredentials, [values], function (err, result) {
        if (err) {
            console.log("Attempt to create duplicate record to admin_users");
            return;
        }
        console.log("Number of records inserted to admin_users: " + result.affectedRows);
    });

    var createProductsTable = "CREATE TABLE IF NOT EXISTS products " +
        "(asin VARCHAR(180) PRIMARY KEY, " + "productName VARCHAR(255), " +
        "productDescription VARCHAR(255), groupCategory VARCHAR(255))";

    con.query(createProductsTable, function (err, result) {
        if (err) {
            throw err;
        }
        console.log("Table products created");
    });
});

app.post('/registerUser', function (req, res) {
    var request = req.body;
    var firstName = request.fname;
    var lastName = request.lname;
    var address = request.address;
    var city = request.city;
    var state = request.state;
    var zip = request.zip;
    var email = request.email;
    var username = request.username;
    var password = request.password;
    var response;

    if (typeof request.fname === 'undefined' ||
        typeof request.lname === 'undefined' ||
        typeof request.address === 'undefined' ||
        typeof request.city === 'undefined' ||
        typeof request.state === 'undefined' ||
        typeof request.zip === 'undefined' ||
        typeof request.email === 'undefined' ||
        typeof request.username === 'undefined' ||
        typeof request.password === 'undefined') {
        response = {
            "message": "The input you provided is not valid"
        };
        res.send(response);
        return;
    }

    var isFieldEmpty = validator.isEmpty(firstName) || validator.isEmpty(lastName) ||
        validator.isEmpty(address) || validator.isEmpty(city) || validator.isEmpty(state) ||
        validator.isEmpty(zip) || validator.isEmpty(email) ||
        validator.isEmpty(username) || validator.isEmpty(password);

    if (isFieldEmpty) {
        response = {
            "message": "The input you provided is not valid"
        };
        res.send(response);
        return;
    }

    var queryCreateCustomer = "INSERT INTO users " +
        "(fname, lname, address, city, state, zip, email, username, password, isAdmin) VALUES ?";
    var values = [
        [firstName, lastName, address, city, state, zip, email, username, password, 0]];

    con.query(queryCreateCustomer, [values], function (err, result) {
        if (err) {
            response = {
                "message": "The input you provided is not valid"
            };
            console.log("Attempt to create duplicate record for " + username);
            console.log("ERROR THIS : "  + err.message);
            res.send(response);
            return;
        }

        console.log(queryCreateCustomer);
        var user = module.exports = function () {
            this.fname = firstName;
            this.lname = lastName;
            this.address = address;
            this.city = city;
            this.state = state;
            this.zip = zip;
            this.email = email;
            this.username = username;
            this.password = password;
        };

        // req.session.user = user;
        response = {
            "message": firstName + " was registered successfully"
        };
        res.send(response);

        console.log("Number of records inserted: " + result.affectedRows);
    });
});

app.post('/login', function (req, res) {
    var request = req.body;
    var username = request.username;
    var password = request.password;
    var response;

    con.query('use eCommerce');

    var sql = 'SELECT * FROM users WHERE username = ? AND password = ?';

    con.query(sql, [username, password], function (err, result) {
        if (err) throw err;
        if (result.length === 0) {
            response = {
                "message": "There seems to be an issue with the username/password combination that you entered"
            };
            req.session.reset();
        }
        else {
            response = {
                "message": "Welcome " + result[0].fname
            };
            req.session.user = result[0];
        }
        res.send(response);
        console.log(result);
    });
});

app.post('/logout', function (req, res) {
    var response;
    if (req.session && req.session.user) {
        response = {
            "message": "You have been successfully logged out"
        };
        req.session.reset();
    }
    else {
        response = {
            "message": "You are not currently logged in"
        };
    }
    res.send(response);
});

app.post('/updateInfo', function (req, res) {
    var request = req.body;
    var firstName = request.fname;
    var lastName = request.lname;
    var address = request.address;
    var city = request.city;
    var state = request.state;
    var zip = request.zip;
    var email = request.email;
    var username = request.username;
    var password = request.password;
    var response;
    var isFieldEmpty;

    if (req.session && req.session.user) {
        var user = req.session.user;
        if (!checkLogin(user.username, user.password)) {
            response = {
                "message": "You are not currently logged in"
            };
            req.session.reset();
            res.send(response);
            return;
        }

        var conditions = [];
        var values = [];

        if (typeof request.fname !== 'undefined') {
            conditions.push("fname = ?");
            isFieldEmpty = validator.isEmpty(request.fname);
            if(isFieldEmpty) {
                sendMissingFieldMessage(req, res);
                return;
            }
            values.push(request.fname);
        }

        if (typeof request.lname !== 'undefined') {
            conditions.push("lname = ?");
            isFieldEmpty = validator.isEmpty(request.lname);
            if(isFieldEmpty) {
                sendMissingFieldMessage(req, res);
                return;
            }
            values.push(request.lname);
        }

        if (typeof request.address !== 'undefined') {
            conditions.push("address = ?");
            isFieldEmpty = validator.isEmpty(request.address);
            if(isFieldEmpty) {
                sendMissingFieldMessage(req, res);
                return;
            }
            values.push(request.address);
        }

        if (typeof request.city !== 'undefined') {
            conditions.push("city = ?");
            isFieldEmpty = validator.isEmpty(request.city);
            if(isFieldEmpty) {
                sendMissingFieldMessage(req, res);
                return;
            }
            values.push(request.city);
        }

        if (typeof request.state !== 'undefined') {
            conditions.push("state = ?");
            isFieldEmpty = validator.isEmpty(request.state);
            if(isFieldEmpty) {
                sendMissingFieldMessage(req, res);
                return;
            }
            values.push(request.state);
        }

        if (typeof request.zip !== 'undefined') {
            conditions.push("zip = ?");
            isFieldEmpty = validator.isEmpty(request.zip);
            if(isFieldEmpty) {
                sendMissingFieldMessage(req, res);
                return;
            }
            values.push(request.zip);
        }

        if (typeof request.email !== 'undefined') {
            conditions.push("email = ?");
            isFieldEmpty = validator.isEmpty(request.email);
            if(isFieldEmpty) {
                sendMissingFieldMessage(req, res);
                return;
            }
            values.push(request.email);
        }

        if (typeof request.username !== 'undefined') {
            conditions.push("username = ?");
            isFieldEmpty = validator.isEmpty(request.username);
            if(isFieldEmpty) {
                sendMissingFieldMessage(req, res);
                return;
            }
            values.push(request.username);
        }

        if (typeof request.password !== 'undefined') {
            conditions.push("password = ?");
            isFieldEmpty = validator.isEmpty(request.password);
            if(isFieldEmpty) {
                sendMissingFieldMessage(req, res);
                return;
            }
            values.push(request.password);
        }

        conditions = conditions.length ?
            conditions.join(' , ') : '1';

        values.push(user.username);

        var updateCustomer = 'UPDATE users SET ' + conditions + 'WHERE username = ?';

        con.query(updateCustomer, values, function (err, result) {
            if (err || result.affectedRows === 0) {
                response = {
                    "message": "The input you provided is not valid"
                };
                console.log("Error in updating user with username : " + user.username);
                if (err) {
                    console.log(err.message);
                }
                res.send(response);
                return;
            }

            //TODO separate each API as a route

            if (typeof request.username !== 'undefined' && result.affectedRows !==0) {
                var sql = 'SELECT * FROM users WHERE username = ?';
                con.query(sql, [request.username], function (err, result) {
                    if (err) throw err;
                    if (result.length === 0) {
                        req.session.user.username = user.username;
                    }
                    else {
                        req.session.user = result[0];
                        console.log(" New username :  " + req.session.user.username);

                        response = {
                            "message": req.session.user.fname + " your information was successfully updated"
                        };
                        res.send(response);
                    }
                });
            } else {
                response = {
                    "message": user.fname + " your information was successfully updated"
                };
                res.send(response);
                console.log("Number of records updated: " + result.affectedRows);
            }
        });
    }

    else {
        response = {
            "message": "You are not currently logged in"
        };
        req.session.reset();
        res.send(response);
    }
});

app.post('/addProducts', function (req, res) {
    var request = req.body;
    var asin = request.asin;
    var productName = request.productName;
    var productDescription = request.productDescription;
    var groupVal = request.group;
    var response;

    if (req.session && req.session.user) {
        var user = req.session.user;
        if (!checkLogin(user.username, user.password)) {
            response = {
                "message": "You are not currently logged in"
            };

            req.session.reset();
            res.send(response);
            return;
        }

        if(user.isAdmin === 0) {
            response = {
                "message": "You must be an admin to perform this action"
            };

            res.send(response);
            return;
        }

        if (typeof request.asin === 'undefined' ||
            typeof request.productName === 'undefined' ||
            typeof request.productDescription === 'undefined' ||
            typeof request.group === 'undefined') {
            response = {
                "message": "The input you provided is not valid"
            };
            res.send(response);
            return;
        }

        var isFieldEmpty = validator.isEmpty(asin) || validator.isEmpty(productName) ||
            validator.isEmpty(productDescription) || validator.isEmpty(groupVal);

        if (isFieldEmpty) {
            response = {
                "message": "The input you provided is not valid"
            };
            res.send(response);
            return;
        }

        var queryAddProduct = "INSERT INTO products " +
            "(asin, productName, productDescription, groupCategory) VALUES ?";
        var values = [[asin, productName, productDescription, groupVal]];

        con.query(queryAddProduct, [values],
            function (err, result) {
                if (err) {
                    response = {
                        "message": "The input you provided is not valid"
                    };
                    console.log(err.message);
                    res.send(response);
                    return;
                }

                response = {
                    "message": productName + " was successfully added to the system"
                };

                res.send(response);
                console.log("Number of records inserted: " + result.affectedRows);
            });
    }

    else {
        response = {
            "message": "You are not currently logged in"
        };
        req.session.reset();
        res.send(response);
    }
});

app.post('/modifyProduct', function (req, res) {
    var request = req.body;
    var asin = request.asin;
    var productName = request.productName;
    var productDescription = request.productDescription;
    var group = request.group;
    var response;

    if (req.session && req.session.user) {
        var user = req.session.user;
        if (!checkLogin(user.username, user.password)) {
            response = {
                "message": "You are not currently logged in"
            };

            req.session.reset();
            res.send(response);
            return;
        }

        if(user.isAdmin === 0) {
            response = {
                "message": "You must be an admin to perform this action"
            };

            res.send(response);
            return;
        }

        if (typeof request.asin === 'undefined' ||
            typeof request.productName === 'undefined' ||
            typeof request.productDescription === 'undefined' ||
            typeof request.group === 'undefined') {
            response = {
                "message": "The input you provided is not valid"
            };
            res.send(response);
            return;
        }

        var isFieldEmpty = validator.isEmpty(asin) || validator.isEmpty(productName) ||
            validator.isEmpty(productDescription) || validator.isEmpty(group);

        if (isFieldEmpty) {
            response = {
                "message": "The input you provided is not valid"
            };
            res.send(response);
            return;
        }

        var updateCustomer = 'UPDATE products SET productName = ?, productDescription = ?,'
            + 'groupCategory = ?' + 'WHERE asin = ?';

        con.query(updateCustomer, [productName, productDescription, group, asin],
            function (err, result) {
                if (err || result.affectedRows === 0) {
                    response = {
                        "message": "The input you provided is not valid"
                    };
                    if (err) {
                        console.log(err.message);
                    }
                    res.send(response);
                    return;
                }

                response = {
                    "message": productName + " was successfully updated"
                };
                res.send(response);
                console.log("Number of records updated: " + result.affectedRows);
            });
    }

    else {
        response = {
            "message": "You are not currently logged in"
        };
        req.session.reset();
        res.send(response);

    }
});

app.post('/viewUsers', function (req, res) {
    var request = req.body;
    var response;

    if (req.session && req.session.user) {
        var user = req.session.user;
        if (!checkLogin(user.username, user.password)) {
            response = {
                "message": "You are not currently logged in"
            };

            req.session.reset();
            res.send(response);
            return;
        }

        if(user.isAdmin === 0) {
            response = {
                "message": "You must be an admin to perform this action"
            };

            res.send(response);
            return;
        }

        var conditions = [];
        var values = [];

        if (typeof request.fname !== 'undefined') {
            conditions.push("fname LIKE '%" + request.fname + "%' ");
        }

        if (typeof request.lname !== 'undefined') {
            conditions.push("lname LIKE '%" + request.lname + "%'");
        }

        var sql;
        if (conditions.length !== 0) {
            conditions = conditions.length ?
                conditions.join(' AND ') : '1';
            sql = 'SELECT * FROM users WHERE ' + conditions;
        } else {
            sql = 'SELECT * FROM users;';
        }
        //
        // console.log(conditions);
        // console.log(values);
        // console.log(sql);

        con.query(sql, function (err, result) {
            if (err) console.log(err.message);
            if (result.length === 0) {
                response = {
                    "message": "There are no users that match that criteria"
                };
            }
            else {
                var jsonArray = [];
                for (var i = 0; i < result.length; i++) {
                    var row = result[i];
                    jsonArray.push({"fname": row.fname, "lname": row.lname, "userId": row.username});
                }
                response = {
                    "message": "The action was successful",
                    "user": jsonArray
                };
            }
            res.send(response);
            console.log(result);
        });
    }

    else {
        response = {
            "message": "You are not currently logged in"
        };
        req.session.reset();
        res.send(response);
    }
});

app.post('/viewProducts', function (req, res) {
    var request = req.body;
    var asin = request.asin;
    var keyword = request.keyword;
    var groupCategory = request.group;
    var response;

    var conditions = [];
    var values = [];

    if (typeof request.asin !== 'undefined') {
        conditions.push("asin = '" + request.asin + "' ");
    }

    if (typeof request.keyword !== 'undefined') {
        conditions.push("( productName LIKE '%" + keyword + "%' OR " +
            "productDescription LIKE '%" + keyword + "%' )");
    }

    if(typeof request.group !== 'undefined') {
        conditions.push("groupCategory = '" + groupCategory + "'");
    }

    var sql;
    if (conditions.length !== 0) {
        conditions = conditions.length ?
            conditions.join('AND ') : '1';
        sql = 'SELECT * FROM products WHERE ' + conditions;
    } else {
        sql = 'SELECT * FROM products;';
    }
    //
    // console.log(conditions);
    // console.log(values);
    // console.log(sql);

    con.query(sql, function (err, result) {
        if (err) console.log(err.message);
        if (result.length === 0) {
            response = {
                "message": "There are no products that match that criteria"
            };
        }
        else {
            var jsonArray = [];
            for (var i = 0; i < result.length; i++) {
                var row = result[i];
                jsonArray.push({"asin": row.asin, "productName": row.productName});
            }
            response = {
                // "message": "The action was successful",
                "product": jsonArray
            };
        }
        res.send(response);
        console.log(result);
    });
});

function sendMissingFieldMessage(req, res) {
    var response;
    response = {
        "message": "The input you provided is not valid"
    };
    console.log("COMIGN HERE, YO!");
    res.send(response);
    return;
}


function checkLogin(username, password) {
    con.query('use eCommerce');
    var sql = 'SELECT * FROM users WHERE username = ? AND password = ?';
    con.query(sql, [username, password], function (err, result) {
        if (err) throw err;
        if (result.length === 0) {
            return false;
        }
    });
    return true;
}

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
