var useSSL = false;

var cluster = require("cluster");

var count_404 = 0;
if (cluster.isMaster) {
    for (let i=0; i<4; i++) {
        let worker = cluster.fork();
        worker.on('message', function(message){
            console.log("#"+worker.process.pid+": " + message);
        });
    }
    cluster.on('exit', function(worker, code, signal) {
		console.log('worker ' + worker.process.pid + ' died');
        cluster.fork();
	});

} else {
    doSlave();
}

function doSlave() {
    // Mongoose init
    var mongoose = require("mongoose");
    var db = mongoose.connection;
    db.once("open", function(){
        console.log("Connected to mongod server");
    });
    
    mongoose.connect("mongodb://localhost/db1");
    mongoose.Promise = global.Promise;

    var Article = require("./models/article.js")(mongoose);
    // Express.js init
    var http = require("http");
    var https = require("https");
    var fs = require("fs");
    var express = require("express");
    var app = express();

    // SSL init
    // 보안상으로 SSL 초기화 코드는 생략합니다

    var bodyParser = require('body-parser');
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    app.set("views", __dirname + "/views");
    app.set("view engine", "html");
    app.use(express.static(__dirname + '/public'));



    if (useSSL) {
        app.all("*", ensureSecure);
        function ensureSecure(req, res, next) {
            if (req.secure) {
                return next();
            }
            res.redirect("https://" + req.hostname + req.url);
        }
    }

    var server = http.createServer(app);

    server.listen(3000, function(){
        process.send("HTTP server opening... port:3000");
        
    });

    if (useSSL) {
        var httpsServer = https.createServer(options, app);
        httpsServer.listen(443, function(){
            console.log("HTTPS server opening... port:443");
        });
    }

    let pid = process.pid;
    var router = require("./router/router")(app, Article, pid);
}