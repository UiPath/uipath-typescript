/*
 * Runs inside a Custom HTML control's sandboxed frame, before the control's own code.
 *
 * It provides the `App` object (getVariable, setVariable, onVariableChange, setHeight),
 * `localStorage`, `sessionStorage` and `document.cookie`, all served by the page through a
 * private channel, and then builds the control in the order Apps does: external
 * stylesheets, the CSS, the HTML, external scripts one after another, the HTML's own
 * scripts, the JavaScript, and finally a `controlLoad` event.
 */
(function () {
  var cfg = window.__uiappCustomHtml || {};
  delete window.__uiappCustomHtml;
  var port = null;
  var pending = {};
  var seq = 0;
  var listeners = {};
  var areas = {};
  var proxies = {};
  // The page keeps `local` in the app's localStorage and `session` and `cookie` together in
  // its sessionStorage, each entry under a prefix naming this app. The budget is per browser
  // store, counted as the page stores it — other apps' entries included, as the page reports
  // them — and kept well under the browser's own limit so that the app's own storage always
  // has room.
  var prefix = 'uiapp-custom-html:';
  var reserved = { local: { chars: 0, keys: 0 }, session: { chars: 0, keys: 0 } };
  var BUDGET = 1000000;
  var MAX_KEYS = 10000;
  var SHARES = { local: ['local'], session: ['session', 'cookie'], cookie: ['session', 'cookie'] };

  function send(message) {
    port.postMessage(message);
  }

  function request(type, name, value) {
    return new Promise(function (resolve, reject) {
      var id = ++seq;
      pending[id] = [resolve, reject];
      send({ id: id, type: type, name: name, value: value });
    });
  }

  window.App = {
    getVariable: function (name) { return request('get', name); },
    setVariable: function (name, value) { return request('set', name, value); },
    onVariableChange: function (name, callback) {
      if (!callback) {
        console.error('onVariableChange callback function has not been provided');
        return undefined;
      }
      var list = listeners[name] || (listeners[name] = []);
      list.push(callback);
      if (list.length === 1) send({ type: 'watch', name: name });
      return function () {
        var i = list.indexOf(callback);
        if (i >= 0) list.splice(i, 1);
        if (!list.length) {
          delete listeners[name];
          send({ type: 'unwatch', name: name });
        }
      };
    },
    // A number, or a numeric string, is in px; anything else must be a valid CSS height.
    setHeight: function (height) {
      if (!height) {
        console.error('setHeight: height value parameter is required');
        return;
      }
      var h = String(height).trim();
      if (/^[0-9]+([.][0-9]+)?$/.test(h)) h += 'px';
      if (!(window.CSS && CSS.supports('height', h))) {
        console.error('setHeight: Invalid height value. Must be a valid CSS length (e.g., "300px", "50%", "20em", "50vh", "calc(100vh - 50px)", or number which will be converted to px).');
        return;
      }
      send({ type: 'height', value: h });
    },
  };

  // Every Custom HTML control in this app shares one store per area. Writes are kept by the
  // page, so they outlast a reload (`local`) or the tab session (`session`, `cookie`).
  function usage(area, key, value) {
    var other = reserved[area === 'local' ? 'local' : 'session'];
    var chars = other.chars;
    var keys = other.keys;
    SHARES[area].forEach(function (a) {
      var items = areas[a];
      for (var k in items) {
        if (a === area && k === key) continue;
        chars += prefix.length + a.length + 1 + k.length + items[k].length;
        keys++;
      }
    });
    return { chars: chars + prefix.length + area.length + 1 + key.length + value.length, keys: keys + 1 };
  }

  function write(area, key, value) {
    var items = areas[area];
    if (value === null) {
      if (!(key in items)) return;
      delete items[key];
    } else {
      var used = usage(area, key, value);
      if (used.chars > BUDGET || used.keys > MAX_KEYS) {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      }
      items[key] = value;
    }
    send({ type: 'storage', area: area, key: key, value: value });
  }

  function needs(count, args, name) {
    if (args.length < count) {
      throw new TypeError("Failed to execute '" + name + "' on 'Storage': " + count + ' argument'
        + (count > 1 ? 's' : '') + ' required, but only ' + args.length + ' present.');
    }
  }

  // A Storage look-alike: the methods, `length`, and each item as a property, so
  // `localStorage.theme`, `Object.keys(localStorage)` and `JSON.stringify(localStorage)` work.
  function storage(area) {
    var api = {
      getItem: function (key) {
        needs(1, arguments, 'getItem');
        key = String(key);
        return key in areas[area] ? areas[area][key] : null;
      },
      setItem: function (key, value) {
        needs(2, arguments, 'setItem');
        write(area, String(key), String(value));
      },
      removeItem: function (key) {
        needs(1, arguments, 'removeItem');
        write(area, String(key), null);
      },
      clear: function () {
        areas[area] = Object.create(null);
        send({ type: 'storage', area: area, clear: true });
      },
      key: function (index) {
        needs(1, arguments, 'key');
        var keys = Object.keys(areas[area]);
        var i = Number(index) >>> 0;
        return i < keys.length ? keys[i] : null;
      },
    };
    var builtIn = function (prop) { return prop === 'length' || Object.prototype.hasOwnProperty.call(api, prop); };
    return new Proxy({}, {
      get: function (target, prop) {
        if (prop === 'length') return Object.keys(areas[area]).length;
        if (typeof prop !== 'string' || builtIn(prop)) return api[prop];
        return prop in areas[area] ? areas[area][prop] : undefined;
      },
      set: function (target, prop, value) {
        if (typeof prop === 'string' && !builtIn(prop)) write(area, prop, String(value));
        return true;
      },
      deleteProperty: function (target, prop) {
        if (typeof prop === 'string' && !builtIn(prop)) write(area, prop, null);
        return true;
      },
      has: function (target, prop) { return builtIn(prop) || prop in areas[area]; },
      ownKeys: function () { return Object.keys(areas[area]); },
      getOwnPropertyDescriptor: function (target, prop) {
        if (typeof prop !== 'string' || !(prop in areas[area])) return undefined;
        return { value: areas[area][prop], writable: true, enumerable: true, configurable: true };
      },
    });
  }

  function cookie() {
    return {
      get: function () {
        var jar = areas.cookie;
        return Object.keys(jar).map(function (k) { return k === '' ? jar[k] : k + '=' + jar[k]; }).join('; ');
      },
      // As a browser: `name=value` or a bare `value`, then attributes; `max-age` of zero or
      // less, or a past `expires`, deletes it; one over 4 KB is ignored.
      set: function (text) {
        var parts = String(text).split(';');
        var pair = parts.shift();
        var eq = pair.indexOf('=');
        var name = eq < 0 ? '' : pair.slice(0, eq).trim();
        var value = (eq < 0 ? pair : pair.slice(eq + 1)).trim();
        if (name.length + value.length > 4096) return;
        var expired = parts.some(function (p) {
          var at = p.indexOf('=');
          var attr = (at < 0 ? p : p.slice(0, at)).trim().toLowerCase();
          var v = at < 0 ? '' : p.slice(at + 1).trim();
          return (attr === 'max-age' && v !== '' && Number(v) <= 0)
            || (attr === 'expires' && Date.parse(v) <= Date.now());
        });
        try {
          write('cookie', name, expired ? null : value);
        } catch (err) {
          // A browser drops a cookie it has no room for; it does not throw.
        }
      },
    };
  }

  function install(snapshot) {
    if (snapshot && typeof snapshot.scope === 'string') prefix = 'uiapp-custom-html:' + snapshot.scope + ':';
    if (snapshot && snapshot.reserved) reserved = snapshot.reserved;
    ['local', 'session', 'cookie'].forEach(function (area) {
      var items = Object.create(null);
      var from = (snapshot && snapshot[area]) || {};
      for (var k in from) items[k] = String(from[k]);
      areas[area] = items;
    });
    proxies.local = storage('local');
    proxies.session = storage('session');
    Object.defineProperty(window, 'localStorage', { value: proxies.local, configurable: true });
    Object.defineProperty(window, 'sessionStorage', { value: proxies.session, configurable: true });
    Object.defineProperty(document, 'cookie', Object.assign({ configurable: true }, cookie()));
  }

  // Another control changed a shared store: apply it, and raise `storage` as a browser does.
  function synced(m) {
    var items = areas[m.area];
    if (!items) return;
    var init;
    if (m.clear) {
      areas[m.area] = Object.create(null);
      init = { key: null, oldValue: null, newValue: null };
    } else {
      init = { key: m.key, oldValue: m.key in items ? items[m.key] : null, newValue: m.value };
      if (m.value === null) delete items[m.key];
      else items[m.key] = m.value;
    }
    if (m.area === 'cookie') return;
    var event = new StorageEvent('storage', init);
    Object.defineProperty(event, 'storageArea', { value: proxies[m.area] });
    window.dispatchEvent(event);
  }

  // The page could not keep a write this frame already applied: undo it here and say so,
  // the nearest a deferred write can come to the browser's QuotaExceededError.
  function rejected(m) {
    var items = areas[m.area];
    if (!items) return;
    if (m.value === null) delete items[m.key];
    else items[m.key] = m.value;
    var where = m.area === 'local' ? 'localStorage' : m.area === 'session' ? 'sessionStorage' : 'document.cookie';
    console.error(new DOMException(where + ': "' + m.key + '" was not saved; the storage quota has been exceeded.', 'QuotaExceededError'));
  }

  window.addEventListener('message', function (event) {
    var data = event.data || {};
    if (port || event.source !== window.parent || data.type !== 'uiapp-custom-html-port' || !event.ports[0]) return;
    port = event.ports[0];
    port.onmessage = function (e) {
      var m = e.data || {};
      if (m.type === 'reply' && pending[m.id]) {
        var settle = pending[m.id];
        delete pending[m.id];
        (m.ok ? settle[0] : settle[1])(m.data);
      } else if (m.type === 'change') {
        (listeners[m.name] || []).slice().forEach(function (cb) {
          try { cb(m.value); } catch (err) { console.error(err); }
        });
      } else if (m.type === 'storage') {
        synced(m);
      } else if (m.type === 'storage-rejected') {
        rejected(m);
      } else if (m.type === 'error') {
        console.error(m.data);
      }
    };
    install(data.storage);
    run();
  });
  window.parent.postMessage({ type: 'uiapp-custom-html-ready', nonce: cfg.nonce }, '*');

  function failed(url) {
    send({ type: 'resource-error', url: url });
  }

  function run() {
    var head = document.head;
    var body = document.body;
    (cfg.cssExternal || []).forEach(function (href) {
      if (!href) return;
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onerror = function () { failed(href); };
      head.appendChild(link);
    });
    if (cfg.css) {
      var style = document.createElement('style');
      style.textContent = cfg.css;
      head.appendChild(style);
    }
    if (cfg.html) body.insertAdjacentHTML('beforeend', cfg.html);
    if (cfg.disabled) {
      var overlay = document.createElement('div');
      overlay.className = 'disabled-overlay';
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
      body.appendChild(overlay);
    }

    // Scripts placed by insertAdjacentHTML never run, so each is replaced by a fresh copy.
    // All of them run in order, each waiting for the one before it to load.
    var scripts = [];
    (cfg.jsExternal || []).forEach(function (src) {
      if (!src) return;
      var s = document.createElement('script');
      s.src = src;
      scripts.push(s);
    });
    Array.prototype.slice.call(body.querySelectorAll('script')).forEach(function (old) {
      var s = document.createElement('script');
      for (var i = 0; i < old.attributes.length; i++) s.setAttribute(old.attributes[i].name, old.attributes[i].value);
      s.text = old.text;
      old.parentNode.removeChild(old);
      scripts.push(s);
    });
    if (cfg.js) {
      var own = document.createElement('script');
      own.text = cfg.js;
      scripts.push(own);
    }
    scripts.reduce(function (chain, s) {
      return chain.then(function () {
        return new Promise(function (resolve) {
          if (s.src) {
            s.onload = function () { resolve(); };
            s.onerror = function () { failed(s.getAttribute('src')); resolve(); };
          }
          body.appendChild(s);
          if (!s.src) resolve();
        });
      });
    }, Promise.resolve()).then(function () {
      window.dispatchEvent(new Event('controlLoad'));
      send({ type: 'loaded' });
    });
  }
})();
