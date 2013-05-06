/*
Luminous (prototype)
Copyright (c) 2013, pnlybubbles
All rights reserved.
Licence under 3-clause BSD license
https://github.com/pnlybubbles/Luminous
*/

requirejs.config({
    paths: {
        'jquery.easing.min' : 'js/libs/jquery.easing.min',
        'jquery.mousewheel' : 'js/libs/jquery.mousewheel',
        'TweenLite.min' : 'js/libs/TweenLite.min',
        'jquery.gsap.min' : 'js/libs/jquery.gsap.min',
        'CSSPlugin.min' : 'js/libs/CSSPlugin.min',
        'classes' : 'js/classes',
        'others' : 'js/others',
        'exchanger' : 'js/exchanger',
        'item-control' : 'js/item-control',
        'tab-control' : 'js/tab-control',
        'event-control' : 'js/event-control',
        'event-callback' : 'js/event-callback'
    },
    shim: {
        // 'jquery.fooPlugin' : ['jquery'],
    },
    urlArgs: "bust=" +  (new Date()).getTime()
});

require(['jquery.easing.min', 'jquery.mousewheel', 'TweenLite.min', 'jquery.gsap.min', 'CSSPlugin.min', 'classes', 'others', 'exchanger', 'item-control', 'tab-control', 'event-control', 'event-callback'], function(){
	load();
});


//=========================
// on load
//=========================

var $container;
var $body;
var container_margin;
var $post_textarea;
var post_textarea;
var methods = {};

function load () {
	$body = $("body");
	tab_setup();
	container_margin = parseInt($container.css("margin-bottom"), 10);
	$post_textarea = $(".post_textarea");
	post_textarea = document.getElementsByClassName('post_textarea')[0];
	$post_textarea_count = $(".post_textarea_count");
	set_events();
	load_websocket();
}


//=========================
// show tweets on timeline
//=========================

var default_templete = '<div class="item" _id_="%id%" id_src="%id_src%"><div class="item_container %mini_view%"><div class="left_item"><div class="img_wrap"><div class="profile_image" style="background-image: url(\'%profile_image_url%\')"></div></div><div class="text_wrap"><div class="user_name"><span class="screen_name">%screen_name%</span><span class="name">%name%</span></div><div class="text">%text%</div><div class="statuses"><div class="status favorite_symbol">FAV</div><div class="status retweet_symbol">RT</div></div></div></div><div class="created_at">%created_at%</div></div><div class="buttons_container"><div class="buttons_wrap"><div class="favorite_button action_button">Fav</div><div class="retweet_button action_button">RT</div><div class="reply_button action_button">Reply</div></div></div></div>';
var retweet_templete = '<div class="item" _id_="%id%" id_src="%id_src%"><div class="item_container %mini_view%"><div class="left_item"><div class="img_wrap"><div class="profile_image" style="background-image: url(\'%profile_image_url%\')"><div class="retweet_img_wrap"><div class="retweet_profile_image" style="background-image: url(\'%retweet_profile_image_url%\')"></div></div></div></div><div class="text_wrap"><div class="user_name"><span class="screen_name">%screen_name%</span><span class="name">%name%</span></div><div class="text">%text%</div><div class="statuses"><div class="status favorite_symbol">FAV</div><div class="status retweet_symbol">RT</div></div></div></div><div class="created_at">%created_at%</div></div><div class="buttons_container"><div class="buttons_wrap"><div class="favorite_button action_button">Fav</div><div class="retweet_button action_button">RT</div><div class="reply_button action_button">Reply</div></div></div></div>';
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
		"%id%" : base_data.id_str,
		"%id_src%" : data.id_str
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


var list_item_limit = 500;

function show_item(data) {
	var window_height = window.innerHeight;
	var is_bottom = auto_scrolling || ($body.scrollTop() + window_height >= $container.height() + container_margin);
	var item_html;
	var tab_num = [];
	var insert_coord = [];
	var id = data.id_str;
	var id_src;
	// check retweet item
	if(data.retweeted_status) {
		item_html = makeup_display_html(data, retweet_templete);
		id_src = data.retweeted_status.id_str;
	} else {
		item_html = makeup_display_html(data, default_templete);
		id_src = id;
	}
	if(data.tab.length !== 0) {
		data.tab.forEach(function(tab_name, i) {
			// add to dom
			// console.log(tab_name);
			tab_num.push(tab.indexOf(tab_name));
			var $containers_children = $containers[tab_num[i]].children();
			insert_coord[i] = $containers_children.length;
			// console.log(insert_coord[i]);
			// console.log(data.created_at.datetime);
			if(insert_coord[i] === 0) {
				$containers[tab_num[i]].prepend(item_html);
			}
			$($containers_children.get().reverse()).each(function(j) {
				if (!(new Item({ "id" : id }, i).initialized)) {
					var before_item_id = $(this).attr("_id_");
					// console.log($(this));
					var before_item = new Item({"id" : before_item_id}, i);
					// console.log(".");
					// console.log($(this));
					// console.log(before_item_id);
					// console.log(before_item.src.text);
					// console.log(parseInt(before_item.src.real_created_at.datetime_num, 10) + ":" + parseInt(data.real_created_at.datetime_num, 10));
					if(compareId(data.id_str, before_item.src.id_str)) {
						// console.log(idParseInt(data.id_str, 10) + ":" + data.id_str);
						insert_coord[i] = insert_coord[i] - j;
						$($containers_children[insert_coord[i] - 1]).after(item_html);
						return false;
					}
					if(j == insert_coord[i] - 1) {
						$containers[tab_num[i]].prepend(item_html);
						insert_coord[i] = 0;
						return false;
					}
				} else {
					insert_coord[i] = null;
				}
			});
			// console.log(insert_coord[i]);
		});
	}
	// console.log(insert_coord);
	// construct item
	if(insert_coord.length > 0) {
		$.each(insert_coord, function(i, coord) {
			// add to item
			var $item;
			if (coord !== null) {
				$item = $(".container." + tab[i]).find(".item[_id_='" + id + "']");
				itemChunk[tab_num[i]].add(data, $item, coord);
			} else {
				return true;
			}
			// check item type
			var $item_container = $item.find(".item_container");
			if(mydata) {
				if(!(data.retweeted_status) && data.entities.user_mentions.length !== 0) {
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
			// check favorite
			if(data.favorited) {
				add_status(id_src, "favorite");
			}
			// auto scrolling to bottom
			var remove_timeout = 0;
			if(act == i) {
				if(is_bottom) {
					auto_scrolling = true;
					$body.stop(true, false).animate({ scrollTop: $container.height() + container_margin - window_height }, 200, 'easeOutQuad', function(){ auto_scrolling = false; });
					remove_timeout = 210;
				}
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
		});
	}
	document.title = itemChunk[act].id_list.length;
}
