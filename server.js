const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const port = 4000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var posts = [ {"id":0,"author":"admin","tracks":[{"n":0,"octave":4,"events":[["1:0","C4"],["2:0","C4"],["2:1","C4"]],"instrument":"piano"},{"n":1,"octave":3,"events":[["0:2","B3"],["1:2","A3"],["2:3","A3"],["3:2","E3"],["0:0","A3"],["3:0","B3"],["2:2","B3"]],"instrument":"piano"},{"n":2,"octave":1,"events":[["0:0","C1"],["0:2","C1"],["0:3","C1"],["1:0","C1"],["1:2","C1"],["1:3","C1"],["2:0","C1"],["2:2","C1"],["2:3","C1"],["3:0","C1"],["3:2","C1"],["3:3","C1"],["0:1","B1"],["1:1","B1"],["2:1","B1"],["3:1","B1"]],"instrument":"snare"}]}];

var users = {
  'admin': {
    username: 'admin',
    forename: 'Ad',
    surname: 'Min'
  },
  'doctorwhocomposer': {
    username: 'doctorwhocomposer',
    forename: 'Delia',
    surname: 'Derbyshire'
  }
};

var passwords = {
  'admin': '1234',
};

var accessTokens = {
  'asdasdasd': {user: 'admin', expiry: new Date(2019, 1, 14, 0, 0)}
}

function newAccessToken(user) {
  var token = "";
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 10; i++)
    token += chars.charAt(Math.floor(Math.random() * chars.length));

  accessTokens[token] = {user: user, expiry: Date.now() + 24*60*60*1000}
  console.log(accessTokens[token]);

  return token;
}

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

app.post('/login', function(req, res) {
  var data = req.body;
  console.log(req.body);

  if (Object.keys(users).includes(data.username) && data.password == passwords[data.username]) {
    res.send({success: true, access_token: newAccessToken(data.username), username: data.username});
  }
  else {
    res.send({success: false});
  }
});

app.post('/register', function(req, res) {
  console.log(req.body);
  users[req.body.username] = {
    username: req.body.username,
    forename: req.body.forename,
    surname: req.body.surname
  };
  passwords[req.body.username] = req.body.password;

  res.send(JSON.stringify({success: true}))
})

app.get('/people', function(req, res) {
  res.send(JSON.stringify(users));
});

app.get('/people/:username', function(req, res) {
  res.send(JSON.stringify(users[req.params.username]));
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
