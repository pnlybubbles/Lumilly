/*
Methods callback on event
*/

//=========================
// key control
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
			move_cursor(prev_item);
			if(prev_item.elm.offset().top < $body.scrollTop() || (prev_item.elm.offset().top + prev_item.elm.height()) > ($body.scrollTop() + window.innerHeight)) {
				var scroll_top = prev_item.elm.offset().top - (window.innerHeight / 2);
				if(scroll_top < 0) {
					scroll_top = 0;
				}
				$body.stop().animate({ scrollTop: scroll_top }, 400, 'easeOutExpo', function(){ auto_scrolling = false; });
			}
		}
	}
	expand_base_item = prev_item;
};


// go next item

methods.go_next = function() {
	var items = new Items();
	var next_item;
	if(!(items.all_initialized())) {
		items = new Items(itemChunk[act].last());
		next_item = items.first();
	} else {
		next_item = items.last().next();
	}
	if(items.all_initialized()) {
		if(next_item) {
			move_cursor(next_item);
			if(next_item.elm.offset().top < $body.scrollTop() || (next_item.elm.offset().top + next_item.elm.height()) > ($body.scrollTop() + window.innerHeight - container_margin)) {
				var scroll_top = (next_item.elm.offset().top + next_item.elm.height()) - (window.innerHeight / 2);
				if(scroll_top > ($container.height() + container_margin - window.innerHeight)) {
					scroll_top = ($container.height() + container_margin - window.innerHeight);
				}
				$body.stop().animate({ scrollTop: scroll_top }, 400, 'easeOutExpo', function(){ auto_scrolling = false; });
			}
		}
	}
	expand_base_item = next_item;
};


// expand cursor to prev

var expand_base_item;

methods.expand_prev = function() {
	var items = new Items();
	var prev_item;
	if(!(items.all_initialized()) || !(expand_base_item)) {
		return;
	} else {
		if(items.item.length === 1 || expand_base_item.id == items.last().id) {
			prev_item = items.first().prev();
			if(prev_item) {
				add_cursor(prev_item);
			}
		} else if(expand_base_item.id == items.first().id) {
			prev_item = items.last();
			if(prev_item) {
				remove_cursor(prev_item);
			}
		}
		if(prev_item) {
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


// expand to next

methods.expand_next = function() {
	var items = new Items();
	var next_item;
	if(!(items.all_initialized()) || !(expand_base_item)) {
		return;
	} else {
		if(items.item.length === 1 || expand_base_item.id == items.first().id) {
			next_item = items.last().next();
			if(next_item) {
				add_cursor(next_item);
			}
		} else if(expand_base_item.id == items.last().id) {
			next_item = items.first();
			if(next_item) {
				remove_cursor(next_item);
			}
		}
		if(next_item) {
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


// go prev reply

methods.go_prev_reply = function() {
	var items = new Items();
	var item;
	if(!(items.all_initialized())) {
		items = new Items(itemChunk[act].last());
		item = items.first();
	} else {
		item = items.first();
	}
	var coord = null;
	var type_list = $.extend(true, [], itemChunk[act].type_list);
	$.each(type_list.reverse(), function(i, type) {
		if(i <= type_list.length - item.coord - 1) {
			return true;
		}
		if(type.indexOf("mention") != -1) {
			// console.log(type);
			coord = type_list.length - i - 1;
			return false;
		}
	});
	// console.log(coord);
	if(coord !== null) {
		var prev_item = new Item({"coord" : coord});
		// console.log(prev_item);
		if(prev_item) {
			move_cursor(prev_item);
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


// go next reply

methods.go_next_reply = function() {
	var items = new Items();
	var item;
	if(!(items.all_initialized())) {
		send("go_prev_reply");
		return;
	} else {
		item = items.last();
	}
	var coord = null;
	var type_list = $.extend(true, [], itemChunk[act].type_list);
	$.each(type_list, function(i, type) {
		if(i <= item.coord) {
			return true;
		}
		if(type.indexOf("mention") != -1) {
			// console.log(type);
			coord = i;
			return false;
		}
	});
	// console.log(coord);
	if(coord !== null) {
		var next_item = new Item({"coord" : coord});
		if(next_item) {
			move_cursor(next_item);
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
			tell("favorite", item.id_src);
			favorite_item(item);
		} else {
			if(items.item.length == 1) {
				tell("unfavorite", item.id);
				unfavorite_item(item);
			}
		}
	});
};


// retweet item

methods.toggle_retweet = function() {
	var items = new Items();
	$.each(items.item, function(i, item) {
		if(!(item.retweeted)) {
			tell("retweet", item.id_src);
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

var media = {
	"file_name" : null,
	"baseurl" : null
};

// tell("image_set", [e.target.result, theFile.name]);

methods.enter_to_post = function() {
	text = $post_textarea.val();
	if(text.length <= 140 && text.length !== 0) {
		var in_reply_to_id = null;
		if(in_reply_to["screen_name"]) {
			if(text.match(RegExp("@" + in_reply_to["screen_name"] + "($|[^0-9A-Za-z_])"))) {
				in_reply_to_id = in_reply_to["id"];
			}
		}
		$post_textarea.val("");
		if(media.file_name) {
			tell("update_with_media", [text, media.file_name, media.baseurl, in_reply_to_id]);
			media = {
				"file_name" : null,
				"baseurl" : null
			};
			$attach_area.empty();
		} else {
			tell("update", [text, in_reply_to_id]);
		}
		in_reply_to = {
			"id" : null,
			"screen_name" : null
		};
	}
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
	if(items.all_initialized()) {
		var reply_screen_names = [];
		$.each(items.item, function(i, item) { reply_screen_names[i] = item.src.user.screen_name; });
		$post_textarea.val("@" + reply_screen_names.join(" @") + " " + $post_textarea.val());
		in_reply_to["screen_name"] = items.first().src.user.screen_name;
		in_reply_to["id"] = items.first().src.id_str;
		$post_textarea.focus();
		post_textarea.setSelectionRange(post_textarea.value.length, post_textarea.value.length);
	}
};


// unofficial retweet

var unofficial_retweet_templete = " RT @%screen_name%: %text%";

methods.unofficial_retweet = function() {
	var items = new Items();
	if(items.all_initialized()) {
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
	}
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
	var end_item = new Item(itemChunk[act].last());
	move_cursor(end_item);
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
		close_buttons(item);
	} else {
		open_buttons(item);
	}
};


//=========================
// event from server
//=========================

// show tweet

methods.show_tweet = function (data) {
	show_item(data);
};


// load timeline

methods.fill_timeline = function (datals) {
	console.log(datals);
	datals.reverse().forEach(function(data) {
		show_item(data);
	});
};


// set mydata

var mydata;

methods.set_my_data = function(data) {
	mydata = data;
	console.log(data);
};


// show favorite

methods.show_favorite = function(data) {
	if(mydata && data.source.id_str == mydata.id_str) {
		var item = new Item({"id" : data.target_object.id_str});
		favorite_item(item);
	}
};


// hide favorite

methods.hide_favorite = function(data) {
	if(mydata && data.source.id_str == mydata.id_str) {
		var item = new Item({"id" : data.target_object.id_str});
		unfavorite_item(item);
	}
};


// hide item

methods.hide_tweet = function(data) {
	var is_bottom = auto_scrolling || ($body.scrollTop() + window.innerHeight >= $container.height() + container_margin);
	$.each(tab, function(i) {
		remove_item = new Item({"id" : data.delete.status.id_str}, i);
		console.log(remove_item);
		if(remove_item.initialized) {
			var fix_scroll_height = remove_item.elm.height();
			var is_above = remove_item.elm.offset().top + fix_scroll_height < $body.scrollTop();
			remove_item.elm.remove();
			if(!(is_bottom) && is_above) {
				$body.scrollTop($body.scrollTop() - fix_scroll_height);
			}
			remove_item.remove();
		}
	});
};


// set config

var config;

methods.set_config = function(conf) {
	console.log(conf);
	config = conf;
	list_item_limit = parseInt(config.general.timeline_item_limit, 10);
	mini_view = config.general.mini_view;
	tab_setup();
	config.tab.forEach(function(tab_config) {
		tell("tab_timeline", [tab_config.bundle, 0, 50], "fill_timeline");
	});
};


// open link

methods.open_link = function() {
	items = new Items();
	items.item.forEach(function(item) {
		item.src.entities.urls.forEach(function(url_data) {
			window.open(url_data.expanded_url);
		});
		item.src.entities.media.forEach(function(media_data) {
			window.open(media_data.expanded_url);
		});
	});
};
