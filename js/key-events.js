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

KeyEvents.prototype = {
    initialize: function(jquery_obj) {
        this.listener_obj = jquery_obj;
        this.index = KeyEvents.listeners.length;
        KeyEvents.listeners.push(jquery_obj);
        KeyEvents.binding.push({});
        KeyEvents.focused = KeyEvents.listeners.length - 1;
    },
    bind: function(key_code, with_key, func, this_obj) {
        if(with_key.join().replace(/[acms]*/, "") !== "") {
            throw new Error("invalid with_key");
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
    focus: function() {
        KeyEvents.focused = this.index;
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

KeyEvents.focus = function(jquery_obj) {
    $.each(KeyEvents.listeners, function(i, listener_obj) {
        if(listener_obj.get(0) == jquery_obj.get(0)) {
            KeyEvents.focused = i;
            return false;
        }
    });
};

KeyEvents.set_event();
