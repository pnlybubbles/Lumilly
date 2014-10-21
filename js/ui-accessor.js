// UI Accessor

function Accessor () {
  this.initialize.apply(this, arguments);
}

Accessor.prototype = {
  initialize: function(call_func_receiver) {
    this.call_func_receiver = call_func_receiver;
    this.ws = new WebSocket("ws://localhost:8080/");
    var self = this;
    this.ws.onopen = function(event) {
      console.log("websocket open");
      var req = {
        "name" : "load",
        "argu": null
      };
      self.tell(req);
    };
    this.ws.onmessage = function(event) {
      var req = JSON.parse(event.data);
      self.get(req);
    };
    this.ws.onclose = function(event) {
      console.log("websocket close");
    };
    this.ws.onerror = function(event) {
      console.log("error");
    };
  },
  send_ws: function(msg) {
    msg["from"] = "client";
    console.log(msg);
    this.ws.send(JSON.stringify(msg));
  },
  tell: function(req, callback) { // callback not recommend
    callback_id = null;
    if(callback === true) {
      callback_id = Math.round(Math.random() * Math.pow(36, 4)).toString(36);
    }
    var msg = {
      "type" : "event",
      "content" : req,
      "callback_id" : callback_id
    };
    this.send_ws(msg);
  },
  get: function(req) {
    if(req.from == "server") {
      // console.log(req);
      var e = req.content;
      switch(req.type) {
        case "event":
          if(!this.call_func_receiver[e["name"]]) {
            throw new Error("target method not found: \"" + e["name"] + "\"");
          }
          if(e["argu"] === null || e["argu"] === undefined) {
            e["argu"] = [];
          } else if(!(e["argu"] instanceof Array)) {
            e["argu"] = [e["argu"]];
          }
          ret = this.call_func_receiver[e["name"]].apply(this.call_func_receiver, e["argu"]);
          if(req.callback_id) {
            var msg = {
              "type" : "callback",
              "content" : {
                "return" : ret
              },
              "callback_id" : req.callback_id
            };
            this.send_ws(msg);
          }
        break;
        case "callback": // callback not recommend
          if(!this.call_func_receiver[e["name"]]) {
            throw new Error("target method not found: \"" + e["name"] + "\"");
          }
          if(e["argu"] === null || e["argu"] === undefined) {
            e["argu"] = [];
          } else if(!(e["argu"] instanceof Array)) {
            e["argu"] = [e["argu"]];
          }
          this.call_func_receiver[e["name"]].apply(this.call_func_receiver, e["argu"]);
        break;
      }
    }
  },
  call_method_asynchronous: function(method_name, argu) {
    if(argu === null || argu === undefined) {
      argu = [];
    } else if(!(argu instanceof Array)) {
      argu = [argu];
    }
    req = {
      "name" : method_name,
      "argu" : argu
    };
    this.tell(req);
  }
};
