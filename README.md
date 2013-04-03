#概要

Mac用 Twitter Client

他のプラットフォームへの移植も検討中。

#ファイル

###html, css, js  
開発中のTwitter ClientのUI

###websocket_server_deamon.rb
WebSocketサーバー

###websocket_server_with_handler_client.rb
Twitter Clientとしてのハンドリングクライアント  
websocket_server_deamon.rbを起動し、UIからのコマンドをWebsocketから取得し実行する。  
(AppDelegate.rb)


#ライセンス

3-clause BSD license

Copyright (c) 2013, pnlybubbles  
All rights reserved.