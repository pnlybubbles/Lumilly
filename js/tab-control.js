/*
Tab GUI control
*/

//=========================
// Tab
//=========================


// tab setup

var act = 0;
var itemChunk = [];
var tab = ["timeline", "mention"];
var tab_label = ["Timeline", "Mention"];
var $containers = [];
var tab_scroll_top = [];
var tab_is_bottom = [];
var container_margin;


// setup tab ** beta **

function tab_setup () {
	tab = ["timeline", "mention"];
	tab_label = ["Timeline", "Mention"];
	tab = tab.concat(config.tab.map(function(v) { return v.bundle; }));
	tab_label = tab_label.concat(config.tab.map(function(v) { return v.label; }));
	// console.log(tab);
	var $tab_list_box = $(".tab_list_box");
	var $list_view = $(".list_view");
	tab.forEach(function(value, i) {
		$tab_list_box.append("<div class='tab_ls' tab='" + value + "'><div class='tab_label'>" + tab_label[i] + "</div></div>");
		$list_view.append("<div class='container' tab='" + value + "'></div>");
		$containers[i] = $(".container[tab='" + tab[i] + "']");
		itemChunk[i] = new Container();
		tab_scroll_top[i] = 10000;
		tab_is_bottom[i] = true;
	});
	$tab_list_box.find(".tab_ls").mousedown(function() {
		// console.log($(this).attr("tab"));
		toggle_tab(tab.indexOf($(this).attr("tab")));
	});
	$tab_list_box.find(".tab_ls[tab='" + tab[act] + "']").addClass("active_tab");
	$container = $(".container[tab='" + tab[act] + "']");
	$container.addClass("active");
	container_margin = $(".bottom_wrap").height();
	$(".container").css({
		"margin-bottom" : container_margin + "px"
	});
}


// toggle tab

function toggle_tab (num) {
	// console.log(num);
	var window_height = window.innerHeight;
	tab_scroll_top[act] = $body.scrollTop();
	tab_is_bottom[act] = auto_scrolling || ($body.scrollTop() + window_height >= $container.height() + container_margin);
	var $tab_list_box = $(".tab_list_box");
	$tab_list_box.find(".tab_ls[tab='" + tab[act] + "']").removeClass("active_tab");
	$tab_list_box.find(".tab_ls[tab='" + tab[num] + "']").addClass("active_tab");
	// console.log($container);
	$container.removeClass("active");
	$container = $(".container[tab='" + tab[num] + "']");
	$container.addClass("active");
	if(tab_is_bottom[num]) {
		$body.scrollTop($container.height() + container_margin - window_height);
	} else {
		$body.scrollTop(tab_scroll_top[num]);
	}
	act = num;
}
