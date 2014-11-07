require "em-websocket"
require "yaml"
require "twitter"
require "sqlite3"
require "active_record"
require "active_support"
require "active_support/core_ext"
require "terminal-notifier" if RUBY_PLATFORM.match(/darwin/)
require "pp"

module Accessor
  class Socket
    attr_reader :tr

    def initialize(debug = false)
      @tr = nil
      @debug = debug
      @transfer = nil
    end

    def start
      EM::WebSocket.start(:host => "localhost", :port => 8080, :debug => @debug) do |ws|
        ws.onopen {
          @tr = Transfer.new(ws)
          @transfer.call(@tr)
          @tr.call_event("open", [])
        }

        ws.onmessage { |msg|
          @tr.get(JSON.parse(msg))
        }

        ws.onclose {
          @tr.call_event("close", [])
          @tr = nil
        }
      end
    end

    def transfer(&bl)
      @transfer = bl
    end
  end

  class Transfer
    def initialize(ws)
      @ws = ws
      @callback_queue = {}
      @events = {}
    end

    def event(event_name, &bl)
      @events[event_name] = bl
    end

    def call_event(event_name, argu)
      return @events[event_name].call(*argu)
    end

    def tell(req, *callback)
      callback_id = nil
      if !callback.empty? && callback[0]
        callback_id = rand(36**4).to_s(36)
        @callback_queue[callback_id] = Queue.new
      end
      msg = {"type" => "event", "content" => req, "callback_id" => callback_id}
      send_ws(msg)
      return @callback_queue[callback_id] if callback_id
    end

    def get(req)
      Thread.new {
        begin
          if req["from"] == "client"
            # pp req
            e = req["content"]
            case req["type"]
            when "event"
              argu = e["argu"].nil? ? [] : (e["argu"].class == Array ? e["argu"] : [e["argu"]])
              ret = call_event(e["name"], argu)
              if req["callback_id"]
                msg = {"type" => "callback", "content" => {"return" => ret}, "callback_id" => req["callback_id"]}
                send_ws(msg)
              end
            when "callback"
              @callback_queue[req["callback_id"]].push(e["return"])
            end
          end
        rescue Exception => e
          puts e
          puts e.backtrace.join("\n") if $DEBUG_
        end
      }
    end

    def call_function(func_name, argu, *asynchronous)
      argu = argu.nil? ? [] : (argu.class == Array ? argu : [argu])
      msg = {"name" => func_name, "argu" => argu}
      if asynchronous[0]
        tell(msg)
        return nil
      else
        return tell(msg, true).pop
      end
    end

    private
    def send_ws(msg)
      msg["from"] = "server"
      # pp msg
      @ws.send(JSON.generate(msg).to_s)
    end
  end
end

$DEBUG_ = false

module Lumilly
  class App
    attr_reader :client, :stream_client

    def initialize(token_dir, config_dir)
      # initialize @config
      load_config(config_dir)
      # initialize @client, @stream_client
      initialize_twitter(token_dir)
      # connect to db
      Lumilly::Tweet.setup(@mydata)
      # get minimum required tweets from Twitter
      setup_tweets()
      # start streaming
      start_streaming()
      # initialize websocket
      @accessor = Accessor::Socket.new
    end

    def initialize_twitter(yaml_dir)
      raise "Error: setup tokens (key_token.yml not found)" unless File.exist?(File.expand_path(yaml_dir))
      key_data = YAML.load_file(File.expand_path(yaml_dir))

      @client = Twitter::REST::Client.new do |config|
        config.consumer_key        = key_data["consumer_key"]
        config.consumer_secret     = key_data["consumer_secret"]
        config.access_token        = key_data["access_token"]
        config.access_token_secret = key_data["access_token_secret"]
      end

      @stream_client = Twitter::Streaming::Client.new do |config|
        config.consumer_key        = key_data["consumer_key"]
        config.consumer_secret     = key_data["consumer_secret"]
        config.access_token        = key_data["access_token"]
        config.access_token_secret = key_data["access_token_secret"]
      end

      if $DEBUG_
        @mydata = {:id => 322116499}
        def @mydata.method_missing(meth, *argu)
          return self[meth.to_sym]
        end
      else
        puts "getting verify credentials..." if $DEBUG_
        @mydata = @client.verify_credentials
      end
      puts "user id: #{@mydata.id}" if $DEBUG_
    end

    def load_config(yaml_dir)
      raise "Error: setup config (config.yml not found)" unless File.exist?(File.expand_path(yaml_dir))
      @config = YAML.load_file(File.expand_path(yaml_dir))
      @config["keybind"] = @config["keybind"].inject({}) { |h, (name, v)|
        h[name] = {}
        h[name]["key"] = v["key"]
        h[name]["with_key"] = v["with_key"].to_s.split(",").map { |w| w.strip[0, 1] }
        h
      }
    end

    def setup_tweets
      unless $DEBUG_
        ActiveRecord::Base.connection_pool.with_connection {
          puts "getting mention timeline..." if $DEBUG_
          @client.mentions(:count => 200).each { |t|
            Tweet.add(t)
          }
          puts "getting home timeline..." if $DEBUG_
          @client.home_timeline(:count => 200).each { |t|
            Tweet.add(t)
          }
        }
      end
    end

    def setup_events
      @accessor.transfer { |tr|
        tr.event("open") {
          puts "opened" if $DEBUG_
        }

        tr.event("load") {
          ActiveRecord::Base.connection_pool.with_connection {
            puts "loaded" if $DEBUG_
            @config["columns"].each { |column|
              rp = @accessor.tr.call_function("create_timeline_column", column)
              puts rp if $DEBUG_
              tr.call_function("add_tweet_array", [column["id"], Lumilly::Tweet.get_latest(200, column["pattern"]).map(&:to_values).reverse], true)
            }
            tr.call_function("set_keybind_map", [@config["keybind"]])
            puts "set keybind mapping" if $DEBUG_
            tr.call_function("gui_initialize_done", [])
            puts "gui initialize done" if $DEBUG_
          }
        }

        tr.event("update_tweet") { |text, in_reply_to_status_id|
          puts "==== update_tweet: #{text}  reply_to: #{in_reply_to_status_id}" if $DEBUG_
          if in_reply_to_status_id
            @client.update(text, :in_reply_to_status_id => in_reply_to_status_id)
          else
            @client.update(text)
          end
        }

        tr.event("delete_tweet") { |id|
          @client.destroy_status(id)
        }

        tr.event("retweet_tweet") { |id|
          @client.retweet(id)
        }

        tr.event("unretweet_tweet") { |id|
          ActiveRecord::Base.connection_pool.with_connection {
            obj = Tweet.where(:user_id => @mydata.id, :retweeted_status_id => id)[0]
            if obj
              @client.destroy_status(obj.status_id)
            end
          }
        }

        tr.event("favorite_tweet") { |id|
          @client.favorite(id)
        }

        tr.event("unfavorite_tweet") { |id|
          @client.unfavorite(id)
        }

        tr.event("close") {
          puts "closed" if $DEBUG_
        }
      }
    end

    def start_streaming
      Thread.new() {
        loop {
          puts "streaming connecting..." if $DEBUG_
          begin
            @stream_client.user { |res|
              begin
                ActiveRecord::Base.connection_pool.with_connection {
                  case res
                  when Twitter::Tweet
                    on_tweet(res)
                  when Twitter::DirectMessage
                    # on_direct_message
                  when Twitter::Streaming::Event
                    on_event(res)
                  when Twitter::Streaming::DeletedTweet
                    on_delete(res)
                  end
                }
              rescue Exception => e
                puts e.to_s
                puts e.backtrace.join("\n") if $DEBUG_
              end
            }
          rescue Exception => e
            puts e.to_s
          end
          sleep 5
        }
      }
    end

    def on_tweet(res)
      puts "#{res.created_at} #{res.user.screen_name}: #{res.text.gsub(/\n/, ' ')}"
      if res.retweeted_status? && res.retweeted_status.user.id == @mydata.id
        Nofitication.notify("Retweeted by @#{res.user.screen_name}", res.retweeted_status.text)
      end
      if res.retweeted_status? ? false : res.user_mentions? && res.user_mentions.map(&:id).index(@mydata.id)
        Nofitication.notify("Reply from @#{res.user.screen_name}", res.text)
      end
      values = Lumilly::Tweet.add(res, true).to_values
      @config["columns"].each { |column|
        check = false
        case column["pattern"]
        when "all"
          check = true
        when "mention"
          check = true if values[:mention]
        else
          # aaa OR bbb OR ccc OR (ddd AND ggg) OR (eee AND NOT (fff))
          pattern_query = column["pattern"].gsub(/\(/, " ( ").gsub(/\)/, " ) ").split(" ").map { |word|
            case word
            when /^OR$/i
              "||"
            when /^AND$/i
              "&&"
            when /^NOT$/i
              "!"
            when "("
              "("
            when ")"
              ")"
            else
              "values[:text] =~ /#{word.gsub('/', '\\/').gsub('#', '\\#')}/" # escape
            end
          }.join(" ")
          check = eval(pattern_query)
        end
        @accessor.tr.call_function("add_tweet", [column["id"], values], true) if @accessor.tr && check
      }
      if res.retweeted_status?
        obj_retweet_source = Tweet.where(:status_id => res.retweeted_status.id)[0]
        if res.user.id == @mydata.id
          obj_retweet_source.retweeted = true
          @accessor.tr.call_function("update_tweet_status", [obj_retweet_source.status_id.to_s, "retweet", true], true) if @accessor.tr
          obj_retweets = Tweet.where(:retweeted_status_id => obj_retweet_source.status_id)
          obj_retweets.each { |obj_r|
            @accessor.tr.call_function("update_tweet_status", [obj_r.status_id.to_s, "retweet", true], true) if @accessor.tr
          }
        end
        obj_retweet_source.retweet_count += 1
        obj_retweet_source.save
      end
    end

    def on_delete(res)
      obj = Tweet.where(:status_id => res.id)[0]
      if obj
        if obj.retweeted_status
          obj_retweet_source = Tweet.where(:status_id => obj.retweeted_status_id)[0]
          if obj.user_id == @mydata.id
            obj_retweet_source.retweeted = false
            @accessor.tr.call_function("update_tweet_status", [obj_retweet_source.status_id.to_s, "retweet", false], true) if @accessor.tr
            obj_retweets = Tweet.where(:retweeted_status_id => obj_retweet_source.status_id)
            obj_retweets.each { |obj_r|
              @accessor.tr.call_function("update_tweet_status", [obj_r.status_id.to_s, "retweet", false], true) if @accessor.tr
            }
          end
          obj_retweet_source.retweet_count -= 1
          obj_retweet_source.save
        else
          obj_retweets = Tweet.where(:retweeted_status_id => res.id)
          obj_retweets.each { |obj_r|
            @accessor.tr.call_function("remove_tweet", obj_r.status_id.to_s, true) if @accessor.tr
            obj_r.destroy
          }
        end
        @accessor.tr.call_function("remove_tweet", obj.status_id.to_s, true) if @accessor.tr
        obj.destroy
      end
    end

    def on_event(res)
      case res.name
      when :favorite
        if res.target.id == @mydata.id
          Nofitication.notify("Favorited by @#{res.source.screen_name}", res.target_object.text)
        end
        obj = Tweet.where(:status_id => res.target_object.id)[0]
        if obj
          if res.source.id == @mydata.id
            obj.favorited = true
            @accessor.tr.call_function("update_tweet_status", [obj.status_id.to_s, "favorite", true], true) if @accessor.tr
            obj_retweets = Tweet.where(:retweeted_status_id => obj.status_id)
            obj_retweets.each { |obj_r|
              @accessor.tr.call_function("update_tweet_status", [obj_r.status_id.to_s, "favorite", true], true) if @accessor.tr
            }
          end
          obj.favorite_count += 1
          obj.save
        end
      when :unfavorite
        obj = Tweet.where(:status_id => res.target_object.id)[0]
        if obj
          if res.source.id == @mydata.id
            obj.favorited = false
            @accessor.tr.call_function("update_tweet_status", [obj.status_id.to_s, "favorite", false], true) if @accessor.tr
            obj_retweets = Tweet.where(:retweeted_status_id => obj.status_id)
            obj_retweets.each { |obj_r|
              @accessor.tr.call_function("update_tweet_status", [obj_r.status_id.to_s, "favorite", false], true) if @accessor.tr
            }
          end
          obj.favorite_count -= 1
          obj.save
        end
      when :follow
        if res.target.id == @mydata.id
          Nofitication.notify("Followed by @#{res.source.screen_name}", "#{res.source.name} : #{res.source.description}")
        end
      when :unfollow
        # unfollow
      end
    end

    def run
      @accessor.start
    end
  end

  class Nofitication
    def self.notify(subtitle, msg)
      if RUBY_PLATFORM.match(/darwin/)
        TerminalNotifier.notify(msg, :title => 'Lumilly', :subtitle => subtitle, :active => "com.google.Chrome", :sound => "default")
      else
        puts "\e[36;1mNotification:\e[m \e[1m[#{subtitle}] #{msg}\e[m"
      end
    end
  end

  class Tweet < ActiveRecord::Base
    @@mydata = nil

    def self.setup(mydata)
      puts "loading database..." if $DEBUG_
      ActiveRecord::Base.establish_connection(
        "adapter"=>"sqlite3",
        "database" => "tweets.db"
      )
      unless ActiveRecord::Base.connection.table_exists?(:tweets)
        ActiveRecord::Migration.create_table(:tweets) { |t|
          t.integer(:status_id)
          t.datetime(:status_created_at)
          t.integer(:user_id)
          t.string(:screen_name)
          t.string(:name)
          t.string(:profile_image_url)
          t.string(:text)
          t.boolean(:retweeted_status)
          t.integer(:retweeted_status_id)
          t.string(:source)
          t.integer(:in_reply_to_status_id)
          t.boolean(:mention)
          t.text(:entities)
          t.text(:extended_entities)
          t.boolean(:retweeted)
          t.boolean(:favorited)
          t.integer(:retweet_count)
          t.integer(:favorite_count)
        }
      end
      @@mydata = mydata
    end

    def self.add(res, *streaming)
      streaming = streaming[0].!.!
      rec = nil
      rec = Tweet.where(:status_id => res.id)[0]
      values = {
        :status_id => res.id,
        :status_created_at => DateTime.parse(res.created_at.to_s).new_offset(Rational(9,24)),
        :user_id => res.user.id,
        :screen_name => res.user.screen_name,
        :name => res.user.name,
        :profile_image_url => res.user.profile_image_url.to_s,
        :text => res.retweeted_status? ? res.retweeted_status.text : res.text,
        :retweeted_status => res.retweeted_status?,
        :retweeted_status_id => res.retweeted_status? ? res.retweeted_status.id : nil,
        :source => res.source,
        :in_reply_to_status_id => res.in_reply_to_status_id? ? res.in_reply_to_status_id : nil,
        :mention => res.retweeted_status? ? nil : res.user_mentions? && res.user_mentions.map(&:id).index(@@mydata.id).!.!,
        :entities => res.to_h[:entities].to_json,
        :extended_entities => res.to_h[:extended_entities].to_json,
        :retweeted => streaming ? (rec ? rec.retweeted : res.retweeted?) : res.retweeted?,
        :favorited => streaming ? (rec ? rec.retweeted : res.favorited?) : res.favorited?,
        :retweet_count => res.retweet_count,
        :favorite_count => res.favorite_count
      }
      if res.retweeted_status?
        Tweet.add(res.retweeted_status, streaming)
      end
      ret = nil
      if rec
        ret = rec.update_attributes(values)
      else
        ret = Tweet.create(values)
      end
      return ret
    end

    def to_values
      values = adapt_for_json(self.attributes.symbolize_keys)
      if values[:retweeted_status]
        retweeted_obj = nil
        retweeted_obj = Tweet.where(:status_id => values[:retweeted_status_id])[0]
        if retweeted_obj
          values[:retweeted_values] = retweeted_obj.to_values
        else
          raise "retweeted_values not found"
        end
      else
        values[:retweeted_values] = nil
      end
      return values
    end

    def self.get_latest(num, pattern)
      result = nil
      case pattern
      when "all"
        result = Tweet.order("-status_id").limit(num)
      when "mention"
        result = Tweet.where(:mention => true).order("-status_id").limit(num)
      else
        pattern_query = pattern.gsub(/\(/, " ( ").gsub(/\)/, " ) ").split(" ").map { |word|
          case word
          when /^or$/i
            "or"
          when /^and$/i
            "and"
          when /^not$/i
            "not"
          when "("
            "("
          when ")"
            ")"
          else
            "text glob '*#{word}*'"
          end
        }.join(" ")
        result = Tweet.where(pattern_query).order("-status_id").limit(num)
      end
      return result
    end

    private
    def parse_created_at(created_at_obj)
      new_created_at = DateTime._parse(created_at_obj.to_s)
      new_created_at.each { |k, v|
        v = v.to_s
        if v.length < 2
          new_created_at[k] = ("00" + v)[-2,2]
        else
          new_created_at[k] = v
        end
      }
      new_created_at[:datetime] = created_at_obj.to_s
      return new_created_at
    end

    def adapt_for_json(values)
      values[:status_id] = values[:status_id].to_s
      values[:created_at] = parse_created_at(values[:status_created_at])
      values[:user_id] = values[:user_id].to_s
      values[:in_reply_to_status_id] = values[:in_reply_to_status_id].to_s
      values[:entities] = ActiveSupport::JSON.decode(values[:entities])
      values[:extended_entities] = ActiveSupport::JSON.decode(values[:extended_entities])
      return values
    end
  end
end

# -- debug --

def a_ry(a)
  return a.map { |v| v.class == Array ? a_ry(v) : 0 }
end

def pa(arr)
  p a_ry(arr)
end

def ppa(arr)
  pp a_ry(arr)
end

# -- ui --

$DEBUG_ = ARGV[0] =~ /^debug$/i
unless $DEBUG_
  puts "*.*.*.* Lumilly *.*.*.*"
  puts "Now Initializing..."
  progress = Thread.new {
    bar = -1.0
    loop {
      sleep 0.005
      bar = bar >= 1.0 ? -1.0 : bar + 0.012;
      point = (((Math.sin((bar + 1 / 2) * 3.14) + 1) / 2) * 30).round
      print("[" + (" " * point) + "*" + (" " * (30 - point)) + "] processing\r")
    }
  }
end
puts "load preferences..." if $DEBUG_
app = Lumilly::App.new("key_token.yml", "config.yml")
app.setup_events
puts "accessor running..." if $DEBUG_
unless $DEBUG_
  progress.kill
  print "[#{'*' * 31}] ok        \n"
  puts "Lumilly READY"
  system("open ../main.html")
end
app.run
