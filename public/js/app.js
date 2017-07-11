function findIt() {
    var context = $("input[id=whatFind]").val();
    var data = {"context": context};
    $.ajax({
        type: "post",
        url: "/find",
        dataType: "json",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        success: function(data){
            
        },
        data: data
    });
}

function postArticle() {
    $.ajax({
        type: "post",
        url: "/post",
        success: function(data) {
            if (data.isSuccess) {
                hideDiv("#error_inpost");
                showDiv("#success_inpost");
                
                setTimeout(function(){
                    location.reload();
                }, 1000);
            } else {
                showDiv("#error_inpost");
                $("#error_inpost p").html(data.messages.join("<br/>"));
            }
        },
        data: {
            title: $("input[id=titleText]").val(),
            context: $("textarea#contextText").val()
        }
    });
}


function showDiv(id) {
    $(id).css("display", "block");
}
function hideDiv(id) {
    $(id).css("display", "none");
}