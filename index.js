// SSL 사용 여부
const useSSL = false;

// config import
const config = require("./utils/config");

// 클러스터 서버 import
const cluster = require("cluster");

// 클러스트 부분
if (cluster.isMaster) {
    for (let i = 0; i < config.cluster_count; i++) {
        let worker = cluster.fork();
        worker.on('message', function(message){
            console.log("#" + worker.process.pid+": " + message);
        });
    }

    cluster.on('exit', function(worker, code, signal) {
		console.log('worker ' + worker.process.pid + ' died');
        cluster.fork();
	});

} else {
    // Master가 아니면 Slave 역할 하기
    doSlave();
}

function doSlave() {
    // Mongoose 초기화
    var mongoose = require("mongoose");
    var db = mongoose.connection;

    // MongoDB 서버 오픈 이벤트
    db.once("open", function(){
        console.log("Connected to mongod server");
    });
    
    // 연결
    mongoose.connect("mongodb://localhost/db1");
    mongoose.Promise = global.Promise;

    // 모듈들을 import
    var Article = require("./models/article.js")(mongoose);
    var http = require("http");
    var https = require("https");
    var fs = require("fs");
    var express = require("express");
    var app = express();

    // SSL init
    // 보안상으로 SSL 초기화 코드는 생략합니다


    // Express.js 초기화
    var bodyParser = require('body-parser');
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    app.set("views", __dirname + "/views");
    app.set("view engine", "html");
    app.use(express.static(__dirname + '/public'));


    // SSL 사용하면 http로 접근 시 https로 접속하게 리다이렉트하기
    if (useSSL) {
        app.all("*", ensureSecure);
        function ensureSecure(req, res, next) {
            if (req.secure) {
                return next();
            }
            res.redirect("https://" + req.hostname + req.url);
        }
    }

    // 서버 생성 및 Listening
    var server = http.createServer(app);

    server.listen(config.http_port, function(){
        process.send("HTTP server opening... port:"+config.http_port);
        
    });

    // SSL 사용 시 https 서버도 함께 열기
    if (useSSL) {
        var httpsServer = https.createServer(options, app);
        httpsServer.listen(config.https_port, function(){
            console.log("HTTPS server opening... port:"+config.https_port);
        });
    }

    let pid = process.pid;

    // 라우터 사용
    var router = require("./router/router")(app, Article, pid);
}