/*
Item GUI control
*/

//=========================
// cursor control methods
//=========================


// move item and open buttons

function clicked_cursor (item) {
	if(item.initialized) {
		if(item.selected()) {
			if(set_item.buttons_opened()) {
				close_buttons(item);
			} else {
				open_buttons(item);
			}
		}
		move_cursor(item);
	}
}


// move cursor

function move_cursor(item) {
	var before_items = new Items();
	if(item.initialized) {
		if(before_items.all_initialized()) {
			deselect_cursor(before_items);
			before_items.item.forEach(function(item) {
				if(item.buttons_opened() && item.id != item.id) {
					close_buttons(item);
				}
			});
		}
		select_cursor(item);
	} else {
		console.log(item);
		throw new Error("item not found: " + JSON.stringify(item));
	}
}


// open buttons

function open_buttons(item) {
	item.buttons_open();
	item.elm.find(".buttons_container").addClass("buttons_opened").stop().animate({
		"width" : "200"
	}, 150, function() {
		$(this).addClass("buttons_complete_opened");
	});
}


// hide buttons

function close_buttons(item) {
	item.buttons_close();
	item.elm.find(".buttons_container").removeClass("buttons_complete_opened").stop().animate({
		"width" : "0"
	}, 150, function() {
		$(this).removeClass("buttons_opened");
	});
}


// add cursor

function add_cursor(items) {
	if(items instanceof Item) { items = new Items(items); }
	if(items.all_initialized()) {
		select_cursor(items);
	} else {
		throw new Error("item not found: " + JSON.stringify(items));
	}
}


// expand cursor

function expand_cursor(items) {
	var selected_items = new Items();
	var expand_to_items;
	if(items instanceof Item) { expand_to_items = new Items(items); }
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
	select_cursor(expand_items);
}


// select item

function select_cursor(items) {
	if(items instanceof Item) { items = new Items(items); }
	items.select();
	$.each(items.item, function(i, item) {
		var $item_container = item.elm.find(".item_container");
		$item_container.addClass("selected");
		var selected_items = new Items();
		if(mini_view && selected_items.all_initialized() && selected_items.item.length < 2) {
			$item_container.removeClass("mini");
		}
	});
}


// deselect item

function deselect_cursor(items) {
	if(items instanceof Item) { items = new Items(items); }
	items.deselect();
	$.each(items.item, function(i, item) {
		var $item_container = item.elm.find(".item_container");
		$item_container.removeClass("selected");
		if(mini_view) {
			$item_container.addClass("mini");
		}
	});
}


//=========================
// status control
//=========================

// add status class_name to item id

function add_status(id, class_name) {
	$("." + id).addClass(class_name);
}

// remove status class_name to item id

function rm_status(di, class_name) {
	$("." + id).removeClass(class_name);
}


//=========================
// show favorite on item
//=========================

function favorite_item (item) {
	if(item.initialized) {
		if(!(item.favorite())) {
			item.favorite(true);
			add_status(item.id, "favorite");
		}
	}
}


//=========================
// hide favorite on item
//=========================

function unfavorite_item (item) {
	if(item.initialized) {
		if(item.favorite()) {
			item.favorite(false);
			rm_status(item.id, "favorite");
		}
	}
}
