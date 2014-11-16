#概要

*Lumilly（ルミリィ）*

Twitterクライアント

現在は試作段階です。以下の条件があれば実行できます。(Mac推奨)

#実行

* ブラウザ (Chrome推奨)
* Ruby2.0以上 (2.1.2推奨)
* bundler gem
* SQLite3 (Macだと標準で入っています)
* Oauth Key

###gemのインストール

`bundler`のインストール

	gem install bundler

`bundler`にてgemをインストール

	cd rb
	bundle install --without development --path vendor/bundler

###Oauth key

ConsumerKey, AcccessTokenは自分で入れて下さい。

	key_token.yml

という名前のファイルを作成し、`lumilly.rb`と同じ階層に配置してください。(`/rb/key_token.yml`)

ConsumerKey, AcccessTokenを取ってきて、以下のように`key_token.yml`に追加して下さい。

    consumer_key        : ******
    consumer_secret     : ******
    access_token        : ******
    access_token_secret : ******

###Lumillyの実行

###### ローカルのみの場合

	cd rb
	bundle exec ruby lumilly.rb

これを実行した後、ブラウザで`main.html`を開きます。

`lumilly.rb`の終了は`^C`で行なって下さい。

###### サーバーマシンの場合

	cd rb
	nohup bundle exec ruby lumilly.rb > /dev/null &

`lumilly.rb`の終了する時は

	ps ax | grep lumilly.rb

でPIDを調べて、`kill -s INT`でプロセスを終了する。

### インターフェースの実行

(lumilly.rbの起動は遅いため、完全に読み込みが終わってから実行してください)

###### Macの場合

`lumilly.rb`を実行し、正常に読み込みが終わると自動的にデフォルトブラウザで`main.html`が開かれます。

デフォルトブラウザがChromeでない場は、デフォルトブラウザで開かれた`main.html`を閉じてから`main.html`をChromeで開いてください。

###### Linux, Windowsの場合

`main.html`をChromeで開く。

 `lumilly.rb `をサーバーマシンで起動している場合、スプラッシュスクリーンでエラーが出るのでConfigをクリックし、IPアドレスを入力してください。

### プリファレンス

`/rb/config.yml`を編集することで、キーバインドの設定、カラムの設定ができます。

#ライセンス

3-clause BSD license

Copyright (c) 2013, pnlybubbles  
All rights reserved.