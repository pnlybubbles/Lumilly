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
# require 'twitter'
require '../key_token.rb'

require 'pp'

$res_home = []
$res_mention = []

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

			# Twitter.configure do |config|
			#     config.consumer_key = CONSUMER_KEY
			#     config.consumer_secret = CONSUMER_SECRET
			# end

			# @twitter = Twitter::Client.new(
			#     :oauth_token => ACCESS_TOKEN,
			#     :oauth_token_secret => ACCESS_TOKEN_SECRET
			# )
		end

		def connect(&block)
			uri = URI.parse("https://userstream.twitter.com/1.1/user.json")
			https = Net::HTTP.new(uri.host, uri.port)
			https.use_ssl = true
			# https.ca_file = CERTIFICATE_PATH
			# https.verify_mode = OpenSSL::SSL::VERIFY_PEER
			https.verify_mode = OpenSSL::SSL::VERIFY_NONE
			# https.verify_depth = 5
			
			https.start do |https|
				request = Net::HTTP::Get.new(uri.request_uri)
				request.oauth!(https, @consumer, @access_token)
				buf = ""
				https.request(request) do |response|
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

		def favorite(id)
			@access_token.post("/favorites/create.json", 'id' => id.to_s)
		end
		
		def unfavorite(id)
			@access_token.post("/favorites/destroy.json", 'id' => id.to_s)
		end

		def retweet(id)
			@access_token.post("/statuses/retweet/#{id}.json")
		end

		def destroy(id)
			@access_token.post("/statuses/destroy/#{id}.json")
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

		def update(text, *id)
			if(id.empty? && id[0])
				@access_token.post('/statuses/update.json', 
				'status' => text)
			else
				@access_token.post('/statuses/update.json', 
				'status' => text, 
				'in_reply_to_status_id' => id[0])
			end
		end
	end

	class Accessor
		def initialize
			@controller = App::Controller.new
			@receiver = App::Receiver.new
			@twitter_api = App::TwitterAPI.new
			@constructor = App::Constructor.new
		end

		def initialize_data
			$my_data = @twitter_api.verify_credentials
			$res_home = @twitter_api.home_timeline(200).map { |res| @constructor.text(res) }
			$res_mention = @twitter_api.mentions_timeline(200).map { |res| @constructor.text(res) }
		end

		def server
			@sv_pid = fork do
				exec "ruby websocket_server_deamon.rb"
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
						begin
							@twitter_api.connect { |res|
								# p res
								mthd, argu = @controller.respose(res)
								command = {:method => mthd, :argu => argu}
								msg = {:server => command}
								ws_t.send(JSON.generate(msg).to_s)
							}
						rescue Exception => e
							puts "#### ERROR: #{e} ####"
						end
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
				if res['retweeted_status']
					if $my_data && res['retweeted_status']['user']['id'] == $my_data['id']
						@growl.notify("Retweet: @#{res['user']['screen_name']}", res['retweeted_status']['text'])
					end
				end
				$res_home.unshift(res)
				if $my_data && res['entities']['user_mentions'].inject([]){ |r, v| r << (v['id'] == $my_data['id']) }.index(true)
					@growl.notify("Reply: @#{res['user']['screen_name']}", res['text'])
					$res_mention.unshift(res)
				end
				res = @constructor.text(res)
				mthd = "show_tweet"
				argu = res
			when res['delete']
				
			when res['friends']
				
			when res['event']
				case res['event']
				when 'follow'
					@growl.notify("Follow", "@#{res['source']['screen_name']}\nres['source']['name']")
				when 'unfollow'

				when 'favorite'
					if $my_data && res['source']['id'] != $my_data['id']
						@growl.notify("Favorite: @#{res['source']['screen_name']}", res['target_object']['text'])
					end
					Thread.new {
						if $my_data && res['source']['id'] == $my_data['id']
							$res_home.each_with_index { |v, i|
								if v['id'] == res['target_object']['id']
									$res_home[i]['favorited'] = true
									break
								end
							}
							$res_mention.each_with_index { |v, i|
								if v['id'] == res['target_object']['id']
									$res_mention[i]['favorited'] = true
									break
								end
							}
						end
					}
					mthd = "show_favorite"
					argu = res
				when 'unfavorite'
					Thread.new {
						if $my_data && res['source']['id'] == $my_data['id']
							$res_home.each_with_index { |v, i|
								if v['id'] == res['target_object']['id']
									$res_home[i]['favorited'] = false
									break
								end
							}
							$res_mention.each_with_index { |v, i|
								if v['id'] == res['target_object']['id']
									$res_mention[i]['favorited'] = false
									break
								end
							}
						end
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
		def text(res)
			created_at = DateTime.strptime(res['created_at'].to_s, "%a %b %d %X +0000 %Y").new_offset(Rational(9,24))
			res['created_at'] = DateTime._parse(created_at.to_s)
			res['created_at'].each { |k, v|
				if v.to_s.length < 2
					res['created_at'][k] = ("00" + v.to_s)[-2,2]
				end
			}
			res['created_at'][:datetime_num] = created_at.strftime("%Y%m%d%H%M%S");
			res['created_at'][:datetime] = created_at.to_s
			res['real_created_at'] = res['created_at']
			if res['retweeted_status']
				retweeted_created_at = DateTime.strptime(res['retweeted_status']['created_at'].to_s, "%a %b %d %X +0000 %Y").new_offset(Rational(9,24))
				res['retweeted_status']['created_at'] = DateTime._parse(retweeted_created_at.to_s)
				res['retweeted_status']['created_at'].each { |k, v|
					if v.to_s.length < 2
						res['retweeted_status']['created_at'][k] = ("00" + v.to_s)[-2,2]
					end
				}
				res['retweeted_status']['created_at'][:datetime] = retweeted_created_at.to_s
				res['retweeted_status']['created_at'][:datetime_num] = retweeted_created_at.strftime("%Y%m%d%H%M%S")
				res['retweeted_status']['real_created_at'] = res['created_at']
			end
			res_tab = []
			res_tab << "timeline"
			if $my_data && res['entities']['user_mentions'].inject([]){ |r, v| r << (v['id'] == $my_data['id']) }.index(true)
				res_tab << "mention"
			end
			res[:tab] = res_tab
			return res
		end
	end

	class Receiver
		def initialize
			@twitter_api = App::TwitterAPI.new
		end

		def favorite(argu)
			@twitter_api.favorite(argu[0])
		end

		def unfavorite(argu)
			@twitter_api.unfavorite(argu[0])
		end

		def retweet(argu)
			@twitter_api.retweet(argu[0])
		end

		def destroy(argu)
			@twitter_api.destroy(argu[0])
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
			@twitter_api.update(argu[0], argu[1]);
		end

		def copy(argu)
			system("printf '#{argu[0].strip}' | pbcopy");
		end

		def home_timeline(argu)
			from = argu[0]
			num = argu[1]
			# if $res_home.length < num
			# 	func, data = home_timeline_refresh([200], func)
			# 	$res_home = data + $res_home
			# end
			return $res_home[from, num]
		end

		def home_timeline_refresh(argu)
			return @twitter_api.home_timeline(argu[0])
		end

		def mention_timeline(argu)
			from = argu[0]
			num = argu[1]
			# if $res_mention.length < num
			# 	func, data = mention_timeline_refresh([200], func)
			# 	$res_mention = data + $res_mention
			# end
			return $res_mention[from, num]
		end

		def mention_timeline_refresh(argu)
			return @twitter_api.mentions_timeline(argu[0])
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
