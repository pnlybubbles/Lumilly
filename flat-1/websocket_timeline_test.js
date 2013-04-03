var $container;
var $body;

function load () {
	load_websocket();
	set_events();
	$container = $(".container");
	$body = $("body");
}


// sebsocket

var ws;

function load_websocket () {
	ws = new WebSocket("ws://localhost:60000/");
	ws.onopen = function() { on_open(); };
	ws.onmessage = function(evt) { on_message(evt); };
	ws.onclose = function() { on_colse(); };
}

function on_open () {
	console.log("socket opened");
}

function on_colse () {
	console.log("socket closed");
}

function on_message (evt) {
	var req = JSON.parse(evt.data);
	// console.log(req);
	if(req.server) {
		var data = req.server;
		if(data !== undefined) {
			send(data.method, data.argu);
		}
	}
}


// send

var methods = {};

function send (method, argu) {
	if(methods[method] === undefined) {
		method_missing(method, argu);
	} else {
		if(argu === undefined) {
			methods[method]();
		} else {
			methods[method](argu);
		}
	}
}


// methods method_missing

function method_missing (method, argu) {
	console.log({
		"method_missing": method,
		"argu": argu
	});
}


// tell method

function tell (method, argu) {
	if(!(argu instanceof Array)) {
		argu = [argu];
	}
	command = {"method": method, "argu": argu};
	console.log(command);
	ws.send(JSON.stringify({"client": command}));
}


// set up events

var mouse_wheeling = false;

function set_events () {
	//get keycode
	$(window).keydown(function(event) {
		key = event.keyCode;
		switch(key) {
			case 38:
			method = "go_prev";
			break;
			case 40:
			method = "go_next";
			break;
			case 70:
			method = "favorite";
			break;
			default:
			method = "key_" + key;
		}
		send(method);
		if(event.preventDefault) {
			event.preventDefault();
		}
	});
	$(window).mousewheel(function(event, delta) {
		if(delta > 0) {
			$body.stop();
			auto_scrolling = false;
		}
	});
}


// key controll

//go prev item
methods.go_prev = function() {
	var items = new Items();
	var prev_item = items.first().prev();
	if(prev_item) {
		send("move_cursor", prev_item);
		if($("." + prev_item.id).offset().top < $body.scrollTop() || ($("." + prev_item.id).offset().top + $("." + prev_item.id).height()) > ($body.scrollTop() + window.innerHeight)) {
			scroll_top = $("." + prev_item.id).offset().top - (window.innerHeight / 2);
			if(scroll_top < 0) {
				scroll_top = 0;
			}
			$body.stop().animate({ scrollTop: scroll_top }, 400, 'easeOutExpo', function(){ auto_scrolling = false; });
		}
	}
};

//go next item
methods.go_next = function() {
	var items = new Items();
	var next_item = items.first().next();
	if(next_item) {
		send("move_cursor", next_item);
		if($("." + next_item.id).offset().top < $body.scrollTop() || ($("." + next_item.id).offset().top + $("." + next_item.id).height()) > ($body.scrollTop() + window.innerHeight)) {
			scroll_top = ($("." + next_item.id).offset().top + $("." + next_item.id).height()) - (window.innerHeight / 2);
			if(scroll_top > ($body.height() - window.innerHeight)) {
				scroll_top = ($body.height() - window.innerHeight);
			}
			$body.stop().animate({ scrollTop: scroll_top }, 400, 'easeOutExpo', function(){ auto_scrolling = false; });
		}
	}
};

//favorite item
methods.favorite = function() {
	var items = new Items();
	$.each(items.item, function(i, item) {
		if(!(item.faved)) {
			tell("favorite", item.real_id);
		} else {
			if(items.item.length == 1) {
				tell("unfavorite", item.real_id);
			}
		}
	});
};


// move item

methods.move_cursor = function(item_obj) {
	var before_items = new Items();
	var set_items = new Items(item_obj);
	if(set_items.initialized) {
		if(before_items.initialized.every(function(v) { return v === true; })) {
			send("deselect_cursor", before_items);
		}
		send("select_cursor", set_items);
	} else {
		throw new Error("item not found: " + JSON.stringify(set_items));
	}
};


// add cursor

methods.add_cursor = function(item_obj) {
	var set_items = new Items(item_obj);
	if(set_items.initialized) {
		send("select_cursor", set_items);
	} else {
		throw new Error("item not found: " + JSON.stringify(set_items));
	}
};


// expand cursor

methods.expand_cursor = function(item_obj) {
	var selected_items = new Items();
	var expand_to_items = new Items(item_obj);
	var selected_first_coord = selected_items.first().coord;
	var selected_last_coord = selected_items.last().coord;
	var expand_to_item_coord = expand_to_items.first().coord;
	var expand_items_arr = [];
	if(Math.abs(selected_first_coord - expand_to_item_coord) < Math.abs(selected_last_coord - expand_to_item_coord)) {
		for(i = Math.min(selected_first_coord, expand_to_item_coord); i <= Math.max(selected_first_coord, expand_to_item_coord); i++) {
			expand_items_arr.push({"coord" : i});
		}
	} else {
		for(i = Math.min(selected_last_coord, expand_to_item_coord); i <= Math.max(selected_last_coord, expand_to_item_coord); i++) {
			expand_items_arr.push({"coord" : i});
		}
	}
	expand_items = new Items(expand_items_arr);
	send("select_cursor", expand_items);
};


// select item

methods.select_cursor = function(items) {
	if(!(items instanceof Items)) {
		items = new Items(items);
	}
	items.select();
	$.each(items.item, function(i, item) {
		$("." + item.id).find(".item_container").addClass("selected");
	});
	// console.log(items);
};


// deselect item

methods.deselect_cursor = function(items) {
	if(!(items instanceof Items)) {
		items = new Items(items);
	}
	items.deselect();
	$.each(items.item, function(i, item) {
		$("." + item.id).find(".item_container").removeClass("selected");
	});
	// console.log(items);
};


// Container class

function Container() {
    this.initialize.apply(this, arguments);
}

Container.prototype = {
	initialize: function() {
		this.keys = ["id", "real_id", "coord"];
		this.id_list = [];
		this.real_id_list = [];
		this.selected = [];
	},
	add: function(id, real_id) {
		this.id_list.push(String(id));
		this.real_id_list.push(String(real_id));
	},
	id: function(id) {
		id = String(id);
		if(this.id_list.indexOf(id) != -1) {
			return {
				"id" : id,
				"real_id" : this.real_id_list[this.id_list.indexOf(id)],
				"coord" : this.id_list.indexOf(id)
			};
		} else {
			return undefined;
		}
	},
	coord: function(coord) {
		coord = parseInt(coord, 10);
		if(this.id_list[coord]) {
			return {
				"id" : this.id_list[coord],
				"real_id" : this.real_id_list[coord],
				"coord" : coord
			};
		} else {
			return undefined;
		}
	},
	item: function(item) {
		if(item) {
			if(item.id) {
				return item.id;
			} else if(item.coord !== undefined) {
				return item.coord;
			} else {
				return undefined;
			}
		} else {
			return undefined;
		}
	},
	select: function(item) {
		var exist_index = -1;
		$.each(this.selected, function(i, each_item) {
			if(each_item.coord == item.coord) {
				exist_index = i;
			}
		});
		if(exist_index == -1) {
			this.selected.push(item);
			// console.log(this.selected);
			return this.selected;
		} else {
			return undefined;
		}
	},
	deselect: function(item) {
		var delete_index = -1;
		$.each(this.selected, function(i, each_item) {
			if(each_item.coord == item.coord) {
				delete_index = i;
			}
		});
		if(delete_index != -1) {
			this.selected.splice(delete_index, 1);
			return this.selected;
		} else {
			return undefined;
		}
	}
};


// Item class

var itemChunk = new Container();

function Item() {
    this.initialize.apply(this, arguments);
}

Item.prototype = {
	initialize: function(item_obj) {
		this.initialized = false;
		this.faved = false;
		itemChunk.keys.forEach(function(key, i) {
			this[key] = null;
		}, this);
		if(!(item_obj)) {
			item_obj = itemChunk.selected[0];
		}
		if(item_obj) {
			var item = null;
			var key;
			if(item_obj.coord !== undefined) {
				item = itemChunk.coord(item_obj.coord);
				for(key in item) {
					this[key] = item[key];
				}
				this.initialized = true;
				return this;
			} else if(item_obj.id) {
				item = itemChunk.id(item_obj.id);
				for(key in item) {
					this[key] = item[key];
				}
				this.initialized = true;
				return this;
			} else {
				return undefined;
			}
		} else {
			return undefined;
		}
	},
	check: function() {
		for(var key in this) {
			if(this[key] === null || this[key] === undefined) {
				return false;
			}
		}
		return true;
	},
	select: function() {
		if(this.check()) {
			return itemChunk.select(this);
		} else {
			throw new Error("not initialized");
		}
	},
	deselect: function() {
		if(this.check()) {
			return itemChunk.deselect(this);
		} else {
			throw new Error("not initialized");
		}
	},
	rel_coord: function(relative) {
		if(this.check()) {
			var rel_item = itemChunk.coord(this.coord + relative);
			if(rel_item) {
				return new Item(rel_item);
			} else {
				return undefined;
			}
		} else {
			throw new Error("not initialized");
		}
	},
	next: function() {
		return this.rel_coord(1);
	},
	prev: function() {
		return this.rel_coord(-1);
	}
};


// Items class

function Items() {
    this.initialize.apply(this, arguments);
}

Items.prototype = {
	initialize: function(item_arr) {
		this.item = [];
		this.initialized = [];

		if(!(item_arr)) {
			item_arr = itemChunk.selected;
		}
		if(!(item_arr instanceof Array)) {
			item_arr = [item_arr];
		}
		// console.log(item_arr);
		if(item_arr[0]) {
			item_arr.forEach(function(item_obj, i) {
				this.initialized[i] = true;
				if(item_obj.coord !== undefined) {
					this.item[i] = new Item(item_obj);
				} else if(item_obj.id) {
					this.item[i] = new Item(item_obj);
				} else {
					this.initialized[i] = false;
					this.item[i] = undefined;
				}
			}, this);
			return this;
		} else {
			this.initialized[0] = false;
			return undefined;
		}
	},
	select: function() {
		var item_selected = [];
		$.each(this.item, function(i, item) {
			item_selected[i] = item.select();
		});
		return item_selected;
	},
	deselect: function() {
		var item_deselected = [];
		$.each(this.item, function(i, item) {
			item_deselected[i] = item.deselect();
		});
		return item_deselected;
	},
	next: function() {
		return this.last().next();
	},
	prev: function() {
		return this.first().prev();
	},
	first: function() {
		return this.item[0];
	},
	last: function() {
		return this.item[this.item.length - 1];
	}
};


// replace_with method

String.prototype.replace_with = function(obj) {
	var str = this;
	for(var key in obj) {
		str = str.replace(key, obj[key]);
	}
	return str;
};


// show tweet on the timeline.

var default_templete = '<div class="item %id% r%real_id%"><div class="item_container"><div class="left_item"><div class="img_wrap"><div class="profile_image" style="background-image: url(\'%profile_image_url%\')"></div></div><div class="text_warp"><div class="screen_name">%screen_name%</div><div class="text">%text%</div></div></div><div class="created_at">%created_at%</div></div></div>';
var retweet_templete = '<div class="item %id% r%real_id%"><div class="item_container"><div class="left_item"><div class="img_wrap"><div class="profile_image" style="background-image: url(\'%profile_image_url%\')"><div class="retweet_img_wrap"><div class="retweet_profile_image" style="background-image: url(\'%retweet_profile_image_url%\')"></div></div></div></div><div class="text_warp"><div class="screen_name">%screen_name%</div><div class="text">%text%</div></div></div><div class="created_at">%created_at%</div></div></div>';
var auto_scrolling = false;

methods.show_tweet = function (data) {
	var window_height = window.innerHeight;
	var is_bottom = auto_scrolling || ($body.scrollTop() + window_height == $body.height());
	var item_html;
	var id;
	if(data.retweeted_status) {
		id = data.retweeted_status.id_str;
		item_html = retweet_templete.replace_with({
			"%screen_name%" : data.retweeted_status.user.screen_name,
			"%text%" : data.retweeted_status.text.replace(/\n/g,"<br>"),
			"%created_at%" : data.retweeted_status.created_at.hour + ":" + data.retweeted_status.created_at.min + ":" + data.retweeted_status.created_at.sec,
			"%profile_image_url%" : data.retweeted_status.user.profile_image_url.replace(/_normal/, ""),
			"%retweet_profile_image_url%" : data.user.profile_image_url.replace(/_normal/, ""),
			"%id%" : data.id_str,
			"%real_id%" : id
		});
	} else {
		id = data.id_str;
		item_html = default_templete.replace_with({
			"%screen_name%" : data.user.screen_name,
			"%text%" : data.text.replace(/\n/g,"<br>"),
			"%created_at%" : data.created_at.hour + ":" + data.created_at.min + ":" + data.created_at.sec,
			"%profile_image_url%" : data.user.profile_image_url.replace(/_normal/, ""),
			"%id%" : data.id_str,
			"%real_id%" : id
		});
	}
	$container.append(item_html);
	if(is_bottom) {
		auto_scrolling = true;
		$body.stop(true, false).animate({ scrollTop: $body.height() - window_height }, 200, 'easeOutQuad', function(){ auto_scrolling = false; });
	}
	$("." + data.id_str).click(function(event) {
		if(event.shiftKey) {
			send("expand_cursor", {"id" : $(this).attr("class").match(/[0-9]+/)[0]});
		} else if(event.metaKey) {
			send("add_cursor", {"id" : $(this).attr("class").match(/[0-9]+/)[0]});
		} else {
			send("move_cursor", {"id" : $(this).attr("class").match(/[0-9]+/)[0]});
		}
	});
	// console.log("'" + id + "'");
	itemChunk.add(data.id_str, id);
	document.title = itemChunk.id_list.length;
};
