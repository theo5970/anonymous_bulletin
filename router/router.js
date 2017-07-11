module.exports = (app, Article) => {
	// app: Express 앱
	// Article: MongoDB Custom Schema
	
    // 모듈 import
    var hub = require("clusterhub");
    var config = require("../utils/config");
    var dateToString = require("../utils/dts");
    var xss = require("../utils/xss");
    var CryptoJS = require("crypto-js");
    var subjective_time = require("../utils/subjective_time");

    // 요청에서 클라이언트 IP 얻기
    function getClientIP(req) {
        let result = req.headers['x-forwarded-for'] || 
        req.connection.remoteAddress || 
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;

        // ::1이나 ::ffff:127.0.0.1은 같으므로 127.0.0.1으로 처리
        result = result.replace("::1", "127.0.0.1")
                .replace("::ffff:127.0.0.1", "127.0.0.1");
        return result;
    }
    
    // 클라이언트에게 보내는 글 리스트 최적화
    // IP를 글 객체에서 없애고 좋아요 IP 리스트를 갯수로 치환
    function optimizeList(article_list) {
        let article_count = article_list.length;
        for (let i=0; i<article_count; i++) {
            let article = article_list[i];

            let likes_count = article.likes.length;
            article.likes = likes_count;
            article.ip = undefined; // ip 속성 없애기
        };
    }

    // 자신이 누른 좋아요 게시글 목록
    // article.ejs에서 자신이 누른 좋아요 버튼을 active하기 위해 사용
    function getSelfLikedList(article_list, self_ip) {
        let result = [];
        let article_count = article_list.length;

        for (let i=0; i<article_count; i++) {
            let article = article_list[i];
            if (article.likes.indexOf(self_ip) !== -1) {
                result.push(article._id);
            }
        }
        return result;
    }

    app.all('*', (req, res, next) => {
        process.send("#" + process.pid + " had received response.");
        next();
    });
    // 메인 홈 요청
    app.get("/", (req, res, next) => {
        let article_count = 0;
        let normalArticles = [];    // 일반 게시물
        let noticeArticles = [];    // 공지사항 게시물

        Article.count().exec((err, count) => {
            if (err) {
                console.log(err);
            }

            article_count = count;

            Article.find().sort({id: -1})
            .limit(config.mainpage_limit).exec((err, list) => {
                if (err) {
                    console.log(err);
                }
                normalArticles = list;
                second();  // 두번째로 실행되는 함수
            });
        });

        let second = () => {
            // type=1(공지사항)인 게시물을 찾아서 정렬
            Article.aggregate([
                {$sort: {type: -1}},
                {$match: {type: 1.0}}
            ]).exec((err, list) => {
                noticeArticles = list;
                if (!noticeArticles) {
                    noticeArticles = [];
                }

                // 글 리스트 최적화
                optimizeList(normalArticles);
                optimizeList(noticeArticles);

                // 렌더링
                res.render("index.ejs", 
                {
                    articles: normalArticles, 
                    notices: noticeArticles, 
                    subjective_time: subjective_time,
                    article_count: article_count
                });
                next();
            });
        }
       
    });

    // 글 올리기 요청
    app.post("/post", (req, res, next) => {
        // post 데이터
        let data = req.body;

        // 전체 글 수 (id를 계산하기 위해)
        let article_count = 0; 

        // 클라이언트 IP
        let client_ip = getClientIP(req);

        // 글 수를 알아내고 나서 실행할 함수
        let func;

        // 글 수 계산 (모두 검색)
        Article.count().exec({}, (err, count) => {
            article_count = count;
            func();
        });

        // 글 수를 알아내고 실행될 함수
        func = () => {
            // 새로운 글 객체
            let new_article = new Article({
                id: article_count + 1,
                title: data.title,
                context: xss.filterContext(data.context),   // XSS 필터
                time: new Date().getTime(),
                ip: CryptoJS.SHA256(client_ip), // IP 해시화
                type: 0,  
                likes: [],
                comments: []
            });

            // 서버에 보낼 결과
            let result = 
            { 
                isSuccess: true, 
                messages: []
            }
            
            // 제목이 너무 짧거나 길다면
            if (new_article.title.length < config.min_article_title_length 
                || new_article.title.length > config.max_article_title_length) {

                result.isSuccess = false;
                result.messages.push("제목이 너무 짧거나 깁니다");
            }

            // 내용이 너무 짧거나 길다면
            if (new_article.context.length < config.min_article_context_length 
                || new_article.context.length > config.max_article_context_length) {
                    
                result.isSuccess = false;
                result.messages.push("내용이 너무 짧거나 깁니다");
            }
            
            // 결과가 성공이라면
            if (result.isSuccess) {
                // DB에 저장한다
                new_article.save(function(err){
                    if (err) {
                        console.error(err);
                    }
                });
            }

            res.send(result);
            next();
        };
    });

    // 글에 좋아요 요청
    app.post("/post_like", (req, res, next) => {
        let result = {
            isSuccess: true,
            count: 0,
            isLiked: false
        };
        let dbid = req.body._id;
              
        Article.findOne({_id: dbid}, (err, article) => {
            let client_ip = CryptoJS.SHA256(getClientIP(req)).toString();   // IP 암호화
            let article_ip = CryptoJS.SHA256(article.ip).toString();        // IP 암호화
            let ip_list = article.likes;                                    // 게시글에 좋아요를 누른 IP들

            let isLike = ip_list.indexOf(client_ip) === -1;                 // 좋아요를 해야 하는지 확인
            let updates = isLike ? {
                // 좋아요를 해야하면 리스트에 등록한다
                $push: {likes : client_ip}
            } : {
                // 좋아요를 이미 했으면 리스트에서 뺀다
                $pull: {likes : client_ip}
            };

            // 게시글 좋아요 업데이트
            Article.update({_id: dbid}, updates, {multi: true}, (err) => {
                if (err) {
                    console.log(err);
                }
                
                result.isLiked = isLike;
                result.count = article.likes.length + (isLike ? 1 : -1);
                sendResult();
            });
            
            function sendResult() {
                res.send(result);
                next();
            }
           
        });
        

    });

    // 댓글 달기 요청
    app.post("/post_comment", (req, res, next) => {
        // 요청 결과
        let result = {
            isSuccess: true, 
            messages: []
        };

        // 고유 글 id(DB에서)
        let dbid = req.body._id;

        // 댓글 내용
        let context = req.body.context;
        
        // 현재 시간
        let time = new Date().getTime();


        // 고유 글 id와 댓글 내용이 없다면 에러났다고 뿜는다.
        if (dbid === undefined || context === undefined) {
            result.isSuccess = false;
            result.messages.push("Internal Error");
            res.send(result);
            return;
        }

        // 댓글 내용이 너무 짧거나 길다면
        if (context.length >= config.min_comment_length 
            && context.length <= config.max_comment_length) {
            // 새로운 댓글 객체
            let new_comment = {
                context: context,
                time: time
            };

            // 글 업데이트
            Article.findOneAndUpdate({_id: dbid}, 
            {$push:        // 리스트에 넣는다
                {comments: // 댓글에
                    {
                        time: time,         // 시간
                        context: context    // 내용
                    }
                }
            }, (err, comment) => {          // 결과
                result.isSuccess = true;
                res.send(result);
                next();
            });
            
        } else {
            // 댓글 내용이 너무 짧거나 길다면 '실패'라고 보낸다
            result.isSuccess = false;
            result.messages.push("내용이 너무 짧거나 깁니다");

            res.send(result);
            next();
        }
        
        
    });
    // 모든 글을 표시하기
    app.get("/all", (req, res) => {
        // URL 쿼리 (?pages=n)
        let query = req.query;

        // 글 개수
        let length = 0;

        // 전체 페이지 수
        let all_pages = 0;

        // 현재 페이지 (기본: 1)
        let current_page = 1;

        let options = [];

        // 클라이언트 IP 해시화한거
        let client_ip = CryptoJS.SHA256(getClientIP(req)).toString();

        if (query.page >= config.max_page) {
            res.render("error.ejs", 
                {title: "페이지 표시 오류", 
                context: "Error: "+config.max_page + " 페이지 이상은 표시하지 않습니다."
                });
            return;
        }

        
        // 글 개수 세고 
        // 현재/전체 페이지 계산
        Article.count().exec({}, 
            (err, articles_count) => {
                // 전체 글 개수
                length = articles_count;

                // 전체 페이지 개수
                max_pages = config.max_page;

                // 현재 페이지 값
                current_page = (query.page !== undefined) ? query.page : 1;
                
                // MongoDB에서 skip 값
                let start = (current_page - 1) * config.eachpage_count;

                // 다하면 글 리스트 표시
                render(length, start, config.eachpage_count);
            }
        );
        
        // 렌더링 (글 표시하기)
        function render(all_count, skip_count, limit_count) {

            // 시간 순으로 정렬하고
            // 계산된 페이지로 인덱싱하고 실행

            process.send([skip_count, limit_count]);

            
            Article.aggregate([
            {"$sort": {"time": -1}},
            {"$skip": skip_count},
            {"$limit": config.eachpage_count}]
            
            ).exec((err, list) => {
                if (err) { throw err; }

                // 자신이 좋아요 누른 글 _id 리스트
                let self_likes = getSelfLikedList(list, client_ip);

                // 글 리스트 최적화
                optimizeList(list, client_ip);

                // 최종 렌더링
                res.render("article.ejs", 
                { 
                    isFindMulti: true,  // 여러개를 표시
                    articles: list, 
                    dateToString: dateToString.convert, 
                    current_page: current_page, 
                    all_pages: all_pages,
                    self_likes: self_likes,
                    start_view: Math.floor(current_page / 10) * 10 - 1,
                    end_view: Math.floor(current_page / 10) * 10 + 10,
                    eachpage_count: config.eachpage_count
                });
            });
        }
    });

    // 해당하는 id의 글만 표시
    app.get("/:id", (req, res) => {
        // 해시화된 클라이언트 IP
        let client_ip = CryptoJS.SHA256(getClientIP(req)).toString();
        
        // id가 정수가 아니면 오류 리턴
        if (!(/^[0-9]+$/.test(req.params.id))) {
            res.send("Error");
            return;
        }

        // id에 해당하는 글 찾기
        Article.find({"id": req.params.id}).exec((err, list) => {
            if (err) { throw err; }
            
            // 리스트가 비어있지 않다면
            if (list !== undefined && list.length > 0) {

                // 자신이 좋아요 누른 글 _id 리스트
                let self_likes = getSelfLikedList(list, client_ip);
                
                // 글 리스트 최적화
                optimizeList(list, client_ip);
                
                // 렌더링
                res.render("article.ejs", 
                {
                    isFindMulti: false,
                    articles: list,
                    dateToString: dateToString.convert,
                    self_likes: self_likes
                });
            } else {
                res.render("error.ejs", 
                {title: "404 NOT FOUND", 
                context: "지금 너가 찾고 있는 페이지는.. 하늘로 증발했거나 땅으로 떨어졌으리라...     by 누군가"
                });
            }
        });
    });
}