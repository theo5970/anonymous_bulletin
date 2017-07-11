// 댓글 달기
function postComment(article_dbid) {

    // 댓글 내용
    let context = $("input[id="+article_dbid+"_comment]").val();

    // ajax로 업로드
    $.ajax({
        type: "post",
        url: "/post_comment",
        dataType: "json",
        success: function(data) {
            // 댓글 올리는 데 성공하면
            if (data.isSuccess) {

                // 페이지 새로고침
                location.reload();
            } else {

                // 에러 모달 표시
                $("#error_incomment_modal").modal("show");
            }
        },

        // 서버로 보낼 데이터
        data: {
            _id: article_dbid,  // 데이터베이스 고유 ID
            context: context    // 댓글 내용
        }
    });
}

// 좋아요 누르기
function doLike(article_dbid) {
    // ajax로 처리
    $.ajax({
        type: "post",
        url: "/post_like",
        dataType: "json",
        success: function(data) {
            // 만약 성공하면
            if (data.isSuccess) {
                console.log(data.count);
                let btn = $("#likebtn_" + article_dbid);

                // 좋아요가 눌러졌으면 버튼에 active 클래스를,
                // 취소됬으면 버튼에 active 클래스를 제거한다.
                if (data.isLiked) {
                    btn.addClass("active");
                } else {
                    btn.removeClass("active");
                }

                // 버튼 텍스트를 좋아요 개수로 설정한다.
                btn.find("span:nth-child(2)").html(data.count.toString());
            } else {
                alert("오류가 발생했습니다. 다시 시도해주세요");
            }
        },

        // 서버로 보낼 데이터
        data: {
            _id: article_dbid   // 데이터베이스 고유 ID
        }
    })
}