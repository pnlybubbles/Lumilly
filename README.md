#概要

Mac用 Twitter Client

他のプラットフォームへの移植も検討中。

今は試作段階ですのでRubyとブラウザがあれば実行できます。(windowsを除く)

#ファイル

###html, css  
Twitter ClientのUI

###js
Twitter ClientのUIのコントロール、ハンドリングクライアントからのデータの表示


###websocket_server_deamon.rb
WebSocketサーバー

###websocket_server_with_handler_client.rb
Twitter Clientとしてのハンドリングクライアント  
`websocket_server_deamon.rb`を起動し、UIからのコマンドをWebsocketから取得し実行する。  
(AppDelegate.rb)

#実行

* ブラウザ
* Ruby1.9.3以上
* 前提gem(4つ)

###gemのインストール

	gem install oauth daemons faye-websocket em-websocket

(windowsだと`faye-websocket`のインストールができません。)

###実行

	ruby websocket_server_daemon.rb

これを実行した後、ブラウザで`websocket_timeline_test.html`を開く。

`websocket_server_daemon.rb`の終了は`^C`で行なって下さい。


#ライセンス

3-clause BSD license

Copyright (c) 2013, pnlybubbles  
All rights reserved.