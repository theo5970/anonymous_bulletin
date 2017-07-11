module.exports = function(mongoose) {
    var Schema = mongoose.Schema;

    var articleSchema = new Schema({
        id: Number,
        sortIndex: Number,
        title: String,
        time: Number,
        context: String,
        comments: [],
        type: Number,
        ip: String,
        likes: [String]
    });

    return mongoose.model("Article", articleSchema, "test");
}