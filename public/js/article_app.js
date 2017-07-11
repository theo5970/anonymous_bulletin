function postComment(article_dbid) {
    let context = $("input[id="+article_dbid+"_comment]").val();
    console.log(context);
    $.ajax({
        type: "post",
        url: "/post_comment",
        dataType: "json",
        success: function(data) {
            if (data.isSuccess) {
                location.reload();
            } else {
                $("#error_incomment_modal").modal("show");
            }
        },
        data: {
            _id: article_dbid,
            context: context
        }
    });
}

function doLike(article_dbid) {
    $.ajax({
        type: "post",
        url: "/post_like",
        dataType: "json",
        success: function(data) {
            if (data.isSuccess) {
                console.log(data.count);
                let btn = $("#likebtn_" + article_dbid);
                if (data.isLiked) {
                    btn.addClass("active");
                } else {
                    btn.removeClass("active");
                }
                btn.find("span:nth-child(2)").html(data.count.toString());
            } else {
                alert("이미 좋아요를 누르셨습니다");
            }
        },
        data: {
            _id: article_dbid
        }
    })
}