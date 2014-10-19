#概要

*Lumilly（ルミリィ）*

Twitterクライアント

現在は試作段階ですのでRubyとブラウザがあれば実行できます。(windowsでも動くかも)

#実行

* ブラウザ（Chrome推奨）
* Ruby2.0以上
* bundler
* Oauth Key

###gemのインストール

bundler のインストール

	gem install bundler

bundlerにてgemをインストール

	cd rb
	bundle install --path vendor/bundler

###Oauth key

ConsumerKey, AcccessTokenは自分で入れて下さい。

	key_token.rb

というファイルを作成し、２つ上の階層に配置してください。(`../../key_token.rb`)

ConsumerKey, AcccessTokenを取ってきて、以下のように`key_token.rb`に追加して下さい。

	CONSUMER_KEY        = "*"
	CONSUMER_SECRET     = "*"
	ACCESS_TOKEN        = "*"
	ACCESS_TOKEN_SECRET = "*"



###実行

	cd rb
	bundle exec ruby lumilly.rb

これを実行した後、ブラウザで`main.html`を開きます。

`lumilly.rb`の終了は`^C`で行なって下さい。


#ライセンス

3-clause BSD license

Copyright (c) 2013, pnlybubbles  
All rights reserved.