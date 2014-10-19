require "em-websocket"
require "json"
require "yaml"
require "twitter"
require "sqlite3"
require "pp"

module Accessor
  class Socket
    attr_reader :tr

    def initialize(debug = false)
      @tr = nil
      @script = nil
      @debug = debug
    end

    def start
      EM::WebSocket.start(:host => "localhost", :port => 8080, :debug => @debug) do |ws|
        ws.onopen {
          @tr = Transfer.new(ws)
          @tr.instance_eval(&@script)
          @tr.send("evt_open", nil)
        }

        ws.onmessage { |msg|
          @tr.get(JSON.parse(msg))
        }

        ws.onclose {
          @tr.send("evt_close", nil)
        }
      end
    end

    def script(&blk)
      @script = blk
    end
  end

  class Transfer
    def initialize(ws)
      @ws = ws
      @callback_queue = {}
    end

    def send_ws(msg)
      msg["from"] = "server"
      # pp msg
      @ws.send(JSON.generate(msg).to_s)
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
              ret = self.send("evt_#{e['name']}", *argu)
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

    def event(event_name)
      raise "Error: no block given." unless block_given?
      self.class.class_eval do
        define_method("evt_#{event_name}") { |*argu|
          yield(*argu)
        }
      end
    end

    def call_function(func_name, *argu)
      argu = argu.nil? ? [] : (argu.class == Array ? argu : [argu])
      msg = {"name" => func_name, "argu" => argu}
      return tell(msg, true).pop
    end

    def call_function_asynchronous(func_name, *argu)
      argu = argu.nil? ? [] : (argu.class == Array ? argu : [argu])
      msg = {"name" => func_name, "argu" => argu}
      tell(msg)
    end

    def method_missing(meth, *args, &blk)
      puts "method_missing : #{meth}"
    end
  end
end

module Lumilly
  class App
    attr_reader :client, :stream_client

    def initialize
      @accessor = Accessor::Socket.new
      @tweets = Lumilly::Tweets.new
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

      @mydata = @client.verify_credentials.to_h
      p @mydata[:id]
    end

    def load_config(yaml_dir)
      @config = YAML.load_file(File.expand_path(yaml_dir))
    end

    def setup_events
      this = self

      @accessor.script do
        event("open") {
          puts "opened"
          @th = nil
        }

        event("load") {
          puts "loaded"
          this.on_load()
          @th = Thread.new() {
            loop {
              puts "connecting..."
              begin
                this.stream_client.user { |res|
                  this.on_res(res)
                }
              rescue Exception => e
                puts e
              end
              sleep 5
            }
          }
        }

        event("close") {
          @th.kill if @th
          puts "closed"
        }
      end
    end

    def on_load
      @config["columns"].each { |column|
        puts @accessor.tr.call_function("create_timeline_column", column);
      }
    end

    def on_res(res)
      begin
        if res.class == Twitter::Tweet && res.to_h[:text]
          puts "#{res.created_at} #{res.user.screen_name}: #{res.text}"
          values = @tweets.add(res)
          @config["columns"].each { |column|
            check = false
            case column["pattern"]
            when "all"
              check = true
            when "mention"
              check = true if values[:in_reply_to_user_id].to_i == @mydata[:id]
            when /^contain:/
              check = true if values[:text] =~ /#{column["pattern"].gsub(/^contain:/, "")}/
            end
            @accessor.tr.call_function_asynchronous("add_tweet", column["id"], values) if check
          }
        end
      rescue Exception => e
        puts e
        puts e.backtrace.join("\n")
      end
    end

    def run
      @accessor.start
    end
  end

  class Tweets
    def initialize
      puts "loading database..."
      @db = SQLite3::Database.new("tweets.db")
      @table = [:id, :datetime, :zone, :hour, :min, :sec, :year, :mon, :mday, :user_id, :screen_name, :name, :profile_image_url, :text, :retweeted, :retweeted_id, :source, :entities, :in_reply_to_status_id, :in_reply_to_user_id]
      unless @db.execute("SELECT tbl_name FROM sqlite_master WHERE type == 'table'").flatten.include?("tweets")
        @db.execute("CREATE TABLE tweets(#{@table.join(",")})")
      end
    end

    def add(res_o)
      if res_o.class == Hash
        res = res_o
      else
        res = res_to_hash(res_o)
      end
      values = [
        res[:id],
        res[:created_at][:datetime],
        res[:created_at][:zone],
        res[:created_at][:hour],
        res[:created_at][:min],
        res[:created_at][:sec],
        res[:created_at][:year],
        res[:created_at][:mon],
        res[:created_at][:mday],
        res[:user][:id],
        res[:user][:screen_name],
        res[:user][:name],
        res[:user][:profile_image_url],
        res[:text],
        res[:retweeted_status_exist] ? 1 : 0,
        res[:retweeted_status_exist] ? res[:retweeted_status][:id] : nil,
        res[:source],
        JSON.generate(res[:entities]),
        res[:in_reply_to_status_id],
        res[:in_reply_to_user_id]
      ]
      @db.execute("INSERT into tweets values(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", values)
      values = adapt_for_json(values)
      if res[:retweeted_status_exist] && @db.execute("SELECT * FROM tweets WHERE id == #{res[:retweeted_status][:id]}").empty?
        values << add(res[:retweeted_status])
      else
        values << nil
      end
      return (@table + [:retweeted_values]).zip(values).to_h
    end

    def get(query)
      values_list = @db.execute("SELECT * FROM tweets #{query}")
      values_list = values_list.map { |values|
        values = adapt_for_json(values)
        if values[14]
          retweeted_values = @db.execute("SELECT * FROM tweets WHERE id == #{values[15]}")
          retweeted_values = adapt_for_json(retweeted_values)
          retweeted_values << nil
          values << (@table + [:retweeted_values]).zip(retweeted_values).to_h
        else
          values << nil
        end
        (@table + [:retweeted_values]).zip(values).to_h
      }
      return values_list
    end

    def get_latest(num)
      return get("ORDER BY -id LIMIT #{num}")
    end

    private
    def parse_created_at(created_at)
      created_at_obj = DateTime.strptime(created_at.to_s, "%a %b %d %X +0000 %Y").new_offset(Rational(9,24))
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

    def res_to_hash(res_o)
      res = res_o.to_h
      res[:created_at] = parse_created_at(res[:created_at])
      if res[:retweeted_status]
        res[:retweeted_status][:created_at] = parse_created_at(res[:retweeted_status][:created_at])
        res[:retweeted_status][:retweeted_status_exist] = false
        res[:retweeted_status_exist] = true
      else
        res[:retweeted_status_exist] = false
      end
      return res
    end

    def adapt_for_json(values)
      values[14] = values[14] == 1 ? true : false
      values[0] = values[0].to_s
      values[9] = values[9].to_s
      values[18] = values[18].to_s
      values[19] = values[19].to_s
      values[17] = JSON.parse(values[17])
      return values
    end
  end
end

# -- ui --

app = Lumilly::App.new
puts "load preferences..."
app.initialize_twitter("key_token.yml")
app.load_config("config.yml")
puts "setup events..."
app.setup_events
puts "running..."
app.run
