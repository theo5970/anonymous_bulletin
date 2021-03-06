module.exports = (app, Article) => {
	// app: Express 앱
	// Article: MongoDB Custom Schema
	
    // 모듈 import
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

    // 메인 홈 요청
    app.get("/", (req, res, next) => {
        let article_count = 0;      // 전체 게시물 수
        let normalArticles = [];    // 일반 게시물
        let noticeArticles = [];    // 공지사항 게시물

        Article.count().exec((err, count) => {
            if (err) {
                console.log(err);
            }

            article_count = count;
            
            // id 를 내림차순 정렬하고 첫페이지에 표시할 만큼 끊는다
            Article.find().sort({id: -1})
            .limit(config.mainpage_limit).exec((err, list) => {
                if (err) {
                    console.log(err);
                }
                normalArticles = list;
                second();  // 두번째로 실행되는 함수를 호출
            });
        });

        let second = () => {
            // type=1 (공지사항)인 글을 찾아서 정렬
            Article.aggregate([
                {$sort: {type: -1}},
                {$match: {type: 1.0}}
            ]).exec((err, list) => {
                // 공지사항 글 리스트 설정
                noticeArticles = list;

                // 공지사항 글이 하나라도 없으면 비워둔다
                if (!noticeArticles) {
                    noticeArticles = [];
                }

                // 글 리스트 최적화
                optimizeList(normalArticles);
                optimizeList(noticeArticles);

                // 렌더링
                res.render("index.ejs", 
                {
                    // 일반 글 리스트
                    articles: normalArticles, 

                    // 공지사항 글 리스트
                    notices: noticeArticles, 

                    // 주관적인 시간 함수
                    subjective_time: subjective_time,

                    // 전체 게시물 수
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
                // 글 id : 글 개수 + 1
                id: article_count + 1,

                // 글 제목
                title: data.title,

                // 글 내용
                context: xss.filterContext(data.context),   // XSS 필터

                // 글이 작성된 날짜/시간
                time: new Date().getTime(),

                // 글을 작성한 클라이언트의 IP
                ip: CryptoJS.SHA256(client_ip), // IP 해시화

                // 글이 공지사항인지 확인하는 것 (type=0 : 일반, type=1 : 공지)
                type: 0,  

                // 좋아요를 누른 클라이언트의 IP 리스트 (해시화됨)
                likes: [],

                // 댓글 리스트
                comments: [],

                // 비밀번호가 있으면 그대로, 없으면 undefined로 바꾼다.
                password: data.password.length > 0 ? data.password : undefined
            });

            // 서버에 보낼 결과
            let result = 
            { 
                isSuccess: true, 
                messages: []
            }
            

            // 비밀번호가 1자리 수 이상이면 (0인 경우는 없는 경우로 간주하여 무시한다)
            if (new_article.password !== undefined) {
                // 비밀번호가 너무 짧거나 길다면
                if (new_article.password.length < config.min_password_length
                    || new_article.password.length > config.max_password_length) {
                    
                    result.isSuccess = false;
                    result.messages.push("비밀번호가 너무 짧거나 깁니다")
                }
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
                // 비밀번호를 해시화한다.
                if (new_article.password !== undefined) {
                    new_article.password = CryptoJS.SHA256(new_article.password);
                }

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

        // 고유 id
        let dbid = req.body._id;
        
        // DB에서 고유 id와 일치하는 게시물을 하나 찾는다
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

                // 좋아요를 했다가 취소할 수 있도록 함
                result.count = article.likes.length + (isLike ? 1 : -1);
                sendResult();
            });
            
            // 결과를 클라이언트에 전송한다
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

    // 그냥 /all 만 요청했을 시 /all/1로 보내기
    app.get("/all", (req, res) => {
        res.redirect("/all/1");
    });

    // 모든 글을 표시하기
    app.get("/all/:page", (req, res) => {
        // 요청한 페이지
        let req_page = Number(req.params.page);

        // 글 개수
        let length = 0;

        // 전체 페이지 수
        let all_pages = 0;

        // 현재 페이지 (기본: 1)
        let current_page = 1;

        // 클라이언트 IP 해시화한거
        let client_ip = CryptoJS.SHA256(getClientIP(req)).toString();

        if (req_page >= config.max_page) {
            res.render("error.ejs", {
                title: "페이지 표시 오류", 
                context: "Error: "+config.max_page + " 페이지 이상은 표시하지 않습니다."
            });
            return;
        }

        if (req_page <= 0) {
            res.render("error.ejs",{
                title: "페이지 표시 오류",
                context: "Error: 0 이하의 페이지는 표시할 수 없습니다"
            });
            return;
        }

        
        // 글 개수 세고 
        // 현재/전체 페이지 계산
        Article.count().exec({}, 
            (err, articles_count) => {
                // 전체 글 개수
                length = articles_count;

                // 전체 페이지 수
                all_pages = Math.ceil(length / config.eachpage_count);

                // 현재 페이지 값
                current_page = (req_page !== undefined) ? req_page : 1;
                
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
                    // 여러 개를 출력한다
                    isFindMulti: true,

                    // 글 리스트
                    articles: list, 

                    // Date 객체를 문자열로 표현하는 함수
                    dateToString: dateToString.convert, 

                    // 현재 페이지
                    current_page: current_page,

                    // 전체 페이지 수 
                    all_pages: all_pages,

                    // 최대 페이징 가능한 페이지 수
                    max_pages: config.max_page,

                    // 클라이언트 자신이 좋아요 한 글 리스트
                    self_likes: self_likes,

                    // 페이징 시작점
                    start_view: Math.floor(current_page / 10) * 10,

                    // 페이징 종점
                    end_view: Math.floor(current_page / 10) * 10 + 10,

                    // 각각 페이지에 표시할 글 수
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
        if (!(/^\+?(0|[1-9]\d*)$/.test(req.params.id))) {

            // 좀 참신하게 404 페이지를 표시하기
            res.render("error.ejs", 
                {title: "404 NOT FOUND", 
                context: "지금 너가 찾고 있는 페이지는.. 하늘로 증발했거나 땅으로 떨어졌으리라...     by 누군가"
            });
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
                    // 한 개만 표시한다
                    isFindMulti: false,

                    // 글 리스트
                    articles: list,

                    // Date 객체를 문자열로 변환
                    dateToString: dateToString.convert,

                    // 클라이언트 자신이 좋아요 한 글 리스트
                    self_likes: self_likes
                });
            } else {
                // 좀 참신하게 404 페이지를 표시하기
                res.render("error.ejs", 
                    {title: "404 NOT FOUND", 
                    context: "지금 너가 찾고 있는 페이지는.. 하늘로 증발했거나 땅으로 떨어졌으리라...     by 누군가"
                });
            }
        });
    });

    // 글 삭제 요청
    app.post("/delete_article", (req, res) => {
        // 요청 결과
        let result = {
            isSuccess: true,
            messages: []
        }

        // 고유 _id
        let req_id = req.body._id;
        // 비밀번호
        let req_password = CryptoJS.SHA256(req.body.password).toString();

        // Article에서 해당되는 글 하나를 찾는다
        Article.findOne({_id: req_id}, (err, article) => {
            // 실제 비밀번호
            let article_password = article.password;

            // 비밀번호가 있으면 Words -> String 작업
            if (article_password !== undefined) {
                article_password = article_password.toString();
            } else {
                // 비밀번호가 없으면 실패로 넘기기
                result.isSuccess = false;
                result.messages.push("비밀번호가 없는 글입니다");
                res.send(result);
                return;
            }

            // 요청한 비밀번호가 실제 비밀번호와 일치하는 지 확인
            if (req_password === article_password) {

                // 일치하면 삭제
                Article.remove({_id: req_id}).exec();
            } else {

                // 그렇지 않으면 실패로 내보내기
                result.isSuccess = false;
                result.messages.push("비밀번호가 일치하지 않습니다");
            }

            res.send(result);
        });

        
    });
}