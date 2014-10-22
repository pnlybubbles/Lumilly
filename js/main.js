requirejs.config({
  paths: {
    'jquery.easing.min' : 'js/libs/jquery.easing.min',
    'jquery.mousewheel' : 'js/libs/jquery.mousewheel',
    'TweenLite.min' : 'js/libs/TweenLite.min',
    'jquery.gsap.min' : 'js/libs/jquery.gsap.min',
    'CSSPlugin.min' : 'js/libs/CSSPlugin.min',
    'jquery.lib' : 'js/libs/jquery.lib',
    'others' : 'js/others',
    'key-events' : 'js/key-events',
    'tableview' : 'js/tableview',
    'ui-accessor' : 'js/ui-accessor',
    'html_templete' : 'js/html_templete'
  },
  urlArgs: "bust=" +  (new Date()).getTime()
});

require(['jquery.easing.min', 'jquery.mousewheel', 'TweenLite.min', 'jquery.gsap.min', 'CSSPlugin.min', 'jquery.lib', 'others', 'key-events', 'tableview', 'ui-accessor', 'html_templete'], function(){
  setup();
});

function setup () {
  var main = new Methods();
  text_field_binding = new KeyEvents($(".text_field"));
  $(".text_field").on("focus", function() {
    text_field_binding.focus();
    console.log("focused: text_field");
  });
  text_field_binding.bind("13", ["c"], function() {
    main.accessor.call_method("update_tweet", $(".text_field").val());
    $(".text_field").val("");
  });
}

function Methods () {
  this.initialize.apply(this, arguments);
}

Methods.prototype = {
  initialize: function() {
    this.accessor = new Accessor(this);
    this.column_view = new ColumnView();
  },
  test: function(t) {
    console.log(t);
  },
  create_timeline_column: function(column) {
    this.column_view.new_timeline_column(this.column_view.columns.length, column.id);
    return "created column: " + column.id;
  },
  add_tweet: function(column_id, values) {
    // console.log(column_id, values);
    this.column_view.columns[this.column_view.index(column_id)].add_tweet(values);
  }
};

function ColumnView () {
  this.initialize.apply(this, arguments);
}

ColumnView.prototype = {
  initialize: function() {
    this.columns = [];
    this.column_ids = [];
  },
  index: function(id) {
    var index = this.column_ids.indexOf(id);
    return index == -1 ? null : index;
  },
  new_column: function(index, id) {
    if(this.columns.length === 0 || this.columns.length == index) {
      $(".column_container").append("<div class='column col_" + id + "'></div>");
    } else if(this.columns.length > index && index >= 0) {
      $(".column:eq(" + index + ")").before("<div class='column col_" + id + "'></div>");
    } else {
      throw new Error("Bad index of new column");
    }
  },
  new_timeline_column: function(index, id) {
    this.new_column(index, id);
    this.columns[index] = new TimelineColumn(id);
    this.column_ids[index] = id;
  }
};

function TimelineColumn () {
  this.initialize.apply(this, arguments);
}

TimelineColumn.prototype = {
  initialize: function(id) {
    this.column = $(".col_" + id);
    this.column.append("<div class='table_view'></div>");
    this.tableview = new TableView(this.column.find(".table_view"), id);
    this.tableviews_id = id;
    this.tweets = [];
    this.tweet_ids = [];
    this.column.append("<div class='tweet_detail_overlay'></div>");
    this.tweet_detail_overlay = this.column.find(".tweet_detail_overlay");
    this.tweet_detail_overlay.css({
      // "height" : "100px",
      "width" : "100%",
      "position" : "absolute",
      "top" : "0",
      "left" : "0",
      "right" : "0",
      "box-sizing" : "border-box",
      "z-index" : "0",
      "padding-right" : "17px"
      // "display" : "none"
    });
    this.column.css({
      "position" : "relative"
    });
    // tweet detail overlay changing
    this.detail_overlay_visible = false;
    this.tableview.cursor.on_change(function() {
      // console.log("on_change");
      // console.log(this.tableview.selected);
      // console.log(this.tableview.selected.length);
      if(this.detail_overlay_visible) {
        if(this.tableview.selected.length == 1) {
          var html = makeup_display_html(this.tweets[this.tweet_ids.indexOf(this.tableview.selected[0])], default_templete, false);
          if(this.tweet_detail_overlay.html() !== "") {
            this.change_detail_overlay(html);
          } else {
            this.show_detail_overlay(html);
          }
        } else if(this.tweet_detail_overlay.html() !== "") {
          this.hide_detail_overlay();
        }
      }
    }, this);
    // tweet detail overlay visible toggling keybind
    this.tableview.keybind.bind("32", [], function() {
      this.detail_overlay_visible = !this.detail_overlay_visible;
      // console.log(this.detail_overlay_visible);
      if(this.detail_overlay_visible) {
        // console.log(this.tableview.selected.length);
        if(this.tableview.selected.length == 1) {
          var html = makeup_display_html(this.tweets[this.tweet_ids.indexOf(this.tableview.selected[0])], default_templete, false);
          // console.log(this.tweet_detail_overlay);
          // console.log(this.tweet_detail_overlay.html());
          if(this.tweet_detail_overlay.html() === "") {
            this.show_detail_overlay(html);
          }
        }
      } else {
        if(this.tweet_detail_overlay.html() !== "") {
          this.hide_detail_overlay();
        }
      }
    }, this);
  },
  show_detail_overlay: function(html) {
    // console.log("show");
    if(this.tweet_detail_overlay.html() === "") {
      this.tweet_detail_overlay.append(html);
      var self = this;
      // console.log(self.tweet_detail_overlay.height() * (-1));
      this.tweet_detail_overlay.css({
        top : self.tweet_detail_overlay.height() * (-1)
      });
      this.tweet_detail_overlay.stop(true, false).animate({
        top : "0px"
      }, 160, 'easeOutExpo');
    }
  },
  hide_detail_overlay: function() {
    // console.log("hide");
    if(this.tweet_detail_overlay.html() !== "") {
      var self = this;
      // console.log(self.tweet_detail_overlay.height() * (-1));
      this.tweet_detail_overlay.stop(true, false).animate({
        top : self.tweet_detail_overlay.height() * (-1)
      }, 160, 'easeOutExpo', function() {
        self.tweet_detail_overlay.empty();
        self.tweet_detail_overlay.css({
          top : "0px"
        });
      });
    }
  },
  change_detail_overlay: function(html) {
    if(this.tweet_detail_overlay.html() !== "") {
      this.tweet_detail_overlay.empty();
      this.tweet_detail_overlay.append(html);
    }
  },
  add_tweet: function(values) {
    var html = makeup_display_html(values, default_templete);
    var self = this;
    // tweets will be automatically sorted by id
    var index = null;
    if(this.tweet_ids.length === 0) {
      // console.log(0);
      index = 0;
      self.tableview.insert_last(html, "col_" + self.tableviews_id + "_utid_" + values.id, ["utid_" + values.id, "tid_" + values.id]);
    } else {
      var reversed_tweet_ids = $.extend(true, [], this.tweet_ids);
      reversed_tweet_ids.reverse();
      $.each(reversed_tweet_ids, function(i, id) {
        // var id_ = values.retweeted_status ? values.retweeted_status.id : values.id;
        // console.log(values.id, id, compareId(values.id, id));
        // console.log(id_, id, compareId(id_, id));
        // if(compareId(id_, id)) {
        if(compareId(values.id, id)) {
          if(i === 0) {
            // console.log(self.tweet_ids.length);
            index = self.tweet_ids.length;
            self.tableview.insert_last(html, "col_" + self.tableviews_id + "_utid_" + values.id, ["utid_" + values.id, "tid_" + values.id]);
          } else {
            // console.log(self.tweet_ids.length - i);
            index = self.tweet_ids.length - i;
            self.tableview.insert(html, "col_" + self.tableviews_id + "_utid_" + values.id, index, ["utid_" + values.id, "tid_" + values.id]);
          }
          return false;
        } else if(i == self.tweet_ids.length - 1) {
          // console.log(0);
          index = 0;
          self.tableview.insert(html, "col_" + self.tableviews_id + "_utid_" + values.id, index, ["utid_" + values.id, "tid_" + values.id]);
        }
      });
    }
    this.tweets.splice(index, 0, values);
    this.tweet_ids.splice(index, 0, "col_" + this.tableviews_id + "_utid_" + values.id);
  }
};

function makeup_display_html (base_data, html_templete, mini_view) {
  if(mini_view === undefined) {
    mini_view = true;
  }
  var data;
  // check retweet or not
  if(base_data.retweeted) {
    data = base_data.retweeted_values;
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
    "%screen_name%" : data.screen_name,
    "%name%" : data.name,
    "%text%" : text,
    // "%text%" : base_data.id_str,
    "%created_at%" : data.mon + "/" + data.mday + " " + data.hour + ":" + data.min + ":" + data.sec,
    // "%created_at%" : data.hour + ":" + data.min + ":" + data.sec,
    "%profile_image_url%" : data.profile_image_url.replace(/_normal/, ""),
    "%via%" : data.source.replace("href", "target=\"_blank\" href")
  });
  // check mini view to add mini class
  var aditional_class = [];
  if(mini_view) {
    aditional_class.push("mini");
  }
  // replace retweet source profile image if retweet
  var retweeted_status_style = "";
  var retweeted_by = "";
  if(base_data.retweeted) {
    retweeted_status_style = "background-image: url('" + base_data.profile_image_url.replace(/_normal/, "") + "')";
    retweeted_by = "RT: " + base_data.screen_name;
    aditional_class.push("retweeted_status");
  }
  item_html = item_html.replace_with({
    "%retweeted_status_style%" : retweeted_status_style,
    "%retweeted_by%" : retweeted_by,
    "%aditional_class%" : aditional_class.join(" ")
  });
  return item_html;
}
