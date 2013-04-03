# encoding: utf-8

require 'em-websocket'

EM.run {
	@channel = EM::Channel.new

	EM::WebSocket.start(:host => "localhost", :port => 60000) do |ws|
		sid = nil

		ws.onopen {
			sid = @channel.subscribe { |msg| ws.send msg }
			# puts "#{sid} is now online."
			# @channel.push "#{sid} is now online."
		}

		ws.onmessage { |msg|
			# puts "#{sid}: #{msg}"
			@channel.push(msg)
		}

		ws.onclose {
			# puts "#{sid} is now offline."
			# @channel.push "#{sid} is now offline."
			@channel.unsubscribe(sid)
		}
	end
}