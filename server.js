const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const port = 4000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var posts = [ {"id":0,"author":"admin","tracks":[{"n":0,"octave":4,"events":[["1:0","C4"],["2:0","C4"],["2:1","C4"]],"instrument":"piano"},{"n":1,"octave":3,"events":[["0:2","B3"],["1:2","A3"],["2:3","A3"],["3:2","E3"],["0:0","A3"],["3:0","B3"],["2:2","B3"]],"instrument":"piano"},{"n":2,"octave":1,"events":[["0:0","C1"],["0:2","C1"],["0:3","C1"],["1:0","C1"],["1:2","C1"],["1:3","C1"],["2:0","C1"],["2:2","C1"],["2:3","C1"],["3:0","C1"],["3:2","C1"],["3:3","C1"],["0:1","B1"],["1:1","B1"],["2:1","B1"],["3:1","B1"]],"instrument":"snare"}]}];

app.get('/', (req, res)=>{
  res.sendFile('./index.html', {root: path.join(__dirname, './public')});
});
app.use('/', express.static('public'));

app.get('/posts', function(req, res) {

  res.send({posts: posts.slice().sort(function(a,b){return b.id-a.id})});
});

app.post('/posts', function(req, res) {
  var post = req.body.post;
  post.id = Object.keys(posts).length;
  while (posts.hasOwnProperty(post.id)) {post.id += 1;}
  posts[post.id] = post;
  console.log(post);
});


app.listen(port, () => console.log(`Example app listening on port ${port}!`));
