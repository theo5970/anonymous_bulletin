
function dateToString() {}

// 10보다 작으면 앞에 0을 붙여준다
var zero = function(x) {
    if (x < 10) {
        return "0" + x;
    } else {
        return x;
    }
}
/*
 YYYY : 년도(4자리)
 MM : 월(2자리)
 DD : 일(2자리)
 HH : 24시 (2자리)
 hh : 12시 (2자리)
 mm : 분 (2자리)
 ss : 초 (2자리)
*/
dateToString.convert = function(date, format) {
    let result = format;
    result = result.replace("YYYY", date.getFullYear().toString())
        .replace("MM", zero(date.getMonth() + 1))
        .replace("DD", zero(date.getDate()))
        .replace("HH", zero(date.getHours()))
        .replace("hh", zero(date.getHours() % 12))
        .replace("mm", zero(date.getMinutes()))
        .replace("ss", zero(date.getSeconds()));
    return result;
}
module.exports = dateToString;