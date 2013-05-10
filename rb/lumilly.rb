# encoding: utf-8

require 'faye/websocket'
require 'thread'
require 'net/https'
require 'oauth'
require 'cgi'
require 'json'
require 'openssl'
require 'date'
require 'daemons'
require 'twitter'
require_relative '../../key_token.rb'

require 'pp'

$res_home = []
$res_mention = []
$res_tab = {}

module App
	class TwitterAPI
		def initialize
			@consumer = OAuth::Consumer.new(
			CONSUMER_KEY,
			CONSUMER_SECRET,
			:site => 'http://api.twitter.com/1.1'
			)

			@access_token = OAuth::AccessToken.new(
			@consumer,
			ACCESS_TOKEN,
			ACCESS_TOKEN_SECRET
			)
		end

		def connect(&block)
			uri = URI.parse("https://userstream.twitter.com/1.1/user.json")
			https = Net::HTTP.new(uri.host, uri.port)
			https.use_ssl = true
			# https.ca_file = CERTIFICATE_PATH
			# https.verify_mode = OpenSSL::SSL::VERIFY_PEER
			https.verify_mode = OpenSSL::SSL::VERIFY_NONE
			# https.verify_depth = 5
			
			https.start do |session|
				request = Net::HTTP::Get.new(uri.request_uri)
				request.oauth!(session, @consumer, @access_token)
				buf = ""
				session.request(request) do |response|
					response.read_body do |chunk|
						buf << chunk
						while(line = buf[/.*(\r\n)+/m])
							begin
								buf.sub!(line,"")
								line.strip!
								status = JSON.parse(line)
							rescue
								break
							end
							block.call(status)
						end
					end
				end
			end
		end

		def verify_credentials
			return JSON.parse(@access_token.get("/account/verify_credentials.json").body)
		end

		def home_timeline(count)
			return JSON.parse(@access_token.get("/statuses/home_timeline.json?count=#{count}").body)
		end

		def mentions_timeline(count)
			return JSON.parse(@access_token.get("/statuses/mentions_timeline.json?count=#{count}").body)
		end
	end

	class Accessor
		def initialize
			@controller = App::Controller.new
			@receiver = App::Receiver.new
			@twitter_api = App::TwitterAPI.new
			@constructor = App::Constructor.new
			@config = App::Config.new
			@config.load
		end

		def initialize_data
			$my_data = @twitter_api.verify_credentials
			# $res_home = @twitter_api.home_timeline(200).map { |res| @constructor.text(res) }
			@twitter_api.home_timeline(200).each { |res| @constructor.text(res) }
			# $res_mention = @twitter_api.mentions_timeline(200).map { |res| @constructor.text(res) }
			@twitter_api.mentions_timeline(200).each { |res| @constructor.text(res) }
			$res_home.sort!{ |a, b| b["id"] <=> a["id"] }
			$res_mention.sort!{ |a, b| b["id"] <=> a["id"] }
			# p $res_tab
		end

		def server
			@sv_pid = fork do
				exec "ruby websocket_server_daemon.rb"
			end

			@sv = Process.detach(@sv_pid)
		end

		def stop_server
			@sv.exit
		end

		def client
			EM.run {
				ws = Faye::WebSocket::Client.new('ws://localhost:60000/')

				ws.onopen = lambda do |event|
					p [:open]

					Thread.new(ws) { |ws_t|
						loop {
							begin
								@twitter_api.connect { |res|
									# p res
									mthd, argu = @controller.respose(res)
									command = {:method => mthd, :argu => argu}
									msg = {:server => command}
									ws_t.send(JSON.generate(msg).to_s)
								}
							rescue Exception => e
								exit 1 if e.to_s == ""
								puts "#### ERROR: #{e} ####"
							end
						}
					}
				end

				ws.onmessage = lambda do |event|
					# p [:message, event.data]
					event_data = JSON.parse(event.data)
					from = event_data.keys[0]
					if from == "client"
						p [:message, event.data]
						data = event_data["#{from}"]
						Thread.new(ws) { |ws_t|
							begin
								argu = @receiver.send(data["method"], data["argu"]);
								mthd = data["callback"];
								if mthd && argu
									command = {:method => mthd, :argu => argu}
									msg = {:server => command}
									ws_t.send(JSON.generate(msg).to_s)
								end
							rescue Exception => e
								puts "#### ERROR: #{e} ####"
							end
						}
					end
				end

				ws.onclose = lambda do |event|
					p [:close, event.code, event.reason]
					ws = nil
				end

				puts "==== client is running"
			}
		end
	end

	class Config
		@@config = {}

		def load
			@@config = {
				'general' => {
					'mini_view' => true,
					'timeline_item_limit' => 500
				},
				'tab' => []
			}

			if File.exist?("config.json")
				open("config.json") do |io|
					@@config = JSON.load(io)
				end
			end
		end

		def root
			return @@config
		end

		def method_missing(meth, *args, &blk)
			if args.empty?
				return @@config[meth.to_s]
			else
				return @@config[meth.to_s] = args[0]
			end
		end
	end

	class Controller
		def initialize
			@growl = App::Growl.new
			@constructor = App::Constructor.new
		end

		def respose(res)
			mthd = nil
			argu = res

			case
			when res['text']
				res = @constructor.text(res)
				if res['retweeted_status']
					if $my_data && res['retweeted_status']['user']['id'] == $my_data['id']
						@growl.notify("Retweet: @#{res['user']['screen_name']}", res['retweeted_status']['text'])
					end
				elsif $my_data && res['entities']['user_mentions'].inject([]){ |r, v| r << (v['id'] == $my_data['id']) }.index(true)
					@growl.notify("Reply: @#{res['user']['screen_name']}", res['text'])
					# $res_mention.unshift(res)
				end
				# $res_home.unshift(res)
				mthd = "show_tweet"
				argu = res
			when res['delete']
				
			when res['friends']
				
			when res['event']
				case res['event']
				when 'follow'
					@growl.notify("Follow: @#{res['source']['screen_name']}", res['source']['name'])
				when 'unfollow'

				when 'favorite'
					if $my_data && res['source']['id'] != $my_data['id']
						@growl.notify("Favorite: @#{res['source']['screen_name']}", res['target_object']['text'])
					end
					Thread.new {
						@constructor.update_favorited(res, true)
					}
					mthd = "show_favorite"
					argu = res
				when 'unfavorite'
					Thread.new {
						@constructor.update_favorited(res, false)
					}
					mthd = "hide_favorite"
					argu = res
				else
					
				end
			else

			end

			return mthd, argu
		end
	end

	class Constructor
		def initialize
			@config = App::Config.new
		end

		def text(res)
			res[:tab] = []
			res[:tab] << "timeline"
			created_at = DateTime.strptime(res['created_at'].to_s, "%a %b %d %X +0000 %Y").new_offset(Rational(9,24))
			res['created_at'] = DateTime._parse(created_at.to_s)
			res['created_at'].each { |k, v|
				if v.to_s.length < 2
					res['created_at'][k] = ("00" + v.to_s)[-2,2]
				end
			}
			res['created_at'][:datetime] = created_at.to_s
			if res['retweeted_status']
				retweeted_created_at = DateTime.strptime(res['retweeted_status']['created_at'].to_s, "%a %b %d %X +0000 %Y").new_offset(Rational(9,24))
				res['retweeted_status']['created_at'] = DateTime._parse(retweeted_created_at.to_s)
				res['retweeted_status']['created_at'].each { |k, v|
					if v.to_s.length < 2
						res['retweeted_status']['created_at'][k] = ("00" + v.to_s)[-2,2]
					end
				}
				res['retweeted_status']['created_at'][:datetime] = retweeted_created_at.to_s
				if res['user']['id'] == $my_data['id']
					res['retweeted'] = true
					res['retweeted_status']['retweeted'] = true
				end
			elsif $my_data && res['entities']['user_mentions'].inject([]){ |r, v| r << (v['id'] == $my_data['id']) }.index(true)
				res[:tab] << "mention"
			end
			@config.tab.each { |tab_config|
				if res['text'] =~ Regexp.new(tab_config['regexp'])
					res[:tab] << tab_config['bundle']
				end
			}
			res[:tab].each { |tab|
				if tab == "mention"
					$res_mention.unshift(res)
				elsif tab != "timeline"
					$res_tab[tab] = [] unless $res_tab.key?(tab)
					$res_tab[tab].unshift(res)
				end
			}
			$res_home.unshift(res)
			return res
		end

		def update_favorited(res, boolean)
			if $my_data && res['source']['id'] == $my_data['id']
				$res_home.each_with_index { |v, i|
					if v['id'] == res['target_object']['id']
						$res_home[i]['favorited'] = boolean
						break
					end
				}
				$res_mention.each_with_index { |v, i|
					if v['id'] == res['target_object']['id']
						$res_mention[i]['favorited'] = boolean
						break
					end
				}
			end
		end
	end

	class Receiver
		def initialize
			@twitter_api = App::TwitterAPI.new
			@constructor = App::Constructor.new
			@config = App::Config.new

			Twitter.configure do |config|
			    config.consumer_key = CONSUMER_KEY
			    config.consumer_secret = CONSUMER_SECRET
			end

			@api = Twitter::Client.new(
			    :oauth_token => ACCESS_TOKEN,
			    :oauth_token_secret => ACCESS_TOKEN_SECRET
			)
		end

		def configure(argu)
			return @config.root
		end

		def favorite(argu)
			@api.favorite(argu[0])
		end

		def unfavorite(argu)
			@api.unfavorite(argu[0])
		end

		def retweet(argu)
			@api.retweet(argu[0])
		end

		def destroy(argu)
			@api.status_destroy(argu[0])
		end

		def verify_credentials(argu)
			if $my_data
				return $my_data
			else
				return verify_credentials_refresh(argu)
			end
		end

		def verify_credentials_refresh(argu)
			$my_data = @twitter_api.verify_credentials
			return $my_data
		end

		def update(argu)
			if argu[1]
				@api.update(argu[0], {:in_reply_to_status_id => argu[1]})
			else
				@api.update(argu[0])
			end
		end

		def update_with_media(argu)
			img_base64 = argu[2].match(/base64,(?<base>.*)$/)[:base]
			file_name = "img" + argu[1][/\.[^\.]+$/]
			File.binwrite(file_name, img_base64.unpack('m')[0])
			if argu[3]
				@api.update_with_media(argu[0], File.new(file_name), {:in_reply_to_status_id => argu[3]})
			else
				@api.update_with_media(argu[0], File.new(file_name))
			end
			File.delete(file_name)
		end

		def copy(argu)
			system("printf '#{argu[0].strip}' | pbcopy");
		end

		def home_timeline(argu)
			from = argu[0]
			num = argu[1]
			return $res_home[from, num]
		end

		def mention_timeline(argu)
			from = argu[0]
			num = argu[1]
			return $res_mention[from, num]
		end

		def tab_timeline(argu)
			tab_bundle = argu[0]
			from = argu[1]
			num = argu[2]
			if $res_tab.key?(tab_bundle)
				return $res_tab[tab_bundle][from, num]
			else
				return []
			end
		end

		def filter_timeline(argu)
			from = argu[0]
			num = argu[1]
			filter = argu[2]
			return_data = []
			$res_home.each_with_index { |res, i|
				next if i < from
				break if i > from + num - 1
				if res['text'] =~ /#{filter}/
					return_data << res
				end
			}
			return return_data
		end
	end

	class Growl
		def notify(title, text)
			system("growlnotify -m '#{text}' -t '#{title}'")
			# system("notify-send -t 5000 '#{title}' '#{text}'")
		end
	end
end

puts "==== #{DateTime.now}"
puts "==== constructing instance"
luminous = App::Accessor.new
luminous.initialize_data
luminous.server

Signal.trap(:INT){
puts puts "==== stopping server"
	luminous.stop_server
	exit(0)
}

puts "==== server is running"
sleep 1
luminous.client
