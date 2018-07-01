import * as Terminal from     './node_modules/xterm/dist/xterm';
import * as attach from       './node_modules/xterm/dist/addons/attach/attach';
import * as fit from          './node_modules/xterm/dist/addons/fit/fit';
import * as fullscreen from   './node_modules/xterm/dist/addons/fullscreen/fullscreen';
import * as search from       './node_modules/xterm/dist/addons/search/search';
import * as webLinks from     './node_modules/xterm/dist/addons/webLinks/webLinks';
import * as winptyCompat from './node_modules/xterm/dist/addons/winptyCompat/winptyCompat';


Terminal.applyAddon(attach);
Terminal.applyAddon(fit);
Terminal.applyAddon(fullscreen);
Terminal.applyAddon(search);
Terminal.applyAddon(webLinks);
Terminal.applyAddon(winptyCompat);


var term,
    protocol,
    socketURL,
    socket,
    pid;

var terminalContainer = document.getElementById('terminal-container')

createTerminal();

function createTerminal() {
  // Clean terminal
  while (terminalContainer.children.length) {
    terminalContainer.removeChild(terminalContainer.children[0]);
  }
  term = new Terminal({});
  window.term = term;  // Expose `term` to window for debugging purposes
  term.on('resize', function (size) {
    if (!pid) {
      return;
    }
    var cols = size.cols,
        rows = size.rows,
        url = '/terminals/' + pid + '/size?cols=' + cols + '&rows=' + rows;

    fetch(url, {method: 'POST'});
  });
  protocol = (location.protocol === 'https:') ? 'wss://' : 'ws://';
  socketURL = protocol + location.hostname + ((location.port) ? (':' + location.port) : '') + '/terminals/';

  term.open(terminalContainer);
  term.winptyCompatInit();
  term.webLinksInit();
  term.fit();
  term.focus();

  // fit is called within a setTimeout, cols and rows need this.
  setTimeout(function () {
    initOptions(term);

    fetch('/terminals?cols=' + term.cols + '&rows=' + term.rows, {method: 'POST'}).then(function (res) {

      res.text().then(function (processId) {
        pid = processId;
        socketURL += processId;
        socket = new WebSocket(socketURL);
        socket.onopen = runRealTerminal;
        socket.onclose = runFakeTerminal;
        socket.onerror = runFakeTerminal;
      });
    });
  }, 0);
}

function runRealTerminal() {
  term.attach(socket);
  term._initialized = true;
}

function runFakeTerminal() {
  if (term._initialized) {
    return;
  }

  term._initialized = true;

  var shellprompt = '$ ';

  term.prompt = function () {
    term.write('\r\n' + shellprompt);
  };

  term.writeln('Welcome to xterm.js');
  term.writeln('This is a local terminal emulation, without a real terminal in the back-end.');
  term.writeln('Type some keys and commands to play around.');
  term.writeln('');
  term.prompt();

  term._core.register(term.addDisposableListener('key', function (key, ev) {
    var printable = (
      !ev.altKey && !ev.altGraphKey && !ev.ctrlKey && !ev.metaKey
    );

    if (ev.keyCode == 13) {
      term.prompt();
    } else if (ev.keyCode == 8) {
     // Do not delete the prompt
      if (term.x > 2) {
        term.write('\b \b');
      }
    } else if (printable) {
      term.write(key);
    }
  }));

  term._core.register(term.addDisposableListener('paste', function (data, ev) {
    term.write(data);
  }));
}

function initOptions(term) {
  var blacklistedOptions = [
    // Internal only options
    'cancelEvents',
    'convertEol',
    'debug',
    'handler',
    'screenKeys',
    'termName',
    'useFlowControl',
    // Complex option
    'theme',
    // Only in constructor
    'rendererType'
  ];
  var stringOptions = {
    bellSound: null,
    bellStyle: ['none', 'sound'],
    cursorStyle: ['block', 'underline', 'bar'],
    experimentalCharAtlas: ['none', 'static', 'dynamic'],
    fontFamily: null,
    fontWeight: ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'],
    fontWeightBold: ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900']
  };
  var options = Object.keys(term._core.options);
  var booleanOptions = [];
  var numberOptions = [];
  options.filter(o => blacklistedOptions.indexOf(o) === -1).forEach(o => {
    switch (typeof term.getOption(o)) {
      case 'boolean':
        booleanOptions.push(o);
        break;
      case 'number':
        numberOptions.push(o);
        break;
      default:
        if (Object.keys(stringOptions).indexOf(o) === -1) {
          console.warn(`Unrecognized option: "${o}"`);
        }
    }
  });
}