// 절대적인 시간을 표시하지 않고 상대적인 시간을 표시합니다
// date1에는 과거 Date, date2에는 현재 Date를 사용하세요

// 예시) 방금 전, 10분 전, 5시간 전

function subjective_time(date1, date2) {
    let result = "";
    let diffSign = Math.sign(date2 - date1);
    let diffSeconds = Math.abs(date2 - date1) / 1000;

    if (diffSeconds >= 0 && diffSeconds <= 15) {
        result = "방금";
        
    } else if (diffSeconds > 15 && diffSeconds < 60) {  // 15 ~ 60초
        result = Math.floor(diffSeconds) + "초";

    } else if (diffSeconds >= 60 && diffSeconds < 3600) { // 1 ~ 60분(1시간)
        result = Math.floor(diffSeconds / 60) + "분";

    } else if (diffSeconds >= 3600 && diffSeconds < 86400) { // 1 ~ 24시간
        result = Math.floor(diffSeconds / 3600) + "시간";

    } else if (diffSeconds >= 86400 && diffSeconds < 86400 * 30) {  // 1 ~ 30일
        result = Math.floor(diffSeconds / 86400) + "일";

    } else if (diffSeconds >= 86400 * 30 && diffSeconds < 86400 * 30 * 12) {    // 1 ~ 12개월
        result = "약 "+Math.floor(diffSeconds / 86400 / 30) + "개월";

    // 여기서부터는 재미로 했으니 생략하셔도 됩니다
    } else if (diffSeconds >= 86400 * 30 * 12 && diffSeconds < 86400 * 30 * 12 * 100) { // 1 ~ 100년
        result = "약 "+Math.floor(diffSeconds / 86400 / 30 / 12) + "년";

    } else if (diffSeconds >= 86400 * 30 * 12 * 100) {  // 100년~
        result = "약 "+(diffSeconds / 86400 / 30 / 12 / 1000).toFixed(2) + "세기";

    }
    // 이건 꼭 필요한거
    return result + (diffSign === 1 ? " 전" : " 후");
}

module.exports = subjective_time;