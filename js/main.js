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

// js libs ready
function setup () {
  var main = new Methods();
}

// gui initialize done
function event_setup (main) {
  var before_focused_column = null;
  KeyEvents.on_focus(function(blur_id) {
    if(blur_id && blur_id.match(/table_/) !== null) {
      before_focused_column = blur_id;
    }
  });
  main.column_view.columns.first().tableview.keybind.focus();
  var text_field_keybind = new KeyEvents("compose_field");
  $(".text_field").on("focus", function() {
    text_field_keybind.focus();
  });
  $(".text_field").on("keyup", function() {
    var count = 140 - check_update_count($(".text_field").val(), false);
    if(count < 0) {
      $(".text_field_counter").css({"color" : "rgb(255, 54, 46)"});
    } else {
      $(".text_field_counter").css({"color" : "rgb(130, 130, 130)"});
    }
    $(".text_field_counter").text(count);
  });
  text_field_keybind.on_focus(function() {
    // console.log("on_focus");
    $(".text_field").focus();
    $(".text_field_counter").show();
  });
  text_field_keybind.on_blur(function() {
    $(".text_field").blur();
    $(".text_field_counter").hide();
  });
  text_field_keybind.bind("13", ["c"], function() {
    var text = $(".text_field").val();
    var count = check_update_count(text, false);
    if(count <= 140 && count !== 0) {
      var in_reply_to_id = null;
      if(in_reply_to.screen_name) {
        if(text.match(RegExp("@" + in_reply_to.screen_name + "($|[^0-9A-Za-z_])"))) {
          in_reply_to_id = in_reply_to.id;
        }
      }
      $(".text_field").val("");
      main.accessor.call_method("update_tweet", [text, in_reply_to_id]);
      in_reply_to = {
        "id" : null,
        "screen_name" : null
      };
    }
  });
  text_field_keybind.bind("9", [], function() {
    if(before_focused_column) {
      KeyEvents.focus(before_focused_column);
    }
  });
  var in_reply_to = {
    "id" : null,
    "screen_name" : null
  };
  $.each(main.column_view.columns, function(i, column) {
    var tv = column.tableview;
    tv.keybind.bind("9", [], function() {
      KeyEvents.focus("compose_field");
    });
    tv.keybind.bind("13", [], function() {
      var in_reply_to_tweets = [];
      $.each(tv.selected, function(i, id) {
        var tweet = column.tweets[column.index(id)];
        var base_tweet = null;
        if(tweet.retweeted_status) {
          base_tweet = tweet.retweeted_values;
        } else {
          base_tweet = tweet;
        }
        in_reply_to_tweets.push(base_tweet);
      });
      console.log(in_reply_to_tweets);
      $(".text_field").val("@" + in_reply_to_tweets.map(function(tw) { return tw.screen_name; }).unique().join(" @") + " " + $(".text_field").val());
      in_reply_to.screen_name = in_reply_to_tweets.first().screen_name;
      in_reply_to.id = in_reply_to_tweets.first().status_id;
      // console.log(in_reply_to);
      KeyEvents.focus("compose_field");
      $(".text_field")[0].setSelectionRange($(".text_field").val().length, $(".text_field").val().length);
    });
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
  gui_initialize_done: function() {
    event_setup(this);
  },
  add_tweet: function(column_id, values) {
    // console.log(column_id, values);
    this.column_view.columns[this.column_view.index(column_id)].add_tweet(values);
  },
  add_tweet_array: function(column_id, values_array) {
    values_array.forEach(function(values, i) {
      this.column_view.columns[this.column_view.index(column_id)].add_tweet(values);
    }, this);
  },
  remove_tweet: function(id) {
    $.each(this.column_view.columns, function(i, column) {
      column.tableview.remove("col_" + column.tableviews_id + "_utid_" + id);
    });
  },
  update_tweet_status: function(id, status) {
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
    var utid = values.status_id;
    var tid = values.retweeted_status ? values.retweeted_status_id : values.status_id;
    if(this.tweet_ids.length === 0) {
      // console.log(0);
      index = 0;
      self.tableview.insert_last(html, "col_" + self.tableviews_id + "_utid_" + utid, ["utid_" + utid, "tid_" + tid]);
      // for(var j = 0; j <= 300; j++) {
      //   self.tableview.insert_last(html, "col_" + self.tableviews_id + j + "_utid_" + utid + j, ["utid_" + utid + j, "tid_" + tid + j]);
      // }
    } else {
      var reversed_tweet_ids = $.extend(true, [], this.tweet_ids);
      reversed_tweet_ids.reverse();
      $.each(reversed_tweet_ids, function(i, id) {
        if(compareId(utid, id)) {
          if(i === 0) {
            // console.log(self.tweet_ids.length);
            index = self.tweet_ids.length;
            self.tableview.insert_last(html, "col_" + self.tableviews_id + "_utid_" + utid, ["utid_" + utid, "tid_" + tid]);
          } else {
            // console.log(self.tweet_ids.length - i);
            index = self.tweet_ids.length - i;
            self.tableview.insert(html, "col_" + self.tableviews_id + "_utid_" + utid, index, ["utid_" + utid, "tid_" + tid]);
          }
          return false;
        } else if(i == self.tweet_ids.length - 1) {
          // console.log(0);
          index = 0;
          self.tableview.insert(html, "col_" + self.tableviews_id + "_utid_" + utid, index, ["utid_" + utid, "tid_" + tid]);
        }
      });
    }
    // console.log(index);
    this.tweets.splice(index, 0, values);
    this.tweet_ids.splice(index, 0, "col_" + this.tableviews_id + "_utid_" + utid);
  },
  index: function(id_index) {
    var index = id_index;
    if(id_index !== parseInt(id_index, 10)) {
      index = this.tweet_ids.indexOf(id_index);
    } else if(index < 0 || this.tweet_ids.length - 1 < index) {
      index = undefined;
    }
    return index == -1 ? undefined : index;
  }
};

function makeup_display_html (base_data, html_templete, mini_view) {
  if(mini_view === undefined) {
    mini_view = true;
  }
  var data;
  // check retweet or not
  if(base_data.retweeted_status) {
    data = base_data.retweeted_values;
  } else {
    data = base_data;
  }
  // replace newline
  var text = data.text.replace(/\n/g, "<br>");
  // replace urls
  if(data.entities.urls.length !== 0) {
    data.entities.urls.forEach(function(urls, i) {
      var url_html = '<a href="' + data.entities.urls[i].expanded_url + '" target="_blank">' + data.entities.urls[i].display_url + '</a>';
      text = text.replace(data.entities.urls[i].url, url_html);
    });
  }
  // replace media urls
  if(data.entities.media) {
    data.entities.media.forEach(function(media, i) {
      var media_html = '<a href="' + media.expanded_url + '" target="_blank">' + media.display_url + '</a>';
      text = text.replace(media.url, media_html);
    });
  }
  // check mini view to add mini class
  var aditional_class = [];
  if(mini_view) {
    aditional_class.push("mini");
  }
  // replace retweet source profile image if retweet
  var retweeted_status_style = "";
  var retweeted_by = "";
  if(base_data.retweeted_status) {
    retweeted_status_style = "background-image: url('" + base_data.profile_image_url.replace(/_normal/, "") + "')";
    retweeted_by = "RT: " + base_data.screen_name;
    aditional_class.push("retweeted_status");
  }
  // construct media thumbnail html
  media_thumb_html = "";
  media_thumb_html_templete = '<a href="%media_img_url%" target="_blank" class="media_img_wrap"><div class="media_thumbnail_image" style="background-image: url(\'%media_thumbnail_image_url%\')"></div></a>';
  if(data.extended_entities) {
    $.each(data.extended_entities.media, function(i, media) {
      media_thumb_html += media_thumb_html_templete.replace_with({
        "%media_thumbnail_image_url%" : media.media_url,
        "%media_img_url%" : media.expanded_url
      });
    });
    aditional_class.push("media_thumbnail");
  }
  // add symbols class
  if(data.retweeted) {
    aditional_class.push("retweeted");
  }
  if(data.favorited) {
    aditional_class.push("favorited");
  }
  // replace tweet data
  item_html = html_templete.replace_with({
    "%screen_name%" : data.screen_name,
    "%name%" : data.name,
    "%text%" : text,
    // "%text%" : base_data.id,
    "%created_at%" : '<a href="http://twitter.com/' + data.screen_name + "/status/" + data.status_id + '" target="_blank">' + data.created_at.mon + "/" + data.created_at.mday + " " + data.created_at.hour + ":" + data.created_at.min + ":" + data.created_at.sec + "</a>",
    // "%created_at%" : data.created_at.hour + ":" + data.created_at.min + ":" + data.created_at.sec,
    "%profile_image_url%" : data.profile_image_url.replace(/_normal/, ""),
    "%via%" : data.source.replace("href", "target=\"_blank\" href"),
    "%retweeted_status_style%" : retweeted_status_style,
    "%retweeted_by%" : retweeted_by,
    "%aditional_class%" : aditional_class.join(" "),
    "%media_thumb%" : media_thumb_html
  });
  return item_html;
}
