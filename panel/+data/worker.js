var ticket = ""
var wsUp = false
var ws = null
var startingWs = false;
var wsFatal = false
var wsContentResp = new Set([])
var wsContentSpecial = new Set([])

var shouldResume = false

const log = (...args) => {
    console[args[0]](`%c[WORKER ${Date.now()}]%c[${args[1]}]%c`, "color:red;font-weight:bold;", "color:purple;font-weight:bold;", "", ...args.slice(2))
}

// Custom logger for our worker
["log", "debug", "info", "warn", "error"].forEach((method) => {
    self[method] = function(...args) {
        args.unshift(method)
        log(...args)
    }
})

onmessage = function (event) {
    info("WS", "Got worker msg: ", event.data)
    if(typeof event.data === "string" || event.data instanceof String) {
        if(event.data.startsWith("ticket")) {
	    info("Ticket", "Got ticket: ", ticket)
            let tikDat = event.data.split(" ")
	    ticket = tikDat[1]
	}
    }

    if(event.data == "restart") {
        restartWs()
    } else if(event.data == "start") {
        wsStart()
    } else if(event.data == "setup true") {
	shouldResume = true
	startSetup(true)
	info("WS", "Preparing WS for resumption")
    } else if(event.data == "setup false") {
        startSetup(false)
    } else {
        wsSend(event.data, lazy=event.data.lazy || false)
    }
}

async function wsSend(data, lazy = false) {
    if(!wsUp) {
        info("Nightheart", "Waiting for ws to come up to start sending messages")
        if(!lazy) {
            wsStart()
        }
        return
    }

    if(ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(data))
    } else {
        if(!lazy) {
            restartWs()
        }
    }
}

function restartWs() {
    // Restarts websocket properly
    if(wsFatal) {
        return
    }
    info("Nightheart", "WS is not open, restarting ws")
    wsUp = false
    startingWs = false
    postMessage("down")
    wsStart()
    return
}

async function wsStart() {
    // Starts a websocket connection
    if(startingWs) {
        warn("Nightheart", "Not starting WS when already starting or critically aborted")
        return
    }

    postMessage("starting")

    startingWs = true

    // Select the client
    let cliExt = Date.now()

    ws = new WebSocket(`wss://catnip.metrobots.xyz/_panel/starclan?ticket=${ticket}&nonce=ashfur-v1&resume=${shouldResume}`)
    ws.onopen = function (event) {
        info("Nightheart", "WS connection opened. Started promise to send initial handshake")
        if(ws.readyState === ws.CONNECTING) {
            info("Nightheart", "Still connecting not sending")
            return
        }

        wsUp = true
        postMessage("up")
    }

    ws.onclose = function (event) {
        if(event.code == 4008) {
            // Token error
            error("Nightheart", "Token/Client error, requesting a login")
            wsUp = true;
            startingWs = true;
            wsFatal = true;
            postMessage("fatal")
            return
        }
	postMessage("Server unexpectedly closed connection, likely server maintenance?")
	postMessage("down")
        error("Nightheart", "WS closed due to an error", { event })
        wsUp = false
        startingWs = false
        return
    }

    ws.onerror = function (event) {
	postMessage("Server unexpectedly closed connection, likely server maintenance?")
        postMessage("down")
	error("Nightheart", "WS closed (errored) due to an error", { event })
        wsUp = false
        startingWs = false
        return
    }

    ws.onmessage = async function (event) {
	if(event.data == "NE") {
		error("Nonce expired")
		postMessage("logout")
		return
	}
        debug("Nightheart", "Got new response over ws, am decoding: ", { event })
        let data = JSON.parse(event.data)
	debug("Nightheart", "Got new WS message: ", { data })
        postMessage(data)
    }
}

async function startSetup(restartV) {
    if(!wsUp) {
        info("Nightheart", "Waiting for ws to come up to start setup")
	shouldResume = restartV
        wsStart()
        return
    }

    if(ws.readyState !== ws.OPEN) {
        if(wsFatal) {
            return
        }
        info("Nightheart", "WS is not open, restarting ws")
        wsUp = false
        startingWs = false
	shouldResume = restartV
        wsStart()
        return
    }
}
