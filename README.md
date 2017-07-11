# anonymous_bulletin
Node.js + Express.js + MongoDB로 구성된 **매우 간단한** 익명게시판입니다.

~~(현재 천천히 구현 중이며 언제 완성될 지는 미지수입니다.)~~

## 1. 셋팅하기
### 1-1. MongoDB 셋팅
*MongoDB Shell에서 다음 코드를 순서대로 입력해주세요*

```
use db1
db.createCollection("test")
db.test.insert({id: 1, title: "안녕하세요!" , context: "만나서 반갑습니다. 첫 번째 글이군요", time: new Date().getTime(), ip: "-", type: 0, likes: [], comments: []});
db.test.createIndex({time: -1})
db.test.createIndex({id: 1})
```

### 1-2. node.js 서버 셋팅

**/utils/config.js**에 들어가시면 됩니다.

자세한 설정은 config.js의 주석을 참고하세요.

## 2. 서버 켜기
루트 디렉터리에 있는 **index.js**로 시작하시면 됩니다.
