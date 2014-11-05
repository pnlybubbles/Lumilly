/*
KeyEvent
requirement: jquery.js
*/

function KeyEvents () {
  this.initialize.apply(this, arguments);
}

KeyEvents.listeners = [];
KeyEvents.binding = [];
KeyEvents.focused = undefined;
KeyEvents.peculiar_events = [];


KeyEvents.prototype = {
  initialize: function(listener_id) {
    // console.log(listener_id);
    this.listener_obj = listener_id;
    this.index = KeyEvents.listeners.length;
    KeyEvents.listeners.push(listener_id);
    KeyEvents.binding.push({});
    KeyEvents.peculiar_events.push({});
    // KeyEvents.focused = KeyEvents.listeners.length - 1;
  },
  bind: function(key_code, with_key, func, this_obj) {
    if(!key_code || !with_key) {
      throw new Error("key_code or with_key undefined");
    }
    if(with_key.join("").replace(/[acms]*/, "") !== "") {
      throw new Error("invalid with_key: " + with_key.join(", "));
    }
    var key = key_code + with_key.sort().join();
    KeyEvents.binding[this.index][key] = function(event) {
      if(event.preventDefault) {
        event.preventDefault();
      }
      return func.apply(this_obj, arguments);
    };
    return this;
  },
  on_focus: function(func, this_obj) {
    if(this_obj === undefined) {
      this_obj = this;
    }
    KeyEvents.peculiar_events[this.index]["focus"] = {};
    KeyEvents.peculiar_events[this.index]["focus"]["func"] = func;
    KeyEvents.peculiar_events[this.index]["focus"]["this"] = this_obj;
  },
  on_blur: function(func, this_obj) {
    if(this_obj === undefined) {
      this_obj = this;
    }
    KeyEvents.peculiar_events[this.index]["blur"] = {};
    KeyEvents.peculiar_events[this.index]["blur"]["func"] = func;
    KeyEvents.peculiar_events[this.index]["blur"]["this"] = this_obj;
  },
  focus: function() {
    KeyEvents.focus(this.index);
    return this;
  }
};

KeyEvents.set_event = function() {
  $(window).bind("keydown", function() {
    var key_code = event.keyCode;
    var key_binding = KeyEvents.binding[KeyEvents.focused];
    var with_key = [];
    if(event.altKey) {
      with_key.push("a");
    }
    if(event.ctrlKey) {
      with_key.push("c");
    }
    if(event.metaKey) {
      with_key.push("m");
    }
    if(event.shiftKey) {
      with_key.push("s");
    }
    var key = key_code + with_key.sort().join();
    if(key_binding && key in key_binding) {
      key_binding[key](event);
    }
  });
};

KeyEvents.focus = function(id_index) {
  var focus_index = null;
  if(isNumber(id_index)) {
    focus_index = id_index;
  } else if (typeof id_index == "string") {
    $.each(KeyEvents.listeners, function(i, listener_obj) {
      if(listener_obj == id_index) {
        focus_index = i;
        return false;
      }
    });
  }
  if(focus_index !== null && focus_index !== KeyEvents.focused) {
    var blur_index = KeyEvents.focused;
    KeyEvents.focused = focus_index;
    // console.log("focus : " + KeyEvents.listeners[focus_index]);
    // console.log("blur : " + KeyEvents.listeners[blur_index]);
    // console.log(KeyEvents.global_peculiar_event);
    if(isNumber(blur_index)) {
      if(KeyEvents.peculiar_events[blur_index]["blur"]) {
        KeyEvents.peculiar_events[blur_index]["blur"]["func"].apply(KeyEvents.peculiar_events[blur_index]["blur"]["this"], [KeyEvents.listeners[focus_index]]);
      }
      if(KeyEvents.global_peculiar_event["blur"]) {
        KeyEvents.global_peculiar_event["blur"]["func"].apply(KeyEvents.global_peculiar_event["blur"]["this"], [KeyEvents.listeners[focus_index]]);
      }
    }
    if(isNumber(focus_index)) {
      if(KeyEvents.peculiar_events[focus_index]["focus"]) {
        KeyEvents.peculiar_events[focus_index]["focus"]["func"].apply(KeyEvents.peculiar_events[focus_index]["focus"]["this"], [KeyEvents.listeners[blur_index]]);
      }
      if(KeyEvents.global_peculiar_event["focus"]) {
        KeyEvents.global_peculiar_event["focus"]["func"].apply(KeyEvents.global_peculiar_event["focus"]["this"], [KeyEvents.listeners[blur_index]]);
      }
    }
    return true;
  } else {
    return false;
  }
};

KeyEvents.global_peculiar_event = {};

KeyEvents.on_focus = function(func, this_obj) {
  // console.log("global on focus");
  KeyEvents.global_peculiar_event["focus"] = {};
  KeyEvents.global_peculiar_event["focus"]["func"] = func;
  KeyEvents.global_peculiar_event["focus"]["this"] = this_obj;
};

KeyEvents.on_blur = function(func, this_obj) {
  // console.log("global on blur");
  KeyEvents.global_peculiar_event["blur"] = {};
  KeyEvents.global_peculiar_event["blur"]["func"] = func;
  KeyEvents.global_peculiar_event["blur"]["this"] = this_obj;
};

KeyEvents.set_event();
