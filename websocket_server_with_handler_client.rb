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
			uri = URI.parse("https://userstream.twitter.com/2/user.json")
			https = Net::HTTP.new(uri.host, uri.port)
			https.use_ssl = true
			#https.ca_file = CERTIFICATE_PATH
			https.verify_mode = OpenSSL::SSL::VERIFY_PEER
			https.verify_depth = 5
			
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

		def update(text, *id)
			if(! id.empty?)
				@access_token.post('/statuses/update.json', 
				'status' => text, 
				'in_reply_to_status_id' => id[0])
			else
				@access_token.post('/statuses/update.json', 
				'status' => text)
			end
		end
	end

	class WebSocket
		attr_accessor :q

		def initialize
			@q = Queue.new
			@controller = App::Controller.new
			@receiver = App::Receiver.new
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
						App::TwitterAPI.new.connect { |res|
							mthd, argu = @controller.respose(res)
							command = {:method => mthd, :argu => argu}
							msg = {:server => command}
							ws_t.send(JSON.generate(msg).to_s)
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
						Thread.new {
							begin
								puts data["method"], data["argu"]
								@receiver.send(data["method"], data["argu"]);
							rescue Exception => e
								puts "#### #{e} ####"
							end
						}
					end
				end

				ws.onclose = lambda do |event|
					p [:close, event.code, event.reason]
					ws = nil
				end
			}
		end
	end

	class Controller
		def respose(res)
			mthd = nil
			argu = res

			case
			when res['text']
				created_at = DateTime.strptime(res['created_at'].to_s, "%a %b %d %X +0000 %Y").new_offset(Rational(9,24))
				res['created_at'] = DateTime._parse(created_at.to_s)
				res['created_at'].each { |k, v|
					if v.to_s.length < 2
						res['created_at'][k] = ("00" + v.to_s)[-2,2]
					end
				}
				res['created_at'][:datetime] = created_at.to_s
				if(res['retweeted_status'])
					retweeted_created_at = DateTime.strptime(res['retweeted_status']['created_at'].to_s, "%a %b %d %X +0000 %Y").new_offset(Rational(9,24))
					res['retweeted_status']['created_at'] = DateTime._parse(retweeted_created_at.to_s)
					res['retweeted_status']['created_at'].each { |k, v|
						if v.to_s.length < 2
							res['retweeted_status']['created_at'][k] = ("00" + v.to_s)[-2,2]
						end
					}
					res['retweeted_status']['created_at'][:datetime] = retweeted_created_at.to_s
				end
				mthd = "show_tweet"
				argu = res
			when res['delete']
				
			when res['friends']
				
			when res['event']
				case res['event']
				when 'follow'
					
				when 'unfollow'

				when 'favorite'
					
				when 'unfavorite'

				else
					
				end
			else

			end

			return mthd, argu
		end
	end

	class Receiver
		def initialize
			@twitter_api = App::TwitterAPI.new
		end

		def favorite(argu)
			id = argu[0]
			@twitter_api.favorite(id)
		end

		def unfavorite(argu)
			id = argu[0]
			@twitter_api.unfavorite(id)
		end

		def retweet(argu)
			id = argu[0]
			@twitter_api.retweet(id)
		end

		def destroy(argu)
			id = argu[0]
			@twitter_api.destroy(id)
		end
	end
end

puts "==== #{DateTime.now}"
luminous = App::WebSocket.new
luminous.server

Signal.trap(:INT){
puts "Stoping Server"
	luminous.stop_server
	exit(0)
}

puts "==== server is running"
sleep 1
luminous.client
