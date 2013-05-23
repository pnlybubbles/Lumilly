/*
Event setup method
*/

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
		var method;
		// get method which assign to keys
		method = config.key[key];
		if(method === undefined) {
			method = {"null" : []};
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
			// console.log(method_with_state);
			// console.log(with_state);
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
	// load file on drop image
	$.event.props.push('dataTransfer');
	$("html").bind("drop", function(event) {
		event.stopPropagation();
		event.preventDefault();
		var files = event.dataTransfer.files;
		// Loop through the FileList and render image files as thumbnails.
		$.each(files, function(i, f) {
			// Only process image files.
			if (!f.type.match('image.*')) {
				return true;
			}
			var reader = new FileReader();
			// Closure to capture the file information.
			reader.onload = (function(theFile) {
				return function(e) {
					// Render thumbnail.
					$attach_area.html(['<div class="thumb_wrap"><img class="thumb" src="', e.target.result,
                            '" title="', escape(theFile.name), '"/><div class="clear_button"><span>Clear</span></div></div>'].join(''));
					$attach_area.find(".thumb_wrap").fadeIn(200);
					$attach_area.find(".clear_button").click(function() {
						$(this).parent().fadeOut(250, function() {
							$attach_area.empty();
						});
					});
					media = {
						"file_name" : theFile.name,
						"baseurl" : e.target.result
					};
					console.log(media);
				};
			})(f);
			// Read in the image file as a data URL.
			reader.readAsDataURL(f);
		});
	}).bind("dragenter dragover", false);
}

// item onclick event

function item_click (event, elm) {
	var item = new Item({"id" : elm.attr("_id_")});
	if(event.shiftKey) {
		expand_cursor(item);
	} else if(event.metaKey) {
		add_cursor(item);
	} else {
		clicked_cursor(item);
	}
}
