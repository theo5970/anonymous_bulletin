// 글 Schema

var config = require("../utils/config");

module.exports = function(mongoose) {
    var Schema = mongoose.Schema;

    var articleSchema = new Schema({
        // 고유 id (주소창에 검색 시)
        id: Number,

        // 제목
        title: String,

        // 올린 시간 (tick)
        time: Number,

        // 내용
        context: String,

        // 댓글 리스트
        comments: [],

        // 공지사항 체크 (type=0: 일반, type=1: 공지)
        type: Number,

        // 해시화된 IPv4
        ip: String,

        // 좋아요 누른 해시화된 IPv4 리스트
        likes: [String],

        // 해시화된 비밀번호
        password: String
    });

    return mongoose.model("Article", articleSchema, config.db_collection_name);
}