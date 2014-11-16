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

var DEFAULT_IP = "localhost";
var DEFAULT_PORT = "8080";

// js libs ready
function setup () {
  var main = new Methods(DEFAULT_IP, DEFAULT_PORT);
}

// gui initialize done
function event_setup (main, keymap) {
  // global KeyEvent focus
  var before_focused_column = null;
  KeyEvents.on_focus(function(blur_id) {
    if(blur_id && blur_id.match(/table_/) !== null) {
      before_focused_column = blur_id;
    }
  });
  // focus to first column
  main.column_view.columns.first().tableview.keybind.focus();
  // compise field events
  var text_field_keybind = new KeyEvents("compose_field");
  $(".text_area").on("focus", function() {
    text_field_keybind.focus();
  });
  $(".text_area").on("keyup", function() {
    var count = 140 - check_update_count($(".text_area").val(), media.length !== 0);
    if(count < 0) {
      $(".text_area_counter").css({"color" : "rgb(255, 54, 46)"});
    } else {
      $(".text_area_counter").css({"color" : "rgb(130, 130, 130)"});
    }
    $(".text_area_counter").text(count);
  });
  text_field_keybind.on_focus(function() {
    // console.log("on_focus");
    $(".text_area").focus();
    $(".text_area_counter").show();
  });
  text_field_keybind.on_blur(function() {
    $(".text_area").blur();
    $(".text_area_counter").hide();
  });
  // post with media controller
  media = [];
  $.event.props.push('dataTransfer');
  $("html").bind("drop", function(event) {
    event.stopPropagation();
    event.preventDefault();
    console.log(event);
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
          var index = media.length;
          $(".attach_field").append(['<div class="attach_thumb_wrap"><img class="attach_thumb" src="', e.target.result,
                            '" title="', escape(theFile.name), '"/><div class="attach_clear_button"></div></div>'].join(''));
          $(".attach_field").find(".attach_thumb_wrap").last().fadeIn(200);
          $(".attach_field").find(".attach_clear_button").last().on("click", function() {
            $(this).parent().fadeOut(250, function() {
              $(this).remove();
            });
            media.splice(index, 1);
            $(".text_area").trigger("keyup").trigger("focus");
          });
          media.push({
            "base64" : e.target.result,
            "filename" : theFile.name
          });
          console.log(media);
          $(".text_area").trigger("keyup");
        };
      })(f);
      // Read in the image file as a data URL.
      reader.readAsDataURL(f);
    });
  }).bind("dragenter dragover", false);
  // post tweet
  text_field_keybind.bind(keymap["post_tweet"].key, keymap["post_tweet"].with_key, function() {
    var text = $(".text_area").val();
    var count = check_update_count(text, media.length !== 0);
    if(count <= 140 && count !== 0) {
      var in_reply_to_id = null;
      if(in_reply_to.screen_name) {
        if(text.match(RegExp("@" + in_reply_to.screen_name + "($|[^0-9A-Za-z_])"))) {
          in_reply_to_id = in_reply_to.id;
        }
      }
      $(".text_area").val("");
      if(media.length !== 0) {
        main.accessor.call_method("update_tweet_with_media", [text, media, in_reply_to_id]);
        media = [];
        $(".attach_field").empty();
      } else {
        main.accessor.call_method("update_tweet", [text, in_reply_to_id]);
      }
      in_reply_to = {
        "id" : null,
        "screen_name" : null
      };
    }
  });
  // toggle focus textarea or tableview
  text_field_keybind.bind(keymap["toggle_focus"].key, keymap["toggle_focus"].with_key, function() {
    if(before_focused_column) {
      KeyEvents.focus(before_focused_column);
    }
  });
  // tableviews key events
  var in_reply_to = {
    "id" : null,
    "screen_name" : null
  };
  $.each(main.column_view.columns, function(i, column) {
    var tv = column.tableview;
    // toggle focus textarea or tableview
    tv.keybind.bind(keymap["toggle_focus"].key, keymap["toggle_focus"].with_key, function() {
      KeyEvents.focus("compose_field");
    });
    // create reply
    tv.keybind.bind(keymap["create_reply"].key, keymap["create_reply"].with_key, function() {
      if(tv.selected.length !== 0) {
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
        $(".text_area").val("@" + in_reply_to_tweets.map(function(tw) { return tw.screen_name; }).unique().join(" @") + " " + $(".text_area").val());
        in_reply_to.screen_name = in_reply_to_tweets.first().screen_name;
        in_reply_to.id = in_reply_to_tweets.first().status_id;
        // console.log(in_reply_to);
        KeyEvents.focus("compose_field");
        $(".text_area")[0].setSelectionRange($(".text_area").val().length, $(".text_area").val().length);
      }
    });
    // toggle favorite
    tv.keybind.bind(keymap["toggle_favorite"].key, keymap["toggle_favorite"].with_key, function() {
      if(tv.selected.length !== 0) {
        $.each(tv.selected, function(i, id) {
          var target_obj = column.tweets[column.index(id)];
          if(target_obj.retweeted_status) {
            target_obj = target_obj.retweeted_values;
          }
          if(target_obj.favorited) {
            main.accessor.call_method("unfavorite_tweet", [target_obj.status_id]);
          } else {
            main.accessor.call_method("favorite_tweet", [target_obj.status_id]);
          }
        });
      }
    });
    // toggle retweet
    tv.keybind.bind(keymap["toggle_retweet"].key, keymap["toggle_retweet"].with_key, function() {
      if(tv.selected.length !== 0) {
        $.each(tv.selected, function(i, id) {
          var target_obj = column.tweets[column.index(id)];
          if(target_obj.retweeted_status) {
            target_obj = target_obj.retweeted_values;
          }
          if(target_obj.retweeted) {
            main.accessor.call_method("unretweet_tweet", [target_obj.status_id]);
          } else {
            main.accessor.call_method("retweet_tweet", [target_obj.status_id]);
          }
        });
      }
    });
    // goto end item
    tv.keybind.bind(keymap["goto_end"].key, keymap["goto_end"].with_key, function() {
      tv.cursor.move(tv.last().index());
      tv.cursor.update_scroll(function() {
        tv.render();
      });
    });
    // toggle overlay
    tv.keybind.bind(keymap["toggle_overlay"].key, keymap["toggle_overlay"].with_key, function() {
      this.detail_overlay_visible = !this.detail_overlay_visible;
      if(this.detail_overlay_visible) {
        if(tv.selected.length == 1) {
          var html = this.mekeup_overlay_html();
          if(this.tweet_detail_overlay.html() === "") {
            this.show_detail_overlay(html);
          }
        }
      } else {
        if(this.tweet_detail_overlay.html() !== "") {
          this.hide_detail_overlay();
        }
      }
    }, column);
    // goto next column
    tv.keybind.bind(keymap["go_next_column"].key, keymap["go_next_column"].with_key, function() {
      if(main.column_view.columns.length >= 2) {
        main.column_view.columns[i + 1 >= main.column_view.columns.length ? 0 : i + 1].tableview.keybind.focus();
      }
    });
    // goto prev column
    tv.keybind.bind(keymap["go_prev_column"].key, keymap["go_prev_column"].with_key, function() {
      if(main.column_view.columns.length >= 2) {
        main.column_view.columns[i - 1 <= -1 ? main.column_view.columns.length - 1 : i - 1].tableview.keybind.focus();
      }
    });
  });
}

ENABLE_SPLASH_SCREEN = true;

function Methods () {
  this.initialize.apply(this, arguments);
}

Methods.prototype = {
  initialize: function(ip, port) {
    this.show_splash_screen();
    this.accessor = new Accessor(this, ip, port);
    this.column_view = new ColumnView();
  },
  test: function(t) {
    console.log(t);
  },
  show_splash_screen: function() {
    if(ENABLE_SPLASH_SCREEN) {
      $("body").append('<div class="splash_screen"><div class="logo"></div><div class="activity_message"></div></div>');
      $(".wrapper").css({
        "-webkit-filter" : "blur(60px)"
      });
      $(".splash_screen *").hide().fadeIn(1000);
    }
  },
  hide_splash_screen: function() {
    if(ENABLE_SPLASH_SCREEN) {
      $({"radius" : 60, "_opacity" : 1}).animate({
        "radius" : 0,
        "_opacity" : 0
      },{
        duration : 3000,
        easing: "easeOutCubic",
        step: function() {
          $(".wrapper").css({
            "-webkit-filter" : "blur(" + this.radius + "px)"
          });
          $(".splash_screen").css({
            "opacity" : this._opacity
          });
        },
        complete: function() {
          $(".splash_screen").remove();
        }
      });
    }
  },
  change_activity_message: function(msg) {
    if(ENABLE_SPLASH_SCREEN) {
      $(".splash_screen .activity_message").html(msg);
    }
  },
  error: function() {
    this.change_activity_message("[ERROR] lumilly.rb is not working <span class='adress_config_button'>Config</span>");
    var self = this;
    $(".adress_config_button").on("click", function() {
      var adress = window.prompt("Input WebSocket server adress", DEFAULT_IP + ":" + DEFAULT_PORT).match(/^(.+?):?([0-9]+)?$/);
      console.log(adress[1], adress[2]);
      self.initialize(adress[1], adress[2]);
    });
  },
  set_keybind_map: function(keybind_map) {
    this.change_activity_message("Setting keybind...");
    event_setup(this, keybind_map);
  },
  gui_initialize_done: function() {
    this.hide_splash_screen();
    this.change_activity_message("Initialize completed");
    console.log("initialize completed");
  },
  create_timeline_column: function(column) {
    this.change_activity_message("creating column \"" + column.id + "\"...");
    this.column_view.new_timeline_column(this.column_view.columns.length, column.id);
    return "created column: " + column.id;
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
      column.remove_tweet(id);
    });
  },
  update_tweet_status: function(id, status, condition) {
    var update_class = null;
    switch(status) {
      case "favorite":
        update_class = "favorited";
        break;
      case "retweet":
        update_class = "retweeted";
        break;
    }
    if(update_class) {
      // console.log(id, update_class, condition);
      $.each(this.column_view.columns, function(i, column) {
        column.update_tweet_class(id, update_class, condition);
      });
    }
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
          var html = this.mekeup_overlay_html();
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
    // this.tableview.keybind.bind("32", [], function() {
    //   this.detail_overlay_visible = !this.detail_overlay_visible;
    //   // console.log(this.detail_overlay_visible);
    //   if(this.detail_overlay_visible) {
    //     // console.log(this.tableview.selected.length);
    //     if(this.tableview.selected.length == 1) {
    //       var html = this.mekeup_overlay_html();
    //       // console.log(this.tweet_detail_overlay);
    //       // console.log(this.tweet_detail_overlay.html());
    //       if(this.tweet_detail_overlay.html() === "") {
    //         this.show_detail_overlay(html);
    //       }
    //     }
    //   } else {
    //     if(this.tweet_detail_overlay.html() !== "") {
    //       this.hide_detail_overlay();
    //     }
    //   }
    // }, this);
  },
  mekeup_overlay_html: function() {
    var values = this.tweets[this.index(this.tableview.selected[0])];
    var additional_class = ["utid_" + values.status_id, "tid_" + (values.retweeted_status ? values.retweeted_status_id : values.status_id)];
    if(values.retweeted_status ? values.retweeted_values.retweeted : values.retweeted) {
      additional_class.push("retweeted");
    }
    if(values.retweeted_status ? values.retweeted_values.favorited : values.favorited) {
      additional_class.push("favorited");
    }
    var insert_html = '<div class="item %classes%" item_id="%id%">%html%</div>'.replace_with({
      "%classes%" : additional_class.join(" "),
      "%id%" : "col_" + this.tableviews_id + "_utid_" + values.id,
      "%html%" : makeup_display_html(values, default_templete, false)
    });
    return insert_html;
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
    var additional_class = ["utid_" + utid, "tid_" + tid];
    if(values.retweeted_status ? values.retweeted_values.retweeted : values.retweeted) {
      additional_class.push("retweeted");
    }
    if(values.retweeted_status ? values.retweeted_values.favorited : values.favorited) {
      additional_class.push("favorited");
    }
    if(this.tweet_ids.length === 0) {
      // console.log(0);
      index = 0;
      self.tableview.insert_last(html, "col_" + self.tableviews_id + "_utid_" + utid, additional_class);
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
            self.tableview.insert_last(html, "col_" + self.tableviews_id + "_utid_" + utid, additional_class);
          } else {
            // console.log(self.tweet_ids.length - i);
            index = self.tweet_ids.length - i;
            self.tableview.insert(html, "col_" + self.tableviews_id + "_utid_" + utid, index, additional_class);
          }
          return false;
        } else if(i == self.tweet_ids.length - 1) {
          // console.log(0);
          index = 0;
          self.tableview.insert(html, "col_" + self.tableviews_id + "_utid_" + utid, index, additional_class);
        }
      });
    }
    // console.log(index);
    this.tweets.splice(index, 0, values);
    this.tweet_ids.splice(index, 0, "col_" + this.tableviews_id + "_utid_" + utid);
  },
  remove_tweet: function(id_index) {
    var index = this.index(id_index);
    if(index) {
      this.tweets.splice(index, 1);
      this.tweet_ids.splice(index, 1);
      this.tableview.remove(index);
    }
  },
  update_tweet_class: function(id_index, update_class, condition) {
    var index = this.index(id_index);
    if((condition === true || condition === false) && index) {
      if(condition) {
        this.tableview.addClass(index, update_class);
      } else {
        this.tableview.removeClass(index, update_class);
      }
      if(this.tweets[index]["retweeted_status"]) {
        this.tweets[index]["retweeted_values"][update_class] = condition;
      } else {
        this.tweets[index][update_class] = condition;
      }
    }
  },
  index: function(id_index) {
    var index = id_index;
    if((id_index !== parseInt(id_index, 10)) || (index < 0 || this.tweet_ids.length - 1 < index)) {
      index = this.tweet_ids.indexOf(String(id_index));
      if(index == -1) {
        index = this.tweet_ids.indexOf("col_" + this.tableviews_id + "_utid_" + id_index);
      }
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
  var additional_class = [];
  if(mini_view) {
    additional_class.push("mini");
  }
  // replace retweet source profile image if retweet
  var retweeted_status_style = "";
  var retweeted_by = "";
  if(base_data.retweeted_status) {
    retweeted_status_style = "background-image: url('" + base_data.profile_image_url.replace(/_normal/, "") + "')";
    retweeted_by = '<span class="icon-retweet"></span><span class="retweeted_by_screen_name">' + base_data.screen_name + "</span>";
    additional_class.push("retweeted_status");
  }
  // construct media thumbnail html
  media_thumb_html = [];
  media_thumb_html_templete = '<a href="%media_img_url%" target="_blank" class="media_img_wrap"><div class="media_thumbnail_image" style="background-image: url(\'%media_thumbnail_image_url%\')"></div></a>';
  if(data.extended_entities) {
    $.each(data.extended_entities.media, function(i, media) {
      media_thumb_html.push(media_thumb_html_templete.replace_with({
        "%media_thumbnail_image_url%" : media.media_url,
        "%media_img_url%" : media.expanded_url
      }));
    });
    additional_class.push("media_thumbnail");
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
    "%additional_class%" : additional_class.join(" "),
    "%media_thumb%" : media_thumb_html.reverse().join("")
  });
  return item_html;
}
