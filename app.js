const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 80;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var posts = JSON.parse(fs.readFileSync('posts.json', 'utf8'));
var users = JSON.parse(fs.readFileSync('users.json', 'utf8'));
var passwords = JSON.parse(fs.readFileSync('passwords.json', 'utf8'));

// var posts = [ {"id":0,"author":"admin","tracks":[{"n":0,"octave":4,"events":[["1:0","C4"],["2:0","C4"],["2:1","C4"]],"instrument":"piano"},{"n":1,"octave":3,"events":[["0:2","B3"],["1:2","A3"],["2:3","A3"],["3:2","E3"],["0:0","A3"],["3:0","B3"],["2:2","B3"]],"instrument":"piano"},{"n":2,"octave":1,"events":[["0:0","C1"],["0:2","C1"],["0:3","C1"],["1:0","C1"],["1:2","C1"],["1:3","C1"],["2:0","C1"],["2:2","C1"],["2:3","C1"],["3:0","C1"],["3:2","C1"],["3:3","C1"],["0:1","B1"],["1:1","B1"],["2:1","B1"],["3:1","B1"]],"instrument":"snare"}]}];

// var users = {
//   'admin': {
//     username: 'admin',
//     forename: 'Ad',
//     surname: 'Min'
//   },
//   'doctorwhocomposer': {
//     username: 'doctorwhocomposer',
//     forename: 'Delia',
//     surname: 'Derbyshire'
//   }
// };

// var passwords = {
//   'admin': '1234',
// };

var accessTokens = {};

function newAccessToken(user) {
  var token = "";
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 10; i++)
    token += chars.charAt(Math.floor(Math.random() * chars.length));

  accessTokens[token] = {user: user, expiry: Date.now() + 24*60*60*1000}
  console.log(accessTokens[token]);

  return token;
}

function verifyAccessToken(token, user) {
  if (token === 'concertina') {return true;}
  if (!Object.keys(accessTokens).includes(token)) {return false;}
  if (accessTokens[token].expiry < Date.now()) {return false;}
  if (accessTokens[token].user !== user) {return false;}
  return true;
}

app.get('/', (req, res)=>{
  res.sendFile('./index.html', {root: path.join(__dirname, './public')});
});

app.use('/', express.static('public'));

app.get('/synths', function(req, res) {
  res.sendFile('./instruments.json', {root: path.join(__dirname, './public')});
})

app.get('/posts', function(req, res) {
  res.send({posts: posts});
});

app.post('/post', function(req, res) {
  if (!verifyAccessToken(req.body.access_token, req.body.post.author)) {
    res.status(403).send('Invalid access token.');
    return;
  }
  var post = req.body.post;
  post.id = Object.keys(posts).length;
  post.likes = [];
  while (posts.hasOwnProperty(post.id)) {post.id += 1;}
  posts[post.id] = post;
  console.log(post);
  fs.writeFile('posts.json', JSON.stringify(posts), function(err){return;});
  res.status(200).send('OK');
});

app.post('/verify', function(req, res) {
  if (!verifyAccessToken(req.body.access_token, req.body.username)) {
    res.status(403).send('Invalid access token.');
    return;
  }
  res.status(200).send('OK');
})

app.post('/login', function(req, res) {
  var data = req.body;

  if (Object.keys(users).includes(data.username) && data.password == passwords[data.username]) {
    res.status(200).json({success: true, access_token: newAccessToken(data.username), username: data.username});
  }
  else {
    res.status(403).json({success: false, error: 'Username or password not found.'});
  }
});

app.post('/register', function(req, res) {
  if (users[req.body.username]) {
    res.status(400).json({success: false, error: 'Username is taken'});
    return;
  }
  if (req.body.password.length < 6) {
    res.status(400).json({success: false, error: 'Your password should be at least 6 characters long.'});
    return;
  }
  users[req.body.username] = {
    username: req.body.username,
    forename: req.body.forename,
    surname: req.body.surname
  };
  passwords[req.body.username] = req.body.password;

  res.status(200).send({success: true});
  fs.writeFile('users.json', JSON.stringify(users), function(err){return;});
  fs.writeFile('passwords.json', JSON.stringify(passwords), function(err){return;});
})

app.get('/people', function(req, res) {
  res.json(users);
});

app.get('/people/:username', function(req, res) {
  if (!users[req.params.username]) {
    res.status(400).send('User not found');
    return;
  }
  res.json(users[req.params.username]);
});

app.post('/people', function(req, res) {
  if (req.headers.access_token != 'concertina') {
    res.status(403).send('Invalid access token');
    return;
  }
  if (users[req.headers.username]) {
    res.status(400).send('Username taken.');
    return;
  }
  users[req.headers.username] = {
    username: req.headers.username,
    forename: req.headers.forename,
    surname: req.headers.surname
  };
  res.status(200).send('OK');
});

app.post('/like', function(req, res) {
  console.log(req.body);
  data = req.body;
  if (!verifyAccessToken(data.access_token, data.username)) {
    res.status(403).send('Invalid access token.');
    return;
  }

  posts[data.postid].likes[data.username] = true;
  fs.writeFile('posts.json', JSON.stringify(posts), function(err){return;});
  res.status(200).send('OK');
});

app.post('/unlike', function(req, res) {
  data = req.body;
  if (!verifyAccessToken(data.access_token, data.username)) {
    res.status(403).send('Invalid access token.');
    return;
  }

  if (posts[data.postid].likes[data.username]) {
    delete posts[data.postid].likes[data.username];
    fs.writeFile('posts.json', JSON.stringify(posts), function(err){return;});
    res.status(200).send('OK');
  }
  else {
    res.status(400).send('Not liked.');
  }
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));

module.exports = app;
