// 설정
const config = {
    // HTTP 포트
    http_port: 3000,

    // HTTPS 포트
    https_port: 445,

    // 데이터베이스 이름
    db_name: "db1",

    // 컬렉션 이름
    db_collection_name: "test",

    // 클러스트 사용 여부
    use_cluster: true,
    
    // 클러스트 개수
    cluster_count: 4,

    // 메인화면에 나올 글 수 제한
    mainpage_limit: 25,

    // 최소, 최대 글 제목 길이
    min_article_title_length: 1,
    max_article_title_length: 50,

    // 최소, 최대 글 내용 길이
    min_article_context_length: 10,
    max_article_context_length: 2000,

    // 최소, 최대 댓글 내용 길이
    min_comment_length: 1,
    max_comment_length: 500,

    // 최소, 최대 비밀번호 자리 수
    min_password_length: 6,
    max_password_length: 30,

    // 글 모두 볼 때 각각의 페이지에 표시할 글 개수
    eachpage_count: 20,

    // 페이징 최대
    max_page: 2000 + 1
}
module.exports = config;