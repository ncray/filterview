var util    = require('util'),
    http    = require('http'),
    fs      = require('fs'),
    express = require('express'),
    nstatic = require('node-static'),
    Db      = require('mongodb').Db,
    Connection = require('mongodb').Connection,
    Server  = require('mongodb').Server,
    BSON    = require('mongodb').BSONNative;

var homefile   = (process.argv[2] || "./unit/plotlocal.html"),
    host       = "localhost",
    port       = 8000,
    fileserver = new nstatic.Server({cache: false});

///////////////////////////
// Connecting to MongoDB //
///////////////////////////

var dbname = "foo",
    dbhost = "localhost",
    dbport = 27018;

console.log('Connecting to db %s at http://%s:%s/', dbname, dbhost, dbport);
var db = new Db(dbname, new Server(dbhost, dbport, {}));
db.open(function (err, db) {});
console.log("Connected.");

//////////////////////
// Helper Functions //
//////////////////////

/* Replace any valid RegExp string with its object form */
function parseRegExps (obj) {
    var isRe = /^\/(?:(.*))\/(?:(.*))$/;
    for (var key in obj) {
        var match = isRe.exec(obj[key]);
        if (match) {
            obj[key] = new RegExp(match[1], match[2]);
        }
    }
    return obj;
};

function isInteger (x) {
    return ((typeof x == "number") && (x.toString().search(/^-?[0-9]+$/) == 0));
};

function isFloat (x) {
    return ((typeof x == "number") && (x.toString().search(/^-?[0-9]+$/) != 0));
};

// Taken from John Resig's book
Function.prototype.partial = function () {
    var fn = this, args = Array.prototype.slice.call(arguments);
    return function () {
        var arg = 0;
        for (var i = 0; i < args.length && arg < arguments.length; i++) {
            if (args[i] === undefined) {
                args[i] = arguments[arg++];
            }
        }
        return fn.apply(this, args);
    };
};

///////////////////////
// Create app server //
///////////////////////
app = express.createServer(
    express.bodyParser()
);

// Cache webapp's html
app.set('indexTemplate', fs.readFileSync(homefile, 'utf8'));
util.puts("Loaded "+homefile);

/////////////////////
// Express Routing //
/////////////////////
app.get('/', function (req, res) {
    res.send(app.set('indexTemplate'));
});

app.get('/ui/:attr', function (req, res) {
    var metadata = {}, attr = req.params.attr;
    db.collection("three_cluster", function (err, coll) {
        coll.find({}, {}, function (err, cursor) {
            cursor.nextObject(function(err, sample) {
                var ex = sample[attr];
                if (typeof ex == 'number') {
                    metadata.datatype = isInteger(ex) ? "integer" : "float";
                } else {
                    metadata.datatype = (typeof ex);
                }
                if (metadata.datatype == "float") {
                    coll.find({}, {attr:1, "sort":[[attr, 1]]}, function (err, cursor2) {
                        cursor2.nextObject(function (err, first) {
                            metadata.reps = [first[attr]];
                            coll.find({}, {attr:1, "sort":[[attr, -1]]}, function (err, cursor3) {
                                cursor3.nextObject(function(err, last) {
                                    metadata.reps[1] = last[attr];
                                    res.send(metadata);
                                });
                            });
                        });
                    });
                } else {
                    coll.distinct(attr, function (err, items) {
                        metadata.reps = items;
                        res.send(metadata);
                    });
                }
            });
        });
    });
});

app.get('/summary/:attr', function (req, res) {
    var summary = {}, attr = req.params.attr;
    db.collection("three_cluster", function (err, coll) {
        coll.find({}, {attr:1, "sort":[[attr, 1]]}, function (err, cursor) {
            cursor.nextObject(function(err, min) {
                summary.range = [min[attr]];
                coll.find({}, {attr:1, "sort":[[attr, -1]]}, function (err, cursor2) {
                    cursor2.nextObject(function(err, max) {
                        summary.range.push(max[attr]);
                        coll.count(function(err, count) {
                            summary.count = count;
                            res.send(summary);
                        });
                    });
                });
            });
        });
    });
});

app.get('*', function(req, res) {
    fileserver.serve(req, res);
});

// Only works for one cui element right now
app.post('/cui', function (req, res) {
    var uiquery = JSON.parse(req.body.q);
    var field = req.body.f;
    var params = [];
    parseRegExps(uiquery);
    db.collection("three_cluster", function (err, coll) {
        coll.find(uiquery, function (err, cursor) {
            cursor.nextObject(function(err, sample) {
                if (sample === null) {
                    res.send(null);
                    return;
                }
                var ex = sample[field];
                if (isFloat(ex)) {
                    coll.find(uiquery, {field:1, "sort":[[field, 1]]}, function (err, cursor2) {
                        cursor2.nextObject(function (err, first) {
                            params.push(first[field]);
                            coll.find(uiquery, {field:1, "sort":[[field, -1]]}, function (err, cursor3) {
                                cursor3.nextObject(function(err, last) {
                                    params.push(last[field]);
                                    res.send(params);
                                });
                            });
                        });
                    });
                } else {
                    coll.distinct(field, uiquery, function (err, items) {
                        res.send(items);
                    });
                }
            });
        });
    });
});

app.post('/filter', function (req, res) {
    var query = JSON.parse(req.body.q);
    var attrs = JSON.parse(req.body.a);
    parseRegExps(query);
    attrs._id = 0; // don't want to send back id
    db.collection("three_cluster", function (err, coll) {
        coll.find(query, attrs, function(err, cursor) {
            cursor.toArray(function(err, items) {
                res.send(items);
            });
        });
    });
});

app.listen(8000);

util.puts('Server is ON and POPPIN');
console.log('Listening at http://%s:%s/', host, port);
