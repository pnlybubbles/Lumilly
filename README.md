#概要

*Lumilly（ルミリィ）*

Twitterクライアント

現在は試作段階ですのでRubyとブラウザがあれば実行できます。(windowsを除く)

#ファイル

###css

タイムラインのUIを構成するスタイルシートが含まれる。

###js

タイムラインのUI処理を行うスクリプトが含まれる。`libs`フォルダ内は利用されるライブラリを含む。

###rb

* lumilly.rb ---- TwitterAPIよりデータを取得し、WebSocketを介してUIの制御を行う。

* websocket_server_daemon.rb ---- WebSocketサーバー

* websocket_server_with_handler_client_no_faye.rb ---- Windows向けにfaye-websocketを利用せずにlumilly.rbを移植したもの。（不安定かつ更新は行われない）

###main.html

タイムラインのUIを構成する。

#実行

* ブラウザ（Chrome推奨）
* Ruby1.9.3以上
* 前提gem（4つ）
* Oauth Key

###gemのインストール

	gem install twitter oauth daemons faye-websocket em-websocket

(windowsの場合`faye-websocket`のインストールができません。)

###Oauth key

ConsumerKey, AcccessTokenは自分で入れて下さい。

	key_token.rb

というファイルを作成し、rb直下に配置してください。(`./rb/key_token.rb`)

ConsumerKey, AcccessTokenを取ってきて、以下のように`key_token.rb`に追加して下さい。

	CONSUMER_KEY        = "*"
	CONSUMER_SECRET     = "*"
	ACCESS_TOKEN        = "*"
	ACCESS_TOKEN_SECRET = "*"



###実行
  cd ./rb
	ruby lumilly.rb

これを実行した後、ブラウザで`main.html`を開きます。

`lumilly.rb`の終了は`^C`で行なって下さい。


#ライセンス

3-clause BSD license

Copyright (c) 2013, pnlybubbles
Copyright (c) 2014, alphaKAI
All rights reserved.
