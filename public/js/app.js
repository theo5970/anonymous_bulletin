// 글 올리기
function postArticle() {
    // ajax로 업로드
    $.ajax({
        type: "post",
        url: "/post",
        success: function(data) {
            // 만약 글 올리는 데 성공하면
            if (data.isSuccess) {
                // 에러 경고를 숨긴다
                hideDiv("#error_inpost");

                // 성공 경고를 표시한다
                showDiv("#success_inpost");
                
                // 1초 후 페이지를 새로고침한다
                setTimeout(function(){
                    location.reload();
                }, 1000);
            } else {

                // 에러 경고를 표시한다
                showDiv("#error_inpost");

                // 에러 경고의 내용을 서버로부터 온 에러 메시지로 설정한다
                $("#error_inpost p").html(data.messages.join("<br/>"));
            }
        },
        
        // 서버에 보낼 데이터
        data: {
            title: $("input[id=titleText]").val(),      // 글 제목
            context: $("textarea#contextText").val()    // 글 내용
        }
    });
}

// div 표시하기
function showDiv(id) {
    $(id).css("display", "block");
}

// div 숨기기
function hideDiv(id) {
    $(id).css("display", "none");
}