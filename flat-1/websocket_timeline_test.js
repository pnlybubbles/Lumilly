var $container;
var $body;
var container_margin;
var $post_textarea;
var post_textarea;

function load () {
	$body = $("body");
	tab_setup();
	container_margin = parseInt($container.css("margin-bottom"), 10);
	$post_textarea = $(".post_textarea");
	post_textarea = document.getElementsByClassName('post_textarea')[0];
	$post_textarea_count = $(".post_textarea_count");
	load_websocket();
	set_events();
}


//=========================
// websocket
//=========================

var ws;

function load_websocket () {
	ws = new WebSocket("ws://localhost:60000/");
	ws.onopen = function() { on_open(); };
	ws.onmessage = function(evt) { on_message(evt); };
	ws.onclose = function() { on_colse(); };
}

function on_open () {
	console.log("socket opened");
	tell("verify_credentials");
	tell("home_timeline", [0, 200], "fill_timeline");
	tell("mention_timeline", [0, 200], "fill_timeline");
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


//=========================
// methods exchanger
//=========================

// send
// call "methods"s method with argument

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
// called when methods do not have sended method

function method_missing (method, argu) {
	console.log({
		"method_missing": method,
		"argu": argu
	});
}


// tell method
// send method and argument to ruby client

function tell (method, argu, func) {
	if(!(argu instanceof Array)) {
		argu = [argu];
	}
	if(func === undefined) {
		func = null;
	}
	command = {"method": method, "argu": argu, "callback": func};
	console.log(command);
	ws.send(JSON.stringify({"client": command}));
}


//=========================
// setup events
//=========================

var mouse_wheeling = false;
var typing_event = false;

function set_events () {
	// get keycode
	$(window).keydown(function(event) {
		var key = event.keyCode;
		var with_state = [];
		var method = {"null" : []};
		// get method which assign to keys
		switch(key) {
			case 38: //up
			method = {"go_prev" : ["tl"]};
			break;
			case 40: //down
			method = {"go_next" : ["tl"], "cursor_to_end" : ["tl", "meta"]};
			break;
			case 70: //f
			method = {"toggle_favorite" : ["tl"]};
			break;
			case 83: //s
			method = {"toggle_favorite" : ["tl", "ctrl"]};
			break;
			case 86: //v
			method = {"toggle_retweet" : ["tl", "shift", "meta"], "unofficial_retweet" : ["tl", "alt", "meta"]};
			break;
			case 82: //r
			method = {"toggle_retweet" : ["tl", "alt"]};
			break;
			case 81: //q
			method = {"unofficial_retweet" : ["tl", "ctrl"]};
			break;
			case 9: //tab
			method = {"toggle_textarea_focus" : ["both"]};
			break;
			case 13: //enter
			method = {"enter_to_post" : ["type", "ctrl", "noprevent"], "type_newline" : ["type"], "create_reply" : ["tl"]};
			break;
			case 67: //c
			method = {"copy_tweet" : ["tl", "meta"]};
			break;
			case 78: //n
			method = {"create_new_tweet" : ["both", "meta"]};
			break;
			case 35: //end
			method = {"cursor_to_end" : ["tl"]};
			break;
			case 32: //space
			method = {"toggle_buttons_opened" : ["tl"]};
			break;
			default:
		}
		// console.log(method);
		// get decoration keys
		if(event.shiftKey) {
			with_state.push("shift");
		}
		if(event.altKey) {
			with_state.push("alt");
		}
		if(event.ctrlKey) {
			with_state.push("ctrl");
		}
		if(event.metaKey) {
			with_state.push("meta");
		}
		if(typing_event) {
			with_state.push("type");
		} else {
			with_state.push("tl");
		}
		with_state = with_state.sort();
		// check method's running condition
		for(var method_key in method) {
			var no_prevent_default = false;
			var method_with_state = method[method_key].map(function(v) {
				if(v == "both") {
					return typing_event ? "type" : "tl";
				} else if(v == "noprevent") {
					no_prevent_default = true;
					return undefined;
				} else { return v; }
			}).sort();
			method_with_state = method_with_state.slice(0, (undefined_pos = method_with_state.indexOf(undefined) == -1 ? method_with_state.length : undefined_pos + 1));
			if(JSON.stringify(method_with_state) == JSON.stringify(with_state)) {
				if(!(no_prevent_default)) {
					if(event.preventDefault) {
						event.preventDefault();
					}
				}
				if(method_with_state.indexOf("tl") != -1 && !(typing_event) || method_with_state.indexOf("type") != -1 && typing_event) {
					send(method_key);
				}
			}
		}
		// always send under typing "keydown"
		if(typing_event) {
			// update the counter of textarea and check in_reply_to user in text
			var on_typing_methods = ["update_post_textarea_count"];
			// var on_typing_methods = ["update_post_textarea_count", "check_in_reply_to"];
			on_typing_methods.forEach(function(method, i) {
				send(method);
			});
		}
	});
	// always send under typing "keyup"
	$(window).keyup(function(event) {
		if(typing_event) {
			// update the counter of textarea and check in_reply_to user in text
			var on_typing_methods = ["update_post_textarea_count"];
			// var on_typing_methods = ["update_post_textarea_count", "check_in_reply_to"];
			on_typing_methods.forEach(function(method, i) {
				send(method);
			});
		}
	});
	// mousewheel to stop timeline animation
	$(window).mousewheel(function(event, delta) {
		if(delta > 0) {
			$body.stop();
			auto_scrolling = false;
		}
	});
	// behavior on focus to post_textarea
	$post_textarea.focus(function() {
		typing_event = true;
		send("update_post_textarea_count"); // show post_textarea_count
	}).blur(function() {
		typing_event = false;
		$post_textarea_count.text(""); // hide post_textarea_count
	});
	// find clicked item from coordinate of mouse
	// $(".event_listener_layer").click(function(event) {
	// 	console.log(+new Date());
	// 	item = get_item_from_mouse_offset(event);
	// 	console.log(+new Date());
	// 	if(item) {
	// 		item_click(event, item.elm);
	// 		console.log(+new Date());
	// 	}
	// });
}


// get className item from mouse offset

function get_item_from_mouse_offset (event) {
	console.log(+new Date());
	var yoffset = event.pageY;
	var offset_item;
	var item_element_list = $.extend(true, [], itemChunk[act].element_list);
	// var item_element_list = $.extend(true, [], itemChunk[act].yoffset_list);
	console.log(+new Date());
	item_element_list.reverse();
	for(var i in item_element_list) {
		// if(item_element_list[i] < yoffset) {
		if(item_element_list[i].position().top < yoffset) {
			offset_item = new Item({"coord" : item_element_list.length - i - 1});
			break;
		}
	}
	console.log(+new Date());
	if(offset_item && offset_item.initialized) {
		return offset_item;
	} else {
		return undefined;
	}
}


// item onclick event

function item_click (event, elm) {
	if(event.shiftKey) {
		send("expand_cursor", {"id" : elm.attr("class").match(/[0-9]+/)[0]});
	} else if(event.metaKey) {
		send("add_cursor", {"id" : elm.attr("class").match(/[0-9]+/)[0]});
	} else {
		send("move_cursor", {"id" : elm.attr("class").match(/[0-9]+/)[0]});
	}
}


//=========================
// key controll
//=========================

// go prev item

methods.go_prev = function() {
	var items = new Items();
	var prev_item;
	if(!(items.all_initialized())) {
		items = new Items(itemChunk[act].last());
		prev_item = items.first();
	} else {
		prev_item = items.first().prev();
	}
	if(items.all_initialized()) {
		if(prev_item) {
			send("move_cursor", prev_item);
			if(prev_item.elm.offset().top < $body.scrollTop() || (prev_item.elm.offset().top + prev_item.elm.height()) > ($body.scrollTop() + window.innerHeight)) {
				var scroll_top = prev_item.elm.offset().top - (window.innerHeight / 2);
				if(scroll_top < 0) {
					scroll_top = 0;
				}
				$body.stop().animate({ scrollTop: scroll_top }, 400, 'easeOutExpo', function(){ auto_scrolling = false; });
			}
		}
	}
};


// go next item

methods.go_next = function() {
	var items = new Items();
	var next_item;
	if(!(items.all_initialized())) {
		items = new Items(itemChunk[act].last());
		next_item = items.first();
	} else {
		next_item = items.first().next();
	}
	if(items.all_initialized()) {
		if(next_item) {
			send("move_cursor", next_item);
			if(next_item.elm.offset().top < $body.scrollTop() || (next_item.elm.offset().top + next_item.elm.height()) > ($body.scrollTop() + window.innerHeight - container_margin)) {
				var scroll_top = (next_item.elm.offset().top + next_item.elm.height()) - (window.innerHeight / 2);
				if(scroll_top > ($container.height() + container_margin - window.innerHeight)) {
					scroll_top = ($container.height() + container_margin - window.innerHeight);
				}
				$body.stop().animate({ scrollTop: scroll_top }, 400, 'easeOutExpo', function(){ auto_scrolling = false; });
			}
		}
	}
};


// favorite item

methods.toggle_favorite = function() {
	var items = new Items();
	$.each(items.item, function(i, item) {
		if(!(item.favorite())) {
			tell("favorite", item.id);
			item.favorite(true);
			send("add_status", [item, "favorite"]);
		} else {
			if(items.item.length == 1) {
				tell("unfavorite", item.id);
				item.favorite(false);
				send("rm_status", [item, "favorite"]);
			}
		}
	});
};


// retweet item

methods.toggle_retweet = function() {
	var items = new Items();
	$.each(items.item, function(i, item) {
		if(!(item.retweeted)) {
			tell("retweet", item.id);
		} else {
			if(items.item.length == 1) {
				tell("destroy", item.retweeted);
			}
		}
	});
};


// toggle textarea focus

methods.toggle_textarea_focus = function() {
	if(document.activeElement.className == "post_textarea") {
		$post_textarea.blur();
	} else {
		$post_textarea.focus();
	}
};


// enter to post

methods.enter_to_post = function() {
	text = $post_textarea.val();
	var in_reply_to_id = null;
	if(in_reply_to["screen_name"]) {
		if(text.match(RegExp("@" + in_reply_to["screen_name"] + "($|[^0-9A-Za-z_])"))) {
			in_reply_to_id = in_reply_to["id"];
		}
	}
	$post_textarea.val("");
	tell("update", [text, in_reply_to_id]);
	in_reply_to = {
		"id" : null,
		"screen_name" : null
	};
};


// type newline

methods.type_newline = function() {
};


// create reply

var in_reply_to = {
	"id" : null,
	"screen_name" : null
};

methods.create_reply = function() {
	var items = new Items();
	var reply_screen_names = [];
	$.each(items.item, function(i, item) { reply_screen_names[i] = item.src.user.screen_name; });
	$post_textarea.val("@" + reply_screen_names.join(" @") + " " + $post_textarea.val());
	in_reply_to["screen_name"] = items.first().src.user.screen_name;
	in_reply_to["id"] = items.first().src.id_str;
	$post_textarea.focus();
	post_textarea.setSelectionRange(post_textarea.value.length, post_textarea.value.length);
};


// anescape html method

function html_anescape(text) {
	return text.replace_with({
		"&amp;" : "&",
		"&gt;" : ">",
		"&lt;" : "<",
		"&quot;" : "\"",
		"&apos;" : "'"
	});
}


// unofficial retweet

var unofficial_retweet_templete = " RT @%screen_name%: %text%";

methods.unofficial_retweet = function() {
	var items = new Items();
	var reply_screen_name;
	var reply_id;
	var reply_text;
	reply_screen_name = items.first().src.user.screen_name;
	reply_id = items.first().src.id_str;
	reply_text = items.first().src.text;
	var unofficial_retweet_text = unofficial_retweet_templete.replace_with({
		"%screen_name%" : reply_screen_name,
		"%text%" : reply_text
	});
	$post_textarea.val($post_textarea.val() + html_anescape(unofficial_retweet_text));
	in_reply_to["screen_name"] = reply_screen_name;
	in_reply_to["id"] = reply_id;
	$post_textarea.focus();
	post_textarea.setSelectionRange(0, 0);
};


// update post_textarea count

methods.update_post_textarea_count = function() {
	var count = 140 - $post_textarea.val().length;
	if(count < 0) {
		$post_textarea_count.css({"color" : "rgb(255, 54, 46)"});
	} else {
		$post_textarea_count.css({"color" : "rgb(130, 130, 130)"});
	}
	$post_textarea_count.text(count);
};


// check in_reply_to (heavy...)

methods.check_in_reply_to = function() {
	var screen_names_in_textarea = $post_textarea.val().match(/@[0-9A-Za-z_]+/g);
	if(!(screen_names_in_textarea) || screen_names_in_textarea && screen_names_in_textarea.indexOf("@" + in_reply_to["screen_name"]) == -1) {
		in_reply_to = {
			"id" : null,
			"screen_name" : null
		};
	}
};


// create new tweet

methods.create_new_tweet = function() {
	$post_textarea.focus();
	post_textarea.setSelectionRange(0, post_textarea.value.length);
};


// copy tweet

methods.copy_tweet = function() {
	var items = new Items();
	texts = [];
	items.item.forEach(function(item, i) {
		texts.push(item.src.text);
	});
	tell("copy", texts.join(" "));
};


// cursor to end item

methods.cursor_to_end = function() {
	var end_item = itemChunk[act].last();
	send("move_cursor", end_item);
	if(end_item.elm.offset().top < $body.scrollTop() || (end_item.elm.offset().top + end_item.elm.height()) > ($body.scrollTop() + window.innerHeight - container_margin)) {
		var scroll_top = (end_item.elm.offset().top + end_item.elm.height()) - (window.innerHeight / 2);
		if(scroll_top > ($container.height() + container_margin - window.innerHeight)) {
			scroll_top = ($container.height() + container_margin - window.innerHeight);
		}
		$body.stop().animate({ scrollTop: scroll_top }, 400, 'easeOutExpo', function(){ auto_scrolling = false; });
	}
};


// toggle buttons opened

methods.toggle_buttons_opened = function() {
	var item = new Item();
	if(item.buttons_opened()) {
		send("close_buttons", item);
	} else {
		send("open_buttons", item);
	}
};


//=========================
// cursor control methods
//=========================


// move item and open buttons

methods.move_cursor = function(item_obj) {
	var before_items = new Items();
	var set_item = new Item(item_obj);
	if(set_item.initialized) {
		var selected = set_item.selected();
		if(before_items.all_initialized()) {
			send("deselect_cursor", before_items);
			before_items.item.forEach(function(item) {
				if(item.buttons_opened() && item.id != set_item.id) {
					send("close_buttons", item);
				}
			});
		}
		if(selected) {
			// console.log(set_item.elm.find(".buttons_container").css("display"));
			if(set_item.buttons_opened()) {
				send("close_buttons", set_item);
			} else {
				send("open_buttons", set_item);
			}
		}
		send("select_cursor", set_item);
	} else {
		throw new Error("item not found: " + JSON.stringify(set_item));
	}
};


// open buttons

methods.open_buttons = function(item) {
	item.buttons_open();
	item.elm.find(".buttons_container").addClass("buttons_opened").stop().animate({
		"width" : "200"
	}, 150, function() {
		$(this).addClass("buttons_complete_opened");
	});
};


// hide buttons

methods.close_buttons = function(item) {
	item.buttons_close();
	item.elm.find(".buttons_container").removeClass("buttons_complete_opened").stop().animate({
		"width" : "0"
	}, 150, function() {
		$(this).removeClass("buttons_opened");
	});
};


// add cursor

methods.add_cursor = function(item_obj) {
	var set_items = new Items(item_obj);
	if(set_items.all_initialized()) {
		send("select_cursor", set_items);
	} else {
		throw new Error("item not found: " + JSON.stringify(set_items));
	}
};


// calculate absolute value

function abs (x) {
	return (x ^ (x >> 31)) - (x >> 31);
}


// expand cursor

methods.expand_cursor = function(item_obj) {
	var selected_items = new Items();
	var expand_to_items = new Items(item_obj);
	var selected_first_coord = selected_items.first().coord;
	var selected_last_coord = selected_items.last().coord;
	var expand_to_item_coord = expand_to_items.first().coord;
	var expand_items_arr = [];
	if(abs(selected_first_coord - expand_to_item_coord) < abs(selected_last_coord - expand_to_item_coord)) {
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
		var $item_container = item.elm.find(".item_container");
		$item_container.addClass("selected");
		var selected_items = new Items();
		if(mini_view && selected_items.all_initialized() && selected_items.item.length < 2) {
			$item_container.removeClass("mini");
		}
	});
};


// deselect item

methods.deselect_cursor = function(items) {
	if(!(items instanceof Items)) {
		items = new Items(items);
	}
	items.deselect();
	$.each(items.item, function(i, item) {
		var $item_container = item.elm.find(".item_container");
		$item_container.removeClass("selected");
		if(mini_view) {
			$item_container.addClass("mini");
		}
	});
};


//=========================
// replace_with method
//=========================

String.prototype.replace_with = function(obj) {
	var str = this;
	for(var key in obj) {
		str = str.replace(new RegExp(key, "g"), obj[key]);
	}
	return str;
};


//=========================
// set mydata
//=========================

var mydata;

methods.set_my_data = function(data) {
	mydata = data;
	console.log(data);
};


//=========================
// ui control
//=========================

methods.add_status = function(argu) {
	item = argu[0];
	class_name = argu[1];
	$("." + item.id).addClass(class_name);
};

methods.rm_status = function(argu) {
	items = argu[0];
	class_name = argu[1];
	$("." + item.id).removeClass(class_name);
};


//=========================
// show tweets on timeline
//=========================

var default_templete = '<div class="item %id%"><div class="item_container %mini_view%"><div class="left_item"><div class="img_wrap"><div class="profile_image" style="background-image: url(\'%profile_image_url%\')"></div></div><div class="text_wrap"><div class="user_name"><span class="screen_name">%screen_name%</span><span class="name">%name%</span></div><div class="text">%text%</div><div class="statuses"><div class="status favorite_symbol">FAV</div><div class="status retweet_symbol">RT</div></div></div></div><div class="created_at">%created_at%</div></div><div class="buttons_container"><div class="buttons_wrap"><div class="favorite_button action_button">Fav</div><div class="retweet_button action_button">RT</div><div class="reply_button action_button">Reply</div></div></div></div>';
var retweet_templete = '<div class="item %id%"><div class="item_container %mini_view%"><div class="left_item"><div class="img_wrap"><div class="profile_image" style="background-image: url(\'%profile_image_url%\')"><div class="retweet_img_wrap"><div class="retweet_profile_image" style="background-image: url(\'%retweet_profile_image_url%\')"></div></div></div></div><div class="text_wrap"><div class="user_name"><span class="screen_name">%screen_name%</span><span class="name">%name%</span></div><div class="text">%text%</div><div class="statuses"><div class="status favorite_symbol">FAV</div><div class="status retweet_symbol">RT</div></div></div></div><div class="created_at">%created_at%</div></div><div class="buttons_container"><div class="buttons_wrap"><div class="favorite_button action_button">Fav</div><div class="retweet_button action_button">RT</div><div class="reply_button action_button">Reply</div></div></div></div>';
var retweet_img_templete = '<div class="img_wrap"><div class="profile_image" style="background-image: url(\'%profile_image_url%\')"><div class="retweet_img_wrap"><div class="retweet_profile_image" style="background-image: url(\'%retweet_profile_image_url%\')"></div></div></div></div>';
var auto_scrolling = false;
var mini_view = true;

function makeup_display_html (base_data, html_templete) {
	var data;
	// check retweet or not
	if(base_data.retweeted_status) {
		data = base_data.retweeted_status;
	} else {
		data = base_data;
	}
	// replace newline
	var text = data.text.replace(/\n/g, "<br>");
	// replace urls
	if(data.entities.urls.length !== 0) {
		data.entities.urls.forEach(function(urls, i) {
			var url_html = "<a href='" + data.entities.urls[i].expanded_url + "' target='_blank'>" + data.entities.urls[i].display_url + "</a>";
			text = text.replace(data.entities.urls[i].url, url_html);
		});
	}
	// replace media urls
	if(data.entities.media) {
		data.entities.media.forEach(function(media, i) {
			var media_html = "<a href='" + data.entities.media[i].expanded_url + "' target='_blank'>" + data.entities.media[i].display_url + "</a>";
			text = text.replace(data.entities.media[i].url, media_html);
		});
	}
	// replace tweet data
	item_html = html_templete.replace_with({
		"%screen_name%" : data.user.screen_name,
		"%name%" : data.user.name,
		"%text%" : text,
		"%created_at%" : data.created_at.hour + ":" + data.created_at.min + ":" + data.created_at.sec,
		"%profile_image_url%" : data.user.profile_image_url.replace(/_normal/, ""),
		"%id%" : data.id_str
	});
	// check mini view to add mini class
	if(mini_view) {
		item_html = item_html.replace_with({
			"%mini_view%" : "mini"
		});
	} else {
		item_html = item_html.replace_with({
			"%mini_view%" : ""
		});
	}
	// replace retweet source profile image if retweet
	if(base_data.retweeted_status) {
		item_html = item_html.replace_with({
			"%retweet_profile_image_url%" : base_data.user.profile_image_url.replace(/_normal/, "")
		});
	}
	return item_html;
}


var list_item_limit = 230;

methods.show_tweet = function (data) {
	var window_height = window.innerHeight;
	var is_bottom = auto_scrolling || ($body.scrollTop() + window_height >= $container.height() + container_margin);
	var item_html;
	var id;
	//console.log(data);
	// check retweet item
	if(data.retweeted_status) {
		id = data.retweeted_status.id_str;
		item_html = makeup_display_html(data, retweet_templete);
		item = new Item({"id" : id});
		if(item.initialized) {
			item.retweet(data);
			if(Object.keys(item.retweets).length == 1) {
				item_html = retweet_img_templete.replace_with({
					"%profile_image_url%" : data.retweeted_status.user.profile_image_url.replace(/_normal/, ""),
					"%retweet_profile_image_url%" : data.user.profile_image_url.replace(/_normal/, "")
				});
				$("." + id).find(".img_wrap").replaceWith(item_html);
			}
			if(mydata && data.user.id_str == mydata.id_str) {
				send("add_status", [item, "retweet"]);
			}
			return;
		}
	} else {
		id = data.id_str;
		item_html = makeup_display_html(data, default_templete);
	}
	// add to dom
	var tab_num = [];
	$containers[0].append(item_html);
	if(data.tab.length !== 0) {
		data.tab.forEach(function(tab_name, i) {
			tab_num.push(tab.indexOf(tab_name));
			$containers[tab_num[i]].append(item_html);
		});
	}
	// add to item
	var $item = $("." + id);
	itemChunk[0].add(data, $item);
	if(data.tab) {
		data.tab.forEach(function(tab_name, i) {
			itemChunk[tab_num[i]].add(data, $item);
		});
	}
	// check item type
	var $item_container = $item.find(".item_container");
	if(mydata) {
		if(data.entities.user_mentions.length !== 0) {
			for(var v in data.entities.user_mentions) {
				if(data.entities.user_mentions[v].id_str == mydata.id_str) {
					$item_container.addClass("reply");
					break;
				}
			}
		}
		if(data.user.id_str == mydata.id_str) {
			$item_container.addClass("mine");
		}
	}
	// auto scrolling to bottom
	var remove_timeout = 0;
	if(is_bottom) {
		auto_scrolling = true;
		$body.stop(true, false).animate({ scrollTop: $container.height() + container_margin - window_height }, 200, 'easeOutQuad', function(){ auto_scrolling = false; });
		remove_timeout = 210;
	}
	// add item click event
	$item.mousedown(function(event) {
		item_click(event, $(this));
	});
	// prevent event propagation on .buttons_container
	var $buttons_container = $item.find(".buttons_container");
	$buttons_container.mousedown(function(event) {
		event.stopPropagation();
	});
	// prevent event propagation on .text a
	$item_container.find("a").mousedown(function(event) {
		event.stopPropagation();
	});
	// add buttons event
	var $buttons_wrap = $buttons_container.find(".buttons_wrap");
	$buttons_wrap.find(".favorite_button").click(function() {
		send("toggle_favorite");
	});
	$buttons_wrap.find(".retweet_button").click(function() {
		send("toggle_retweet");
	});
	$buttons_wrap.find(".reply_button").click(function() {
		send("create_reply");
	});
	// remove items to limit
	setTimeout(function() {
		if(!(auto_scrolling)) {
			if(itemChunk[act].id_list.length > (list_item_limit - 1)) {
				$.each((new Array(itemChunk[act].id_list.length - (list_item_limit - 1))), function(i) {
					remove_item = new Item({"coord" : i});
					var fix_scroll_height = remove_item.elm.height();
					remove_item.elm.remove();
					if(!(is_bottom)) {
						$body.scrollTop($body.scrollTop() - fix_scroll_height);
					}
					remove_item.remove();
				});
			}
		}
	}, 210);
	document.title = itemChunk[act].id_list.length;
};


//=========================
// show favorite on item
//=========================

methods.show_favorite = function(data) {
	if(mydata && data.source.id_str == mydata.id_str) {
		var item = new Item({"id" : data.target_object.id_str});
		if(item.initialized) {
			if(!(item.favorite())) {
				item.favorite(true);
				send("add_status", [item, "favorite"]);
			}
		}
	}
};


//=========================
// hide favorite on item
//=========================

methods.hide_favorite = function(data) {
	if(mydata && data.source.id_str == mydata.id_str) {
		var item = new Item({"id" : data.target_object.id_str});
		if(item.initialized) {
			if(item.favorite()) {
				item.favorite(false);
				send("rm_status", [item, "favorite"]);
			}
		}
	}
};


//=========================
// Tab
//=========================

 
// tab setup

var act = 0;
var itemChunk = [];
var tab = ["timeline", "mention"];
var tab_label = ["Timeline", "mention"];
var $containers = [];

function tab_setup () {
	var $tab_list_box = $(".tab_list_box");
	var $list_view = $(".list_view");
	tab.forEach(function(value, i) {
		$tab_list_box.append("<div class='ls " + value + "'>" + tab_label[i] + "</div>");
		$tab_list_box.find(".ls").mousedown(function() {
			toggle_tab(tab.indexOf($(this).attr("class").replace(/ls\s*/, "")));
		});
		$list_view.append("<div class='container " + value + "'></div>");
		$containers[i] = $(".container." + tab[i]);
		itemChunk[i] = new Container();
	});
	$container = $(".container." + tab[act]);
	$container.addClass("active");
}


// toggle tab

function toggle_tab (num) {
	$container.removeClass("active");
	$container = $(".container." + tab[num]);
	$container.addClass("active");
	act = num;
}

methods.fill_timeline = function (datals) {
	console.log(datals);
	datals.reverse().forEach(function(data) {
		send("show_tweet", data);
	});
};


//=========================
// Container class
//=========================

function Container() {
    this.initialize.apply(this, arguments);
}

Container.prototype = {
	initialize: function() {
		this.init_obj = {
			"id" : null,
			"coord" : null,
			"favorited" : false,
			"retweeted" : null,
			"retweets" : [],//array
			"src" : null,
			"elm" : null
		};
		this.arrays = ["id_list", "favorited_list", "retweeted_list", "retweets_list", "source_list", "element_list", "yoffset_list"];
		this.arrays.forEach(function(mthd, i) {
			this[mthd] = [];
		}, this);
		this["selected"] = [];
		this["buttons_opened"] = null;
	},
	add: function(data, elm) {
		if(data.retweeted_status) {
			this.id_list.push(data.retweeted_status.id_str);
			this.favorited_list.push(data.retweeted_status.favorited);
			this.retweeted_list.push(data.retweeted_status.retweeted);
			this.retweets_list.push([data]);//array
			this.source_list.push(data.retweeted_status);
		} else {
			this.id_list.push(data.id_str);
			this.favorited_list.push(data.favorited);
			this.retweeted_list.push(data.retweeted);
			this.retweets_list.push([]);//array
			this.source_list.push(data);
		}
		this.element_list.push(elm);
		this.yoffset_list.push(elm.position().top);
	},
	remove: function(coord) {
		this.selected.forEach(function(id, i) {
			if(id == this.id_list[coord]) {
				this.selected.splice(i, 1);
			}
		}, this);
		if(this.buttons_opened == this.id_list[coord]) {
			this.buttons_opened = null;
		}
		this.arrays.forEach(function(mthd, i) {
			this[mthd].splice(coord, 1);
		}, this);
	},
	coord: function(coord) {
		coord = parseInt(coord, 10);
		if(this.id_list[coord]) {
			return {
				"id" : this.id_list[coord],
				"coord" : coord,
				"favorited" : this.favorited_list[coord],
				"retweeted" : this.retweeted_list[coord],
				"retweets" : this.retweets_list[coord],
				"src" : this.source_list[coord],
				"elm" : this.element_list[coord]
			};
		} else {
			return undefined;
		}
	},
	id: function(id) {
		id = String(id);
		var coord = this.id_list.indexOf(id);
		if(coord != -1) {
			return this.coord(coord);
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
		$.each(this.selected, function(i, id) {
			if(id == item.id) {
				exist_index = i;
			}
		});
		if(exist_index == -1) {
			this.selected.push(item.id);
			return this.selected;
		} else {
			return undefined;
		}
	},
	deselect: function(item) {
		var delete_index = -1;
		$.each(this.selected, function(i, id) {
			if(id == item.id) {
				delete_index = i;
			}
		});
		if(delete_index != -1) {
			this.selected.splice(delete_index, 1);
			return this.selected;
		} else {
			return undefined;
		}
	},
	retweet: function(item, data) {
		item_index = item.coord;
		if(this.retweets_list[item_index].length !== 0) {
			this.retweets_list[item_index].forEach(function(data_each, i) {
				if(data_each.retweeted_status.id_str == data.retweeted_status.id_str) {
					return undefined;
				}
			}, this);
		}
		if(!(this.retweets_list[item_index] instanceof Array)) {
			this.retweets_list[item_index] = [];//array
		}
		this.retweets_list[item_index].push(data);
		return this.retweets_list[item_index];
	},
	favorite: function(item, tf) {
		item_index = item.coord;
		this.favorited_list[item_index] = !(!(tf));
		return !(!(tf));
	},
	first: function() {
		return this.coord(0);
	},
	last: function() {
		return this.coord(this.id_list.length - 1);
	}
};


//=========================
// Item class
//=========================

function Item() {
    this.initialize.apply(this, arguments);
}

Item.prototype = {
	initialize: function(item_obj) {
		this.initialized = false;
		this.act = act;
		for(var key in itemChunk[this.act].init_obj){
			this[key] = itemChunk[this.act].init_obj[key];
		}
		// console.log(jQuery.extend(true, {}, this));
		if(!(item_obj)) {
			item_obj = {"id" : itemChunk[this.act].selected[0]};
		}
		if(item_obj) {
			var item = null;
			if(item_obj.coord !== undefined) {
				item = itemChunk[this.act].coord(item_obj.coord);
				if(item) {
					for(key in item) {
						this[key] = item[key];
					}
					this.initialized = true;
					return this;
				} else {
					return undefined;
				}
			} else if(item_obj.id) {
				item = itemChunk[this.act].id(item_obj.id);
				if(item) {
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
			itemChunk[this.act].select(this);
		} else {
			throw new Error("not initialized");
		}
	},
	deselect: function() {
		if(this.check()) {
			itemChunk[this.act].deselect(this);
		} else {
			throw new Error("not initialized");
		}
	},
	selected: function() {
		return itemChunk[this.act].selected.indexOf(this.id) != -1;
	},
	buttons_open: function() {
		itemChunk[this.act].buttons_opened = this.id;
	},
	buttons_close: function() {
		itemChunk[this.act].buttons_opened = null;
	},
	buttons_opened: function() {
		return itemChunk[this.act].buttons_opened == this.id;
	},
	rel_coord: function(relative) {
		if(this.check()) {
			var rel_item = itemChunk[this.act].coord(this.coord + relative);
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
	},
	retweet: function(data) {
		this.retweets = itemChunk[this.act].retweet(this, data);
	},
	favorite: function(tf) {
		if(tf === undefined) {
			return this.favorited;
		} else {
			this.favorited = !(!(tf));
			itemChunk[this.act].favorite(this, this.favorited);
			return this.favorited;
		}
	},
	remove: function() {
		itemChunk[this.act].remove(this.coord);
	}
};


//=========================
// Items class
//=========================

function Items() {
    this.initialize.apply(this, arguments);
}

Items.prototype = {
	initialize: function(item_arr) {
		this.item = [];
		this.initialized = [];
		this.act = act;

		if(!(item_arr)) {
			item_arr = [];
			itemChunk[this.act].selected.forEach(function(v, i) {
				item_arr.push({"id" : v});
			});
		}
		if(!(item_arr instanceof Array)) {
			item_arr = [item_arr];
		}
		if(item_arr[0]) {
			item_arr.forEach(function(item_obj, i) {
				this.initialized[i] = true;
				if(item_obj.coord !== undefined || item_obj.id) {
					var item = new Item(item_obj);
					if(item.initialized) {
						this.item[i] = item;
						this.initialized[i] = true;
					} else {
						this.item[i] = null;
						this.initialized[i] = false;
					}
				} else {
					this.item[i] = null;
					this.initialized[i] = false;
				}
			}, this);
			var coords = [];
			var messy_items = {};
			this.item.forEach(function(item, i) {
				if(item) {
					coords[i] = item.coord;
					messy_items[item.coord] = item;
				}
			}, this);
			coords.sort(function(a, b) { return a - b; });
			for(var i = 0; i <= Object.keys(this.item).length - coords.length - 1; i++) {
				coords.push(null);
			}
			coords.forEach(function(coord, i) {
				if(coord !== null) {
					this.item[i] = messy_items[coord];
					this.initialized[i] = true;
				} else {
					this.item[i] = null;
					this.initialized[i] = false;
				}
			}, this);
			return this;
		} else {
			this.initialized[0] = false;
			return undefined;
		}
	},
	all_initialized: function() {
		return this.initialized.every(function(v) {
			return v === true;
		});
	},
	select: function() {
		if(this.all_initialized()) {
			$.each(this.item, function(i, item) {
				item.select();
			});
		} else {
			throw new Error("not initialized");
		}
	},
	deselect: function() {
		if(this.all_initialized()) {
			$.each(this.item, function(i, item) {
				item.deselect();
			});
		} else {
			throw new Error("not initialized");
		}
	},
	next: function() {
		return this.last().next();
	},
	prev: function() {
		return this.first().prev();
	},
	first: function() {
		if(this.all_initialized()) {
			return this.item[0];
		} else {
			throw new Error("not initialized");
		}
	},
	last: function() {
		if(this.all_initialized()) {
			return this.item[this.item.length - 1];
		} else {
			throw new Error("not initialized");
		}
	},
	retweet: function(data) {
		if(this.all_initialized()) {
			$.each(this.item, function(i, item) {
				item.retweet(data);
			});
			return this;
		} else {
			throw new Error("not initialized");
		}
	},
	remove: function() {
		$.each(this.item, function(i, item) {
			item.remove();
		});
	}
};
