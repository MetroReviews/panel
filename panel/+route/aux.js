// Base WS library handlling the websocket protocol

var wsUp = false
var startingWs = false;
var wsFatal = false
var wsElevated = false

var wsCache = {}
var wsUserInfo = {}
var cachePkey = {bot: ["bots", "bot_id"]}

var callbacks = {
   "spld": (data) => {
        debug("Silverpelt", `Got a spld (server pipeline) message: ${data.e}`)
        if(data.e == "M") {
            info("SPLD", "Server is in maintenance mode. Alerting user to this")
            alert("maint", "Maintenance", "Metro Reviews is now down for maintenance, certain actions may be unavailable during this time!")
        } else if(data.e == "MP") {
            info("Silverpelt", "Server says we do not have the required permissions")
        	loadService("/missingperms")
   	} else if(data.e == "OD") {
            info("Silverpelt", "Client out of date.")
            wsFatal = true
            alert("nonce-err", "Hmmm...", "Your client is a bit out of date. Consider refreshing your page?")
        } else if(data.e == "U") {
            info("Silverpelt", "Unsupported action")
            alert("nonce-err", "Whoa!", "This action is not quite supported at this time")
        } else if(data.e == "P") {
            debug("Silverpelt", "Ping event. Going home...")
            $("#nav").text(`Websocket still connected as of ${Date()}`)
        } 
    },
    "@me": (data) => {
	info("Dispatcher", "Got @me data, applying to wsUserInfo")
	wsUserInfo = data.member
    },
    "event_keys": (data) => {
	info("Dispatcher", "Got event keys, applying to cachePkey")
	cachePkey = data.keys
    },
    "large_dispatch": (data) => {
	let pk = cachePkey[data.n]
	wsCache[pk[0]] = new Map();
	setStatus(`Loading ${data.count} ${pk[0]}...`)
    },
    "end_large_dispatch": (data) => {
	let pk = cachePkey[data.n]
	setStatus(`Loaded ${wsCache[pk[0]].size} ${pk[0]}. Waiting for server to dispatch more`)
    },
    "dispatch": (data) => {
	info("Dispatcher", "Got batch dispatch. Applying to cache...")
	let cacheKey = cachePkey[data.n]
	data.batch.forEach((e) => {
		wsCache[cacheKey[0]].set(e[cacheKey[1]], e)
	})
    },
    "ready": (data) => {
	info("Dispatcher", "Got ready event, calling service")
	initPanel()
    },
    "conn_elevated": (data) => {
	info("Dispatcher", "Got conn_elevated event")
	wsElevated = true
    }
}

// Load in web worker
var _worker = new Worker(`${currentPathInfo.data}/worker.min.js?v=12`)
_worker.onmessage = function (event) {
    if(typeof event.data === "string" || event.data instanceof String) {
        if(event.data == "fatal") {
            wsFatal = true
	    restartWsUntilUp()
        } else if(event.data == "starting") {
            startingWs = true
        } else if(event.data == "up") {
            wsUp = true
        } else if(event.data == "down") {
            wsUp = false
            startingWs = false
	    restartWsUntilUp()
        } else if(event.data == "logout") {
	    $rump.clearState()
	    window.location.href = "/"
	} else {
            warn("Message", event.data)
	    alert(event.data)
        }
    } else {
        // Its then a ws message
	info("Got ws message", event.data)
        f = callbacks[event.data.resp]
        if(f) {
            f(event.data)
        } else {
	    warn("Unknown ws event", event.data.resp)
	}
    }
}

function restartWsUntilUp() {
	if(wsUp || startingWs || restartCalled) {
		return
	}
	info("WS", "Attempting to reconnect to ws")

	_c = setInterval(async () => {
		if(wsUp || startingWs) {
			restartCalled = false
			clearInterval(_c)
			return
		}
		await startSetup()
	}, 3000)
}

async function wsSend(data, lazy = false) {
    data.lazy = lazy
    info("WS", "Sending {ws}")
    _worker.postMessage(data)
}

async function restartWs() {
    if(!$rump.state.token) {
        return
    } else {
        await _worker.postMessage(`ticket ${$rump.state.token}`)
    }

    _worker.postMessage("restart")
}

async function wsStart() {
    if(!$rump.state.token) {
        return
    } else {
        await _worker.postMessage(`ticket ${$rump.state.token}`)
    }

    _worker.postMessage("start")
}

// Setup ws
async function startSetup() {
    if(!$rump.state.token) {
	return
    } else {
	await _worker.postMessage(`ticket ${$rump.state.token}`)
    }
    _worker.postMessage("setup")
}

setTimeout(startSetup, 100)
