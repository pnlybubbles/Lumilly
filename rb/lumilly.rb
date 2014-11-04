require "em-websocket"
require "yaml"
require "twitter"
require "sqlite3"
require "active_record"
require "active_support"
require "active_support/core_ext"
require "pp"

module Accessor
  class Socket
    attr_reader :tr

    def initialize(debug = false)
      @tr = nil
      @script = nil
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
          puts e.backtrace
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

module Lumilly
  class App
    attr_reader :client, :stream_client

    def initialize(token_dir, config_dir)
      initialize_twitter(token_dir)
      load_config(config_dir)
      @accessor = Accessor::Socket.new
      Lumilly::Tweet.setup(@mydata)
      start_streaming()
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

      # @mydata = @client.verify_credentials.to_h
      @mydata = {:id => 322116499}
      puts "user id: #{@mydata[:id]}"
    end

    def load_config(yaml_dir)
      @config = YAML.load_file(File.expand_path(yaml_dir))
    end

    def setup_events
      @accessor.transfer { |tr|
        tr.event("open") {
          puts "opened"
        }

        tr.event("load") {
          puts "loaded"
          @config["columns"].each { |column|
            puts @accessor.tr.call_function("create_timeline_column", column);
            ActiveRecord::Base.connection_pool.with_connection {
              # p Lumilly::Tweet.get_latest(100, column["pattern"]).map(&:to_values).map { |e| e[:status_id] }
              tr.call_function("add_tweet_array", [column["id"], Lumilly::Tweet.get_latest(200, column["pattern"]).map(&:to_values).reverse], true)
            }
          }
          tr.call_function("gui_initialize_done", [])
        }

        tr.event("update_tweet") { |text, in_reply_to_status_id|
          puts "==== update_tweet: #{text}  reply_to: #{in_reply_to_status_id}"
          if in_reply_to_status_id
            @client.update(text, :in_reply_to_status_id => in_reply_to_status_id)
          else
            @client.update(text)
          end
        }

        tr.event("retweet_tweet") { |id|
          @client.retweet(id);
        }

        tr.event("favorite_tweet") { |id|
          @client.favorite(id);
        }

        tr.event("unfavorite_tweet") { |id|
          @client.unfavorite(id);
        }

        tr.event("close") {
          puts "closed"
        }
      }
    end

    def start_streaming
      Thread.new() {
        loop {
          puts "streaming connecting..."
          begin
            @stream_client.user { |res|
              begin
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
              rescue Exception => e
                puts e.to_s
                puts e.backtrace.join("\n")
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
      puts "#{res.created_at} #{res.user.screen_name}: #{res.text}"
      values = Lumilly::Tweet.add(res).to_values
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
        ActiveRecord::Base.connection_pool.with_connection {
          obj = Tweet.where(:status_id => res.retweeted_status.id)[0]
          if res.user.id == @mydata[:id]
            obj.retweeted = true
            @accessor.tr.call_function("update_tweet_status", [obj.status_id.to_s, "retweet", true], true)
            obj_retweets = Tweet.where(:retweeted_status_id => obj.status_id)
            obj_retweets.each { |obj_r|
              @accessor.tr.call_function("update_tweet_status", [obj_r.status_id.to_s, "retweet", true], true)
            }
          end
          obj.retweet_count += 1
          obj.save
        }
      end
    end

    def on_delete(res)
      ActiveRecord::Base.connection_pool.with_connection {
        obj = Tweet.where(:status_id => res.id)[0]
        if obj
          if obj.retweeted_status
            obj_retweet_source = Tweet.where(:status_id => obj.retweeted_status_id)[0]
            if obj.user_id == @mydata[:id]
              obj_retweet_source.retweeted = false
              @accessor.tr.call_function("update_tweet_status", [obj_retweet_source.status_id.to_s, "retweet", false], true)
              obj_retweets = Tweet.where(:retweeted_status_id => obj_retweet_source.status_id)
              obj_retweets.each { |obj_r|
                @accessor.tr.call_function("update_tweet_status", [obj_r.status_id.to_s, "retweet", false], true)
              }
            end
            obj_retweet_source.retweet_count -= 1
            obj_retweet_source.save
          else
            obj_retweets = Tweet.where(:retweeted_status_id => res.id)
            obj_retweets.each { |obj_r|
              @accessor.tr.call_function("remove_tweet", obj_r.status_id.to_s, true)
              obj_r.destroy
            }
          end
          @accessor.tr.call_function("remove_tweet", obj.status_id.to_s, true)
          obj.destroy
        end
      }
    end

    def on_event(res)
      case res.name
      when :favorite
        ActiveRecord::Base.connection_pool.with_connection {
          obj = Tweet.where(:status_id => res.target_object.id)[0]
          if obj
            if res.source.id == @mydata[:id]
              obj.favorited = true
              @accessor.tr.call_function("update_tweet_status", [obj.status_id.to_s, "favorite", true], true)
              obj_retweets = Tweet.where(:retweeted_status_id => obj.status_id)
              obj_retweets.each { |obj_r|
                @accessor.tr.call_function("update_tweet_status", [obj_r.status_id.to_s, "favorite", true], true)
              }
            end
            obj.favorite_count += 1
            obj.save
          end
        }
      when :unfavorite
        ActiveRecord::Base.connection_pool.with_connection {
          obj = Tweet.where(:status_id => res.target_object.id)[0]
          if obj
            if res.source.id == @mydata[:id]
              obj.favorited = false
              @accessor.tr.call_function("update_tweet_status", [obj.status_id.to_s, "favorite", false], true)
              obj_retweets = Tweet.where(:retweeted_status_id => obj.status_id)
              obj_retweets.each { |obj_r|
                @accessor.tr.call_function("update_tweet_status", [obj_r.status_id.to_s, "favorite", false], true)
              }
            end
            obj.favorite_count -= 1
            obj.save
          end
        }
      when :follow
        # follow
      when :unfollow
        # unfollow
      end
    end

    def run
      @accessor.start
    end
  end

  class Tweet < ActiveRecord::Base
    @@mydata = nil

    def self.setup(mydata)
      puts "loading database..."
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

    def self.add(res)
      ActiveRecord::Base.connection_pool.with_connection {
        if Tweet.where(:status_id => res.id)[0]
          return nil
        end
      }
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
        :mention => res.retweeted_status? ? nil : res.user_mentions? && res.user_mentions.map(&:id).index(@@mydata[:id]).!.!,
        :entities => res.to_h[:entities].to_json,
        :extended_entities => res.to_h[:extended_entities].to_json,
        :retweeted => res.retweeted?,
        :favorited => res.favorited?,
        :retweet_count => res.retweet_count,
        :favorite_count => res.favorite_count
      }
      if res.retweeted_status?
        Tweet.add(res.retweeted_status)
      end
      ret = nil
      # p values
      ActiveRecord::Base.connection_pool.with_connection {
        ret = Tweet.create(values)
      }
      return ret
    end

    def to_values
      values = adapt_for_json(self.attributes.symbolize_keys)
      if values[:retweeted_status]
        retweeted_obj = nil
        ActiveRecord::Base.connection_pool.with_connection {
          retweeted_obj = Tweet.where(:status_id => values[:retweeted_status_id])[0]
        }
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
      ActiveRecord::Base.connection_pool.with_connection {
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
      }
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

puts "load preferences..."
app = Lumilly::App.new("key_token.yml", "config.yml")
app.setup_events
puts "accessor running..."
app.run
