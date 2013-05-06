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

function compareId(a, b) {
	aa = parseInt(a.slice(-9), 10);
	ab = parseInt(a.slice(0, -9), 10);
	ba = parseInt(b.slice(-9), 10);
	bb = parseInt(b.slice(0, -9), 10);
	if(ab > bb) {
		return true;
	} else if(ab == bb) {
		if(aa >= ba) {
			return true;
		} else {
			return false;
		}
	} else {
		return false;
	}
}
