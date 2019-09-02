var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  // end: 응답 본문을 작성합니다.
  res.end('Hello World');
});
router.get('/test', function(req, res, next) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  // end: 응답 본문을 작성합니다.
  res.end('Hello World Test!');
});
module.exports = router;
