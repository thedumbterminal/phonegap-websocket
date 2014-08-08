	
  var cordova = require('cordova');

  var websocketId = 0;
  
  var JavaWebSocket = function (url, protocols, options) {

    var socket = this;
    options || (options = {});
    options.headers || (options.headers = {});

    if (Array.isArray(protocols)) {
      protocols = protocols.join(',');
    }
    
    if (protocols) {
      options.headers["Sec-WebSocket-Protocol"] = protocols;
    }

    this.events = [];
    this.options = options;
    this.url = url;
    this.readyState = JavaWebSocket.CONNECTING;
    this.socketId = "_cordova_websocket_" + websocketId;
    websocketId += 1;
    
    cordova.exec(
      function (event) {
        socket._handleEvent(event);
      },
      function (event) {
        socket._handleEvent(event);
      }, "WebSocket", "connect", [ this.socketId, url, options ]);
  };

JavaWebSocket.hasWebSocket = function(){
	console.log("haswebsocket()");
  var m = /Android ([0-9]+)\.([0-9]+)/i.exec(navigator.userAgent);
  var hasConstructor = typeof WebSocket === "function";

  if (!m) { return hasConstructor; }

  var x = parseInt(m[1], 10);
  var y = parseInt(m[2], 10);

  return hasConstructor && (x > 4 || (x === 4 && y >= 4));
};


//rewrite this
  JavaWebSocket.prototype = {
    send: function (data) {
      if (this.readyState == JavaWebSocket.CLOSED ||
          this.readyState == JavaWebSocket.CLOSING) return;
      
      if (data instanceof ArrayBuffer) {
        data = JavaWebSocket.arrayBufferToArray(data);
      } 
      else if (data instanceof Blob) {
        var reader = new FileReader();
        reader.onloadend = function() {
          this.send(reader.result);
        }.bind(this);
        
        reader.readAsArrayBuffer(data);  
        return;
      }
      
      cordova.exec(JavaWebSocket.noob, JavaWebSocket.noob, "WebSocket", "send", [ this.socketId, data ]);
    },
  

    close: function () {
      if (this.readyState == JavaWebSocket.CLOSED ||
        this.readyState == JavaWebSocket.CLOSING) return;

      this.readyState = JavaWebSocket.CLOSING;
      cordova.exec(JavaWebSocket.noob, JavaWebSocket.noob, "WebSocket", "close", [ this.socketId ]);
    },

    addEventListener: function (type, listener, useCapture) {
      this.events[type] || (this.events[type] = []);
      this.events[type].push(listener);
    },

    removeEventListener: function (type, listener, useCapture) {
      var events;

      if (!this.events[type]) return;

      events = this.events[type];

      for (var i = events.length - 1; i >= 0; --i) {
        if (events[i] === listener) {
          events.splice(i, 1);
          return;
        }
      }
    },

    dispatchEvent: function (event) {
      var handler;
      var events = this.events[event.type] || [];

      for (var i = 0, l = events.length; i < l; i++) {
        events[i](event);
      }

      handler = this["on" + event.type];
      if (handler) handler(event);
    },

    _handleEvent: function (event) {
      this.readyState = event.readyState;

      if (event.type == "message") {
        event = JavaWebSocket.createMessageEvent("message", event.data);
      } 
      else if (event.type == "messageBinary") {
        var result = JavaWebSocket.arrayToBinaryType(event.data, this.binaryType);
        event = JavaWebSocket.createBinaryMessageEvent("message", result);
      } 
      else {
        event = JavaWebSocket.createSimpleEvent(event.type);
      }
      
      this.dispatchEvent(event);
      
      if (event.readyState == JavaWebSocket.CLOSING || 
          event.readyState == JavaWebSocket.CLOSED) {
        // cleanup socket from internal map
        cordova.exec(JavaWebSocket.noob, JavaWebSocket.noob, "WebSocket", "close", [ this.socketId ]);
      }
    }
  };


  JavaWebSocket.prototype.CONNECTING = JavaWebSocket.CONNECTING = 0;
  JavaWebSocket.prototype.OPEN = JavaWebSocket.OPEN = 1;
  JavaWebSocket.prototype.CLOSING = JavaWebSocket.CLOSING = 2;
  JavaWebSocket.prototype.CLOSED = JavaWebSocket.CLOSED = 3;


  // helpers

  JavaWebSocket.noob = function() {}

  JavaWebSocket.createSimpleEvent = function(type) {
    var event = document.createEvent("Event");
    event.initEvent(type, false, false);
    return event;
  }

  JavaWebSocket.createMessageEvent = function(type, data) {
    var event = document.createEvent("MessageEvent");
    event.initMessageEvent("message", false, false, data, null, null, window, null);
    return event;
  }
    
  JavaWebSocket.createBinaryMessageEvent = function(type, data) {
    // This does not match the WebSocket spec. The Event is suppose to be a
    // MessageEvent. But in Android WebView, MessageEvent.initMessageEvent() 
    // makes a mess of ArrayBuffers.  This should work with most clients, as
    // long as they don't do something odd with the event.  The type is 
    // correctly set to "message", so client event routing logic should work.
    var event = document.createEvent("Event");

    event.initEvent("message", false, false);
    event.data = data;
    return event;
  }

  JavaWebSocket.arrayBufferToArray = function(arrayBuffer) {
    var output = [];
    var utf8arr = new Uint8Array(arrayBuffer);
    
    for ( var i = 0, l = utf8arr.length; i < l; i++) {
      output.push(utf8arr[i]);
    }
    
    return output;
  }
    
  JavaWebSocket.arrayToBinaryType = function(array, binaryType) {   
    var result = null;

    if (!array || !array.length) return result;

    var typedArr = new Uint8Array(array.length);

    typedArr.set(array);
    
    if (binaryType === "arraybuffer") {
      result = typedArr.buffer;
    } 
    else if (binaryType === "blob") { 
      if (window.WebKitBlobBuilder) {
        var builder = new WebKitBlobBuilder();
        builder.append(typedArr.buffer);
        result = builder.getBlob("application/octet-stream");
      } 
      else {
        result = new Blob([ bytearray ], {
          type: 'application/octet-stream'
        });
      }
    }

    return result;
  }

  Array.isArray = Array.isArray || function (args) {
    return Object.prototype.toString.call(args) === "[object Array]";
  }
  
  window.ArrayBuffer = window.ArrayBuffer || function () {
    throw "ArrayBuffer not supported on this platform";
  }
  
  window.Blob = window.Blob || function () {
    throw "Blob not supported on this platform";
  }


//Register the plugin
module.exports = JavaWebSocket;
