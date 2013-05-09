var default_templete = '\
<div class="item %aditional_class%" _id_="%id%" id_src="%id_src%">\
	<div class="item_container">\
		<div class="left_item">\
			<div class="img_wrap">\
				<div class="profile_image" style="background-image: url(\'%profile_image_url%\')">\
					<div class="retweet_img_wrap">\
						<div class="retweet_profile_image" style="%retweeted_status_style%">\
						</div>\
					</div>\
				</div>\
			</div>\
			<div class="text_wrap">\
				<div class="user_name">\
					<span class="screen_name">%screen_name%</span>\
					<span class="name">%name%</span>\
				</div>\
				<div class="text">%text%</div>\
				<div class="statuses">\
					<div class="status favorite_symbol">FAV</div>\
					<div class="status retweet_symbol">RT</div>\
				</div>\
			</div>\
		</div>\
		<div class="created_at">%created_at%</div>\
		<div class="via">%via%</div>\
	</div>\
	<div class="buttons_container">\
		<div class="buttons_wrap">\
			<div class="favorite_button action_button">Fav</div>\
			<div class="retweet_button action_button">RT</div>\
			<div class="reply_button action_button">Reply</div>\
		</div>\
	</div>\
</div>\
';
