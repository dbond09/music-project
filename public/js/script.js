const INSTRUMENTS = ['piano', 'guitar', 'harmonium', 'snare'];
const NOTES = ['B','A#','A','G#','G','F#','F','E','D#','D','C#','C'];

var MUSICAPPSTATE = {
  newPost: {
    composers: [{id: 0, notes: {}, instrument: 'piano', octave: 3, events: []}]
  },
  posts: [],
  samplers: []
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

function renderComposer(args, display) {
  function renderTable() {
    var rows = 12;
    var beats = 4;
    var table = [];

    if (display) {
      table += ('<tr><td colSpan="16" style="height: 10px">'+ args.instrument +'</td></tr>');
    }

    for (var i = 0; i < rows; i++) {
      var row = [];
      if (!display) {
        row += ('<td>' + NOTES[i] + '</td>');
      }
      for (var j = 0; j < beats*4; j++) {
        if (display) {
          row += ('<td class="' + (args.notes[i+','+j] ? 'dropzone active-cell' : 'dropzone') + '" data-index="'+i+','+j+'"></td>');
        }
        else {
          row += ('<td class="' + (args.notes[i+','+j] ? 'dropzone active-cell' : 'dropzone') + '" data-index="'+i+','+j+'" data-composerid="'+args.id+'" onClick="handleComposerCellClick(event)"></td>');
        }
      }
      table += ('<tr>'+row+'</tr>');
    }

    return ('<table class=' + (display ? 'composer-table-display' : 'composer-table') +'>' + table + '</table>');
  }

  if (display) {
    var composer = renderTable();
  }
  else {
    var composer = getTemplate('template-composer')
      .replace('##table##', renderTable())
      .replace(/##composerid##/g, args.id);
  }

  return composer;

}

function renderComposers(composersToRender, display) {
  var composers = "";
  var divider = '<hr class="hr-composer">';

  for (var composer of composersToRender) {
    if (!composer.notes) {
      composer.notes = getComposerNotes(composer);
    }
    composers += (composer.id > 0 ? divider : '') + renderComposer(composer, display);
  }

  return composers;
}

function renderNewPostModule() {
  var newPostModule = document.getElementById('template-new-post-module').innerHTML;

  document.getElementById('new-post').innerHTML = newPostModule;
  document.getElementById('new-post-composers').innerHTML = renderComposers(MUSICAPPSTATE.newPost.composers);

  for (var composer of MUSICAPPSTATE.newPost.composers) {
    document.forms['composer-'+composer.id][composer.octave].checked = true;
    document.getElementById('instrument-'+composer.id).value = composer.instrument;
  }
}

function addNewPostComposer() {
  MUSICAPPSTATE.newPost.composers.push({id: MUSICAPPSTATE.newPost.composers.length, notes: {}, instrument: 'guitar'});
  renderNewPostModule();
}

function removeNewPostComposer() {
  MUSICAPPSTATE.newPost.composers.pop();
  renderNewPostModule();
}

function handleComposerCellClick(event) {
  if (!event.target.classList.contains('active-cell')) {
    MUSICAPPSTATE.newPost.composers[parseInt(event.target.dataset.composerid)].notes[event.target.dataset.index] = true;
    event.target.classList.add('active-cell');
    // this.play();
  }
  else {
    delete MUSICAPPSTATE.newPost.composers[event.target.dataset.composerid].notes[event.target.dataset.index];
    event.target.classList.remove('active-cell');
  }
  getComposerEvents(event.target.dataset.composerid);
}

function handleComposerInstrumentChange(event) {
  MUSICAPPSTATE.newPost.composers[parseInt(event.target.dataset.composerid)].instrument = event.target.value;
  getComposerEvents(event.target.dataset.composerid);
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
    events.push([Math.floor(t/4) + ':' + t%4, n + MUSICAPPSTATE.newPost.composers[composerid].octave])
  }
  console.log(events);
  MUSICAPPSTATE.newPost.composers[composerid].events = events;
  // this.props.handleChange({n: this.props.n, octave: this.state.octave, events: events, instrument: this.state.instrument});

  return events;
}

function getComposerNotes(composer) {
  var notes = {};

  for (var event of composer.events) {
    var t = event[0].split(':');
    notes[NOTES.indexOf(event[1].slice(0, -1))+','+(parseInt(t[0])*4 + parseInt(t[1]))] = true;
  }

  return notes;
}

function handleNewPostSubmit() {
  var post = {
    author: sessionStorage.getItem('username'),
    tracks: MUSICAPPSTATE.newPost.composers,
  }

  window.fetch('/posts', {method: 'POST', body: JSON.stringify({post: post}), headers:{'Content-Type': 'application/json'}});
  loadPosts();
}

function renderPost(post, id) {
  var composers = renderComposers(post.tracks, true);
  return getTemplate('template-post')
    .replace('##author##', post.author)
    .replace('##composers##', composers)
    .replace('##id##', 'post-'+id);
}

function renderPosts() {
  var posts = '';
  var i = 0;
  for (var post of MUSICAPPSTATE.posts) {
    posts += renderPost(post, i);
    i++;
  }
  document.getElementById('posts').innerHTML = posts;
}

function getSamplers() {
  for (var instrument of INSTRUMENTS) {
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
      MUSICAPPSTATE.samplers[instrument] = new Tone.Sampler(Object.assign({}, samples)).toMaster();

    }
  }
}

function play(event, newpost) {
  console.log('he');
  if (newpost) {
    var post = MUSICAPPSTATE.newPost;
  }
  else {
    var id = parseInt(event.target.id.replace('post-', ''));
    var post = MUSICAPPSTATE.posts[id];
  }

  Tone.Transport.cancel();
  var synth = new Tone.Synth().toMaster()
  synth.triggerAttackRelease('C4', 0)

  Tone.Transport.scheduleRepeat((time)=> {
    // console.log(this.state.current);
    // this.setState({current: (this.state.current+1)%16});
  }, '4n');

  var chord = new Tone.Event(function(time, chord){
  }, ["D4", "E4", "F4"]);
  chord.start();
  //loop it every measure for 8 measures
  chord.loop = 8;
  chord.loopEnd = "1m";

  var synths = [];
  var parts = [];
  for (var i = 0; i < (post.tracks||post.composers).length; i++){

    ((instr)=>{
      console.log('he');
      var part = new Tone.Part((time, note)=>{
        MUSICAPPSTATE.samplers[instr].triggerAttackRelease(note, "4n", time);
      }, (post.tracks||post.composers)[i].events);

      part.loop = true;
      part.loopEnd = "4m";
      part.start();
    } )((post.tracks||post.composers)[i].instrument);
  };

  Tone.Transport.bpm.value = 200;
  Tone.Transport.start();
}

function stop() {
  Tone.Transport.cancel();
}

function loadPosts() {
  window.fetch('/posts')
    .then(res => res.json())
    .then(
      result => {
        console.log(result);
        MUSICAPPSTATE.posts = result.posts;
      }
    )
    .then(()=>renderPosts());
}
