
var CLIENT_ID = '0owbegbmtfa6ih7';
const sendToDropbox = throttle(_sendToDropbox, 200);

if (isAuthenticated()) {
  showPageSection('auth-section');
  const getUserMedia = navigator.mediaDevices.getUserMedia;
  const options = {
    audio: false,
    video: {
      width: 600,
      height: 600
    }
  };
  var video = document.querySelector('video');
  var indicator = document.querySelector('#indicator');
  var select = document.querySelector('#class-select');
  var canvas = document.querySelector('#capture');
  var context = canvas.getContext('2d');

  var cw = Math.floor(canvas.clientWidth / 1);
  var ch = Math.floor(canvas.clientHeight / 1);
  canvas.width = cw;
  canvas.height = ch;

  // Create an instance of Dropbox with the access token and use it to
  // fetch and render the files in the users root directory.
  var dbx = new Dropbox.Dropbox({ accessToken: getAccessTokenFromUrl() });

  if (getUserMedia) {
    getUserMedia.call(navigator.mediaDevices, options)
      .then(stream => {
        const video = document.querySelector('video')
        video.srcObject = stream
        video.onloadedmetadata = (e => video.play())
      })
  }

  select.addEventListener('change', function () {
    select.blur()
  });

  video.addEventListener('play', function(){
    draw(this, context, cw, ch);
  }, false);

  document.body.addEventListener('keypress', e => {
    //if it is spacebar then invoke a throttled sendToDropbox function
    if (e.which === 32 && select.value) {
      var img = document.querySelector('img')
      img.src = canvas.toDataURL()
      sendToDropbox(dataURItoBlob(img.src), select.value)
      indicator.style.display = 'block';
      canvas.classList.add('capturing');
    }
  });

  document.body.addEventListener('keyup', e => {
    indicator.style.display = 'none';
    canvas.classList.remove('capturing');
  });

} else {
  showPageSection('pre-auth-section');

  // Set the login anchors href using dbx.getAuthenticationUrl()
  var dbx = new Dropbox.Dropbox({ clientId: CLIENT_ID });
  var authUrl = dbx.getAuthenticationUrl('http://localhost:1234/auth');
  document.getElementById('authlink').href = authUrl;
}

function draw(v, ctx, w, h) {
  var pixels;
  if( v.paused || v.ended )	return false;
  ctx.drawImage(v,0,0,w,h);
  pixels = ctx.getImageData(0, 0, 600, 600);
  pixels.data = greyScale(pixels);
  ctx.putImageData(pixels, 0, 0);
  setTimeout(draw, 20, v, ctx, w, h);
}

function greyScale (pixels) {
  var data = pixels.data;
  // Loop through the pixels, turning them grayscale
  for(var i = 0; i < data.length; i+=4) {
    var r = data[i];
    var g = data[i+1];
    var b = data[i+2];
    var brightness = (3*r+4*g+b)>>>3;
    data[i] = brightness;
    data[i+1] = brightness;
    data[i+2] = brightness;
  }
  return data
}

function dataURItoBlob(dataURI) {
  // convert base64 to raw binary data held in a string
  // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
  var byteString = atob(dataURI.split(',')[1]);

  // separate out the mime component
  var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

  // write the bytes of the string to an ArrayBuffer
  var ab = new ArrayBuffer(byteString.length);
  var ia = new Uint8Array(ab);
  for (var i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
  }

  return new Blob([ab], {type: mimeString});
}

function _sendToDropbox (blob, label) {
  return dbx.filesUpload({path: `/training/${label}/${label}_${Date.now()}.png`, contents: blob})
}

// Parses the url and gets the access token if it is in the urls hash
function getAccessTokenFromUrl() {
 return utils.parseQueryString(window.location.hash).access_token;
}

// If the user was just redirected from authenticating, the urls hash will
// contain the access token.
function isAuthenticated() {
  return !!getAccessTokenFromUrl();
}

// This example keeps both the authenticate and non-authenticated setions
// in the DOM and uses this function to show/hide the correct section.
function showPageSection(elementId) {
  document.getElementById(elementId).style.display = 'flex';
}

function throttle(func, wait, options) {
  var context, args, result;
  var timeout = null;
  var previous = 0;
  if (!options) options = {};
  var later = function() {
    previous = options.leading === false ? 0 : Date.now();
    timeout = null;
    result = func.apply(context, args);
    if (!timeout) context = args = null;
  };
  return function() {
    var now = Date.now();
    if (!previous && options.leading === false) previous = now;
    var remaining = wait - (now - previous);
    context = this;
    args = arguments;
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    } else if (!timeout && options.trailing !== false) {
      timeout = setTimeout(later, remaining);
    }
    return result;
  };
};
