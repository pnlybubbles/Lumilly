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
