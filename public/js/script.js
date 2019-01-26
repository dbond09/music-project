const INSTRUMENTS = ['piano', 'guitar', 'harmonium', 'snare'];
const NOTES = ['B','A#','A','G#','G','F#','F','E','D#','D','C#','C'];


var MUSICAPPSTATE = {
  newPost: {
    composers: [{id: 0, notes: {}, instrument: 'piano', octave: 3, events: [], measures: 4}],
    measures: 4,
    BPM: 200
  },
  posts: {},
  samplers: {},
  synths: {},
  toload: 0,
  measures: 4,
  activeModules: {}
};

function getTemplate(id) {
  return document.getElementById(id).innerHTML;
}

function getPageModule(parentElement, moduleUrl) {
  window.fetch(moduleUrl)
    .then((res)=>{
      return res.text();
    })
    .then((res)=>{
      parentElement.innerHTML = res;
    })
}

function renderLoginPanel() {
  document.getElementById('left-panel').innerHTML = getTemplate('login-form');
}

function renderUserPanel() {
  document.getElementById('left-panel').innerHTML = getTemplate('user-panel').replace('##user##', sessionStorage.getItem('username'));
}

function verifyAccessToken() {
  window.fetch('/verify', {
    method: 'POST',
    headers: {
      "Content-Type": 'application/json'
    },
    body: JSON.stringify({
      'access_token': sessionStorage.getItem('access_token'),
      'username': sessionStorage.getItem('username')
    })
  })
  .then(function(res) {
    if (!res.ok) {
      handleLogout();
    }
  })
}

function handleLogin(event) {
  event.preventDefault();
  window.fetch('/login', {
    method: 'POST',
    headers: {
      "Content-Type": 'application/json'
    },
    body: JSON.stringify({
      username: event.target.elements['username'].value,
      password: event.target.elements['password'].value
    })
  })
  .then(function (res) {
    return res.json()
  })
  .then(function (res) {
    if (res.success) {
      sessionStorage.setItem('username', res['username']);
      sessionStorage.setItem('access_token', res['access_token']);
      location.reload();
    }
    else {
      window.alert(res.error);
    }
  })

  return false;
}

function handleLogout() {
  sessionStorage.clear();
  MUSICAPPSTATE.activeModules = {};
  location.reload();
}

function handleRegister(event) {
  event.preventDefault();
  var fields = event.target.elements;
  window.fetch('/register', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      username: fields.username.value,
      password: fields.password.value,
      forename: fields.forename.value,
      surname: fields.surname.value
    })
  })
    .then(function (res) {
      return res.json()
    })
    .then(function (resjson) {
      if (resjson.success) {
        window.alert('You can now log in.');
        location.reload();
      }
      else {
        window.alert(resjson.error);
      }
    });

  return false;
}

function renderComposer(args, display) {
  function renderTable() {
    var rows = 12;
    var beats = args.measures || 4;
    var table = '';

    if (display) {
      table += ('<thead><tr><td colSpan="'+ beats*4 +'" style="height: 10px">'+ args.instrument +'</td></tr></thead>');
    }

    table += '<tbody>';
    for (var i = 0; i < rows; i++) {
      var row = [];
      if (!display) {
        row += ('<td>' + NOTES[i] + '</td>');
      }
      for (var j = 0; j < beats*4; j++) {
        if (display) {
          row += ('<td class="' + (args.notes[i+','+j] ? 'active-cell q-' + args.notes[i+','+j] : '') + '" data-index="'+i+','+j+'"></td>');
        }
        else {
          row += ('<td class="' + (args.notes[i+','+j] ? 'active-cell q-' + args.notes[i+','+j] : '') + '" data-index="'+i+','+j+'" data-composerid="'+args.id+'" onClick="handleComposerCellClick(event)"></td>');
        }
      }
      table += ('<tr>'+row+'</tr>');
    }
    table += '</tbody>';

    return ('<table class=' + (display ? 'composer-table-display' : 'composer-table') +'>' + table + '</table>');
  }

  if (display) {
    var composer = renderTable();
  }
  else {
    var composer = getTemplate('template-composer')
      .replace('##table##', renderTable())
      .replace(/##composerid##/g, args.id)
      .replace('##instrument##', args.instrument);
  }

  return composer;

}

function renderComposers(composersToRender, display) {
  var composers = "";

  for (var composer of composersToRender) {
    if (!composer.notes) {
      composer.notes = getComposerNotes(composer);
    }
    composers += renderComposer(composer, display);
  }

  return composers;
}

function renderNewPostModule() {
  if (!MUSICAPPSTATE.activeModules['newpost']) {return;}
  var newPostModule = document.getElementById('template-new-post-module').innerHTML
    .replace('##measures##', MUSICAPPSTATE.newPost.measures)
    .replace('##BPM##', MUSICAPPSTATE.newPost.BPM);

  document.getElementById('new-post').innerHTML = newPostModule;
  document.getElementById('new-post-composers').innerHTML = renderComposers(MUSICAPPSTATE.newPost.composers);

  for (var composer of MUSICAPPSTATE.newPost.composers) {
    document.forms['composer-'+composer.id][composer.octave].checked = true;
    for (var synth of Object.keys(MUSICAPPSTATE.synths)) {
      document.getElementById('instrument-'+composer.id).innerHTML += ('<li><a data-composerid="'+composer.id+'" data-value="'+synth+'" class="dropdown-item" onclick="handleComposerInstrumentChange(event)">'+synth+'</a></li>');
    }

    document.getElementById('instrument-'+composer.id).value = composer.instrument;
  }
}

function addNewPostComposer() {
  MUSICAPPSTATE.newPost.composers.push({id: MUSICAPPSTATE.newPost.composers.length, notes: {}, instrument: 'piano', octave: 3, measures: MUSICAPPSTATE.newPost.measures});
  renderNewPostModule();
}

function removeNewPostComposer() {
  MUSICAPPSTATE.newPost.composers.pop();
  renderNewPostModule();
}

function handleBPMChange(event) {
  MUSICAPPSTATE.newPost.BPM = parseInt(event.target.value);
  renderNewPostModule();
}

function handleMeasuresChange(event) {
  for (var composer of MUSICAPPSTATE.newPost.composers) {
    composer.measures = parseInt(event.target.value);
  }
  MUSICAPPSTATE.newPost.measures = parseInt(event.target.value);
  renderNewPostModule();
}

function handleComposerCellClick(event) {
  if (window.getComputedStyle(event.target).getPropertyValue('background-color') == 'rgb(102, 179, 255)') {return;}
  var notes = MUSICAPPSTATE.newPost.composers[parseInt(event.target.dataset.composerid)].notes;
  if (!event.target.classList.contains('active-cell')) {
    notes[event.target.dataset.index] = 1;
    event.target.className = 'active-cell q-1'
  }
  else {
    if (MUSICAPPSTATE.newPost.composers[event.target.dataset.composerid].notes[event.target.dataset.index] < 4) {
      notes[event.target.dataset.index]++;
      event.target.className = 'active-cell q-' + notes[event.target.dataset.index];
    }
    else {
      delete notes[event.target.dataset.index];
      event.target.innerHTML = '';
      event.target.className = '';
    }
  }
  getComposerEvents(event.target.dataset.composerid);
}

function handleComposerInstrumentChange(event) {
  MUSICAPPSTATE.newPost.composers[parseInt(event.target.dataset.composerid)].instrument = event.target.dataset.value;
  getComposerEvents(event.target.dataset.composerid);
  renderNewPostModule();
}

function handleComposerOctaveChange(event) {
  MUSICAPPSTATE.newPost.composers[parseInt(event.target.dataset.composerid)].octave = parseInt(event.target.value);
  getComposerEvents(event.target.dataset.composerid);
}

function getComposerEvents(composerid) {
  var events = [];
  for (var note of Object.keys(MUSICAPPSTATE.newPost.composers[composerid].notes)) {
    var n =  NOTES[note.split(',')[0]];
    var t = note.split(',')[1];
    events.push({
      time: Math.floor(t/4) + ':' + t%4,
      note: n + MUSICAPPSTATE.newPost.composers[composerid].octave,
      length: Math.floor(4/MUSICAPPSTATE.newPost.composers[composerid].notes[note]) + 'n'
    });
  }
  MUSICAPPSTATE.newPost.composers[composerid].events = events;
  // this.props.handleChange({n: this.props.n, octave: this.state.octave, events: events, instrument: this.state.instrument});

  return events;
}

function getComposerNotes(composer) {
  var notes = {};

  for (var event of composer.events) {
    var t = event[0].split(':');
    notes[NOTES.indexOf(event[1].slice(0, -1))+','+(parseInt(t[0])*4 + parseInt(t[1]))] = parseInt(event[length].slice(0, 1));
  }

  return notes;
}

function handleNewPostSubmit() {
  var post = {
    author: sessionStorage.getItem('username'),
    title: document.getElementById('new-post-title').value,
    tracks: MUSICAPPSTATE.newPost.composers,
    measures: MUSICAPPSTATE.newPost.measures,
    BPM: MUSICAPPSTATE.newPost.BPM
  }

  window.fetch('/post', {method: 'POST', body: JSON.stringify({post: post, access_token: sessionStorage.getItem('access_token')}), headers:{'Content-Type': 'application/json'}})
    .then(()=>loadPosts());
}

function renderPost(post) {
  var composers = renderComposers(post.tracks, true);
  return getTemplate('template-post')
    .replace('##author##', post.author)
    .replace('##composers##', composers)
    .replace(/##id##/g, 'post-'+post.id)
    .replace('##likes##', Object.keys(post.likes).length)
    .replace('##hidden##', (sessionStorage.getItem('username') ? '' : ' hidden'))
    .replace('##btnclass##', (sessionStorage.getItem('username') ? (post.likes[sessionStorage.getItem('username')] ? 'btn-info' : 'btn-default') : 'btn-default disabled'))
    .replace('##title##', post.title);
}

function renderPosts() {
  var posts = '';
  for (var key of Object.keys(MUSICAPPSTATE.posts).slice().sort((a,b)=>{return b-a})) {
    posts += renderPost(MUSICAPPSTATE.posts[key]);
  }
  document.getElementById('posts').innerHTML = posts;
}

function getSamplers(instruments) {
  MUSICAPPSTATE.toload = instruments.length;

  for (var instrument of instruments) {
    if (!MUSICAPPSTATE.samplers.hasOwnProperty(instrument)) {
      var samples = {};
      if (!['drum', 'clap', 'snare'].includes(instrument)) {
        for (var j = 1; j <= 6; j++) {
          for (var n of NOTES) {
            samples[n + j] = 'samples/' + instrument + '/' + n.replace('#', 's') + j + '.mp3';
          }
        }
      }
      else {
        samples['C1'] = 'samples/' + instrument + '/sample.wav';
      }
      MUSICAPPSTATE.samplers[instrument] = new Tone.Sampler(Object.assign({}, samples), function() {
        MUSICAPPSTATE.toload--;
        if (MUSICAPPSTATE.toload < 1) {
          Tone.Transport.start();
        }
      }).toMaster();

    }
  }
}

function handlePostLike(event) {
  var postid = parseInt(event.currentTarget.parentElement.parentElement.id.replace('post-', ''));
  if (event.currentTarget.classList.contains('btn-default')) {
    window.fetch('/like', {
      method: 'POST',
      headers: {
        "Content-Type": 'application/json'
      },
      body: JSON.stringify({
        'access_token': sessionStorage.getItem('access_token'),
        'username': sessionStorage.getItem('username'),
        'postid': postid
      })
    })
    .then(res=>{
      if (res.ok) {
        var likebutton = document.getElementById('like-button-post-' + postid);
        likebutton.classList.remove('btn-default');
        likebutton.classList.add('btn-info');
        likebutton.childNodes[1].data++;
      }
    });
  }
  else {
    window.fetch('/unlike', {
      method: 'POST',
      headers: {
        "Content-Type": 'application/json'
      },
      body: JSON.stringify({
        'access_token': sessionStorage.getItem('access_token'),
        'username': sessionStorage.getItem('username'),
        'postid': postid
      })
    })
    .then(res=>{
      if (res.ok) {
        var likebutton = document.getElementById('like-button-post-' + postid);
        likebutton.classList.remove('btn-info');
        likebutton.classList.add('btn-default');
        likebutton.childNodes[1].data--;
      }
    });
  }
}

function handlePostCopy(event) {
  var post = MUSICAPPSTATE.posts[parseInt(event.currentTarget.parentElement.parentElement.id.replace('post-', ''))];
  MUSICAPPSTATE.newPost = {
    composers: post.tracks.slice(),
    BPM: post.BPM,
    measures: post.measures
  };
  renderNewPostModule();
}

function getSynths() {
  window.fetch('synths')
  .then(res => res.json())
  .then(res => {
    for (var synth of res) {
      // MUSICAPPSTATE.synths[synth.name] = new Tone[synth.type](synth.properties).toMaster();
      MUSICAPPSTATE.synths[synth.name] = new Tone.PolySynth(3, Tone[synth.type]).toMaster();
      MUSICAPPSTATE.synths[synth.name].set(synth.properties);
    }
    renderNewPostModule();
  });
}

function play(event, newpost) {
  stop();
  var current = -1;

  if (newpost) {
    var post = MUSICAPPSTATE.newPost;
    var styletemplate = '.composer-table td:nth-child(##n##) {border-right: solid red !important}';
  }
  else {
    var id = parseInt(event.currentTarget.parentElement.parentElement.id.replace('post-', ''));
    var post = MUSICAPPSTATE.posts[id];
    var styletemplate = '#post-' + id + ' tbody td:nth-child(##n##) {border-right: solid red !important}';
  }
  var style = document.createElement('style');
  style.setAttribute('class', 'play-indicator');
  document.getElementsByTagName('body')[0].appendChild(style);

  MUSICAPPSTATE.measures = post.measures || 4;


  Tone.Transport.cancel();
  var synth = new Tone.Synth().toMaster()
  synth.triggerAttackRelease('C4', 0)

  Tone.Transport.scheduleRepeat((time)=> {
    current = (current+1) % (MUSICAPPSTATE.measures * 4);
    style.innerHTML = styletemplate.replace('##n##', current+(newpost ? 1 : 0));
  }, '4n');

  // var chord = new Tone.Event(function(time, chord){
  // }, ["D4", "E4", "F4"]);
  // chord.start();
  // //loop it every measure for 8 measures
  // chord.loop = 8;
  // chord.loopEnd = "1m";

  var synths = [];
  var parts = [];
  var instruments = {};
  for (var i = 0; i < (post.tracks||post.composers).length; i++){
    if (!MUSICAPPSTATE.synths.hasOwnProperty((post.tracks||post.composers)[i].instrument) &&
      !MUSICAPPSTATE.samplers.hasOwnProperty((post.tracks||post.composers)[i].instrument)) {
      instruments[(post.tracks||post.composers)[i].instrument] = true;
    }
    ((instr)=>{
      var part = new Tone.Part((time, value)=>{
        if (MUSICAPPSTATE.synths.hasOwnProperty(instr)) {
          MUSICAPPSTATE.synths[instr].triggerAttackRelease(value.note, value.length, time);
        }
        else {
          MUSICAPPSTATE.samplers[instr].triggerAttackRelease(value.note, value.length, time);
        }
      }, (post.tracks||post.composers)[i].events);

      part.loop = true;
      part.loopEnd = (post.measures||4) + 'm';
      part.start();
    } )((post.tracks||post.composers)[i].instrument);
  };

  Tone.Transport.bpm.value = post.BPM || 200;

  if (Object.keys(instruments).length > 0) {
    getSamplers(Object.keys(instruments));
  }
  else {
    Tone.Transport.start();
  }
}

function stop() {
  Tone.Transport.cancel();
  var indicator = document.getElementsByClassName('play-indicator');
  while (indicator[0]) {
    indicator[0].parentNode.removeChild(indicator[0]);
    indicator = document.getElementsByClassName('play-indicator');
  }
}

function loadPosts() {
  window.fetch('/posts')
    .then(res => res.json())
    .then(
      result => {
        MUSICAPPSTATE.posts = result.posts;
      }
    )
    .then(()=>renderPosts());
}

function loadPeoplePage() {
  window.fetch('/people')
    .then((res)=>res.json())
    .then(function (res) {
      var table = document.createElement('table');
      table.setAttribute('class', 'table people-table');
      var thead = document.createElement('thead');
      thead.innerHTML = '<tr><th>Username</th><th>Forename</th><th>Surname</th></tr>';
      table.appendChild(thead);
      var tbody = document.createElement('tbody');
      table.appendChild(tbody);
      for (var username of Object.keys(res)) {
        var row = document.createElement('tr');
        tbody.appendChild(row);
        for (var key of ['username', 'forename', 'surname']) {
          var td = document.createElement('td');
          td.innerHTML = res[username][key];
          row.appendChild(td);
        }
      }

      var midcol = document.getElementById('middle-column');
      midcol.innerHTML = getTemplate('people-panel');
      midcol.children[0].children[1].appendChild(table);
    });
}

function loadRegisterPage() {
  document.getElementById('middle-column').innerHTML = getTemplate('registration-panel');
}
