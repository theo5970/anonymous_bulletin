// 설정
const config = {
    // 메인화면에 나올 글 수 제한
    mainpage_limit: 25,

    // 최소, 최대 글 제목 길이
    min_article_title_length: 1,
    max_article_title_length: 50,

    // 최소, 최대 글 내용 길이
    min_article_context_length: 10,
    max_article_context_length: 2000,

    // 최소, 최소 댓글 내용 길이
    min_comment_length: 1,
    max_comment_length: 500,

    // 글 모두 볼 때 각각의 페이지에 표시할 글 개수
    eachpage_count: 20,

    // 페이징 최대
    max_page: 2000 + 1
}
module.exports = config;