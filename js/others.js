/*
other methods
*/


// replace_with method

String.prototype.replace_with = function(obj) {
	var str = this;
	for(var key in obj) {
		str = str.replace(new RegExp(key, "g"), obj[key]);
	}
	return str;
};


// match_all method

String.prototype.match_all = function(exp) {
	var str = this;
	var arr = [];
	while(1) {
		matched = str.match(exp);
		if(matched) {
			arr.push(matched);
			str = str.replace(exp, "");
		} else {
			break;
		}
	}
	return arr;
};


// unique method

Array.prototype.unique = function() {
	var o = {}, i, l = this.length, r = [];
	for (i = 0; i < l; i += 1) o[this[i]] = this[i];
	for (i in o) r.push(o[i]);
	return r;
};

Array.prototype.diff = function(a) {
	var r = [];
	for(var i = 0; i < this.length; i++) {
		if(a.indexOf(this[i]) == -1) {
			r.push(this[i]);
		}
	}
	return r;
};

// return last or fisrt element method

Array.prototype.first = function() {
	return this[0];
};

Array.prototype.last = function() {
	return this[this.length - 1];
};


// calculate absolute value faster

function abs (x) {
	return (x ^ (x >> 31)) - (x >> 31);
}


// anescape html method

function html_anescape(text) {
	return text.replace_with({
		"&amp;" : "&",
		"&gt;" : ">",
		"&lt;" : "<",
		"&quot;" : "\"",
		"&apos;" : "'"
	});
}


// compare big integer over 52bit by string
// a >= b => true

function compareId(a, b) {
	aa = parseInt(a.slice(-9), 10);
	ab = parseInt(a.slice(0, -9), 10);
	ba = parseInt(b.slice(-9), 10);
	bb = parseInt(b.slice(0, -9), 10);
	if(ab > bb) {
		return true;
	} else if(ab == bb || (isNaN(ab) === true && isNaN(bb) === true)) {
		if(aa >= ba) {
			return true;
		} else {
			return false;
		}
	} else if(isNaN(ab) === false && isNaN(bb) === true) {
		return true;
	} else {
		return false;
	}
}


// check twitter update count

function check_update_count (text, media_boolean) {
	var diff_count = 0;
	$.each(text.match_all(url_regexp), function(i, matched) {
		diff_count += 22 - matched[2].length;
		if(matched[2].match(/https/)) {
			diff_count += 1;
		}
	});
	if(media_boolean) {
		diff_count += 23;
	}
	return text.length + diff_count;
}


// regexp matching urls

var url_regexp = new RegExp("(^|[^\\w])(https?://(([\\w]|[^ -~])+(([\\w\\-]|[^ -~])+([\\w]|[^ -~]))?\\.)+(aero|asia|biz|cat|com|coop|edu|gov|info|int|jobs|mil|mobi|museum|name|net|org|pro|tel|travel|xxx|ac|ad|ae|af|ag|ai|al|am|an|ao|aq|ar|as|at|au|aw|ax|az|ba|bb|bd|be|bf|bg|bh|bi|bj|bm|bn|bo|br|bs|bt|bv|bw|by|bz|ca|cc|cd|cf|cg|ch|ci|ck|cl|cm|cn|co|cr|cs|cu|cv|cx|cy|cz|dd|de|dj|dk|dm|do|dz|ec|ee|eg|eh|er|es|et|eu|fi|fj|fk|fm|fo|fr|ga|gb|gd|ge|gf|gg|gh|gi|gl|gm|gn|gp|gq|gr|gs|gt|gu|gw|gy|hk|hm|hn|hr|ht|hu|id|ie|il|im|in|io|iq|ir|is|it|je|jm|jo|jp|ke|kg|kh|ki|km|kn|kp|kr|kw|ky|kz|la|lb|lc|li|lk|lr|ls|lt|lu|lv|ly|ma|mc|md|me|mg|mh|mk|ml|mm|mn|mo|mp|mq|mr|ms|mt|mu|mv|mw|mx|my|mz|na|nc|ne|nf|ng|ni|nl|no|np|nr|nu|nz|om|pa|pe|pf|pg|ph|pk|pl|pm|pn|pr|ps|pt|pw|py|qa|re|ro|rs|ru|rw|sa|sb|sc|sd|se|sg|sh|si|sj|sk|sl|sm|sn|so|sr|ss|st|su|sv|sy|sz|tc|td|tf|tg|th|tj|tk|tl|tm|tn|to|tp|tr|tt|tv|tw|tz|ua|ug|uk|us|uy|uz|va|vc|ve|vg|vi|vn|vu|wf|ws|ye|yt|za|zm|zw)(?![\\w])(/([\\w\\.\\-\\$&%/:=#~!]*\\??[\\w\\.\\-\\$&%/:=#~!]*[\\w\\-\\$/#])?)?)", "i");
