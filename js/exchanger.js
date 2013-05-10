/*
WebSocket functions
send method
tell method
*/

//=========================
// websocket
//=========================

var ws;

function load_websocket () {
	ws = new WebSocket("ws://localhost:60000/");
	ws.onopen = function() { on_open(); };
	ws.onmessage = function(evt) { on_message(evt); };
	ws.onclose = function() { on_colse(); };
}

function on_open () {
	console.log("socket opened");
	tell("configure", null, "set_config");
	tell("verify_credentials", null, "set_my_data");
	tell("home_timeline", [0, 200], "fill_timeline");
	tell("mention_timeline", [0, 50], "fill_timeline");
}

function on_colse () {
	console.log("socket closed");
}

function on_message (evt) {
	var req = JSON.parse(evt.data);
	// console.log(req);
	if(req.server) {
		var data = req.server;
		if(data !== undefined) {
			send(data.method, data.argu);
		}
	}
}


//=========================
// methods exchanger
//=========================

// send
// call "methods"s method with argument

function send (method, argu) {
	var callback_method = false;
	if(method == parseInt(method, 10) && callback_queue.id.length > 0) {
		console.log(JSON.stringify(callback_queue));
		if(callback_queue.id[0] != method) {
			setTimeout(function() {
				console.log("callback id: " + method);
				console.log("callback queue: " + callback_queue.func[callback_queue.id.indexOf(method)]);
				send(method, argu);
			}, 1000);
			return;
		} else {
			method = callback_queue.func[0];
			callback_method = true;
		}
	}
	// if not callback method and not standby, send in queue
	if(!(callback_method) && callback_queue.id.length > 0) {
		setTimeout(function() {
			// console.log("not standby: " + method);
			send(method, argu);
		}, 100000);
		return;
	}
	// send method
	// console.log(method + ":start");
	if(methods[method] === undefined) {
		method_missing(method, argu);
	} else {
		if(argu === undefined) {
			methods[method]();
		} else {
			methods[method](argu);
		}
	}
	// remove queue
	// console.log(method + ":end");
	if(callback_method) {
		callback_queue.id.shift();
		callback_queue.func.shift();
		console.log(JSON.stringify(callback_queue));
	}
}


// methods method_missing
// called when methods do not have sended method

function method_missing (method, argu) {
	console.log({
		"method_missing": method,
		"argu": argu
	});
}


// tell method
// send method and argument to ruby client

var callback_queue = {
	"func" : [],
	"id" : []
};

function tell (method, argu, func) {
	if(!(argu instanceof Array)) {
		argu = [argu];
	}
	var callback_id = null;
	if(func !== undefined) {
		callback_id = String(Math.ceil(Math.random() * 1000000000));
		callback_queue.func.push(func);
		callback_queue.id.push(callback_id);
	}
	command = {"method": method, "argu": argu, "callback": callback_id};
	console.log(command);
	ws.send(JSON.stringify({"client": command}));
}
