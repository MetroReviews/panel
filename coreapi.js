// Global variables

// Must be exposed in service.js
var service = () => {

}
var title = null

// Exposed by loadService
var currentPathInfo = null;

// alert
let alerts = []
let intervals = []

// Session class (login etc)

// session (not just state data

class Session {
	constructor() {
		if(localStorage.session) {
			try {
				this._state = JSON.parse(localStorage.session)
			} catch {
				this._state = {}
			}
		} else {
			this._state = {}
		}
		
		this._h = {
			get: (obj, i) => {
				return this._state[i] || undefined
			},
			set: (obj, i, v) => {
				this._state[i] = v
                		localStorage.session = JSON.stringify(this._state)
			}
		}

		this.state = new Proxy({}, this._h);
	}

	getState() {
		return this._state
	}

	clearState() {
		localStorage.session = "{}"
		this._state = "{}"
	}
}

var $rump = new Session()

// APIs
const log = (...args) => {
	console[args[0]](`%c[MAIN ${Date.now()}]%c[${args[1]}]%c`, "color:red;font-weight:bold;", "color:purple;font-weight:bold;", "", ...args.slice(2))
}

// Custom logger
["log", "debug", "info", "warn", "error"].forEach((method) => {
    self[method] = function(...args) {
        args.unshift(method)
        log(...args)
    }
})

// Simple polyfill for promisify and sleep
const promisify = f => (...args) => new Promise((a,b)=>f(...args, (err, res) => err ? b(err) : a(res)));
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Public API to try returning data
function tryReturn(f, ...args) {
	try { 
        	return f(...args) 
	} catch (err) {
        	console.error(err)
        	console.error("coreapi.js failed with a critical error")
	}
}

// Public API to replace current url without reload, pass empty string to use currentPathInfo.url
function setAddressBar(url = "") {
	window.history.replaceState({"prev": window.location.href}, "Panel", url || currentPathInfo.url);
}

// Public API to send critical errors
function error(...args) {
	console.error(...args)
	alert(...args)
}

// Public API to set status
function setStatus(text) {
	document.querySelector("#status").innerHTML = marked.marked(text)
}

// Public API to set main body, special variables are unwrapped as well
// $n => unwraps to a nonce
// $data => unwraps to ``currentPathInfo.data``
function setBody(text) {
	let n = Math.floor(Math.random() * 100000);
        document.querySelector("#body").innerHTML = marked.marked(text.replaceAll("$data", currentPathInfo.data).replaceAll("$n", n))
	setStatus("")
}

// Public API to run code on ready
function ready(callback){
    // in case the document is already rendered
    if (document.readyState!='loading') callback();
    // modern browsers
    else if (document.addEventListener) document.addEventListener('DOMContentLoaded', callback);
    // IE <= 8
    else document.attachEvent('onreadystatechange', function(){
        if (document.readyState=='complete') callback();
    });
}

// Global eval API
function globalEval(text) { 
	(1, eval)(text); 
};

// Get path info API
function getPathInfo(path) {
	console.log(`getPathInfo: ${path}`)
	if(path.startsWith("https://")) {
		path = path.replace(window.location.origin, "")
	}

	if(path == "/" || !path) {
		path = ""
	} else {
		if(!path.startsWith("/")) {
			path = `/${path}` 
		}
	
		if(path.endsWith("/")) {
			path = path.slice(0, -1);
		}
	}

	return {
		service: `${path}/+route/service.min.js`,
		aux: `${path}/+route/aux.min.js`, // Auxillary data
		data: `${path}/+data`,
		url: path
	}
}

// _loadFetch API tries fetching a path
async function _loadFetch(path, critical) {
        // Avoid caching
        let n = Math.floor(Math.random() * 10000);

	let jsServiceResp = await tryReturn(fetch, `${path}?n=${n}`)

        if(!jsServiceResp || !jsServiceResp.ok) {
		if(critical) {
                	error(`loadService error: could not load ${path}`)
		}
                return;
        }

        return await jsServiceResp.text();
}

// Internal API to modify links
function _linkMod() {
    links = document.querySelectorAll("a")
    links.forEach(link => {
        console.debug("[Sparkpelt]", link, link.href, link.hasPatched, link.hasPatched == undefined)
        if(link.href.startsWith(`${window.location.origin}/`) && link.hasPatched == undefined) {
            if(link.href == `${window.location.origin}/#`) {
                return // Don't patch # elements
            } 
	    if(link.href.includes("+data")) {
		return // Don't patch internal '+data' routes
	    }
            if(link.href == window.location.href || link.href.endsWith("#") || link.pathname == window.location.pathname) {
                return // Don't patch if same url
            }

            link.hasPatched = true
            console.debug("[Sparkpelt] Add patch")
            link.addEventListener('click', event => {
                if ( event.preventDefault ) event.preventDefault();
                // Now add some special code
                window.history.pushState(window.location.pathname, 'Loading...', link.href);
                handler = async () => {
                    $(".active").toggleClass("active")
                    await loadService(link.href)
                }

                handler()
            })
        }
    })
}


// loadService API
async function loadService(path) {
	let pathInfo = getPathInfo(path)

	currentPathInfo = pathInfo

	setStatus("Loading service [aux.js]")

	// Load aux.js
        let jsAux = await _loadFetch(pathInfo.aux, false)

        if(jsAux) {
		globalEval(jsAux)
        }

	setStatus("Loading service [service.js]")

	// Load service.js
	let jsService = await _loadFetch(pathInfo.service, true)
	
	if(!jsService) {
		return -1;
	}

	service = null; // Reset service
	title = null

	globalEval(jsService);

	if(!service) {
		error(`loadService error: ${pathInfo.service} does not expose a service() function`)
		return -2
	}

        if(!title) {
                error(`loadService error: ${pathInfo.service} does not expose a title`)
                return -2
        }

	document.title = title

	setStatus("")

	// Call the service
	await service()

	setTimeout(_linkMod, 100)
}

// Common service that many services can use optionally
async function commonService(pathOpt) {
	let path = pathOpt || "content.md"
        // Avoid caching
        let n = Math.floor(Math.random() * 10000);

        let content = await fetch(`${currentPathInfo.data}/${path}?n=${n}`)

        let text = await content.text()

	setBody(text)
}

// Internal function to handle maintenances
async function _maintLdr() {
        // Avoid caching
        let n = Math.floor(Math.random() * 10000);

	let maintResp = await _loadFetch(`https://sovngarde.infinitybots.gg/maints?n=${n}`)
	
	if(!maintResp) {
		console.warning("No maintenances found")
		return
	}

	let maint = JSON.parse(maintResp)

	maint.forEach(m => {
		let n = Math.floor(Math.random() * 10000);
		alert(`m-${n}`, m.title, m.description)

		// maintEl
		let maintEl = document.createElement("div")
		maintEl.classList.add("maint")

		// title element
		let mTitle = document.createElement("h3")
		mTitle.classList.add("maint-title")
		mTitle.innerHTML = m.title
		maintEl.appendChild(mTitle)

		// description element
                let mDesc = document.createElement("span")
                mDesc.classList.add("maint-desc")
                mDesc.innerHTML = m.description
                maintEl.appendChild(mDesc)


		document.querySelector("#nav").appendChild(maintEl)
	})
}

// Load function
async function load() {
	setStatus("Loading core data")
	
	// TODO: Find better way of handling this
	if(window.location.origin.endsWith("infinitybots.gg")) {
		setTimeout(_maintLdr, 300)
	}

	loadService(window.location.pathname)
}

// Alert API

function alert(id, title, content) {
    if(!title && !content) {
	title = "Alert, Agent P!"
	content = id
	id = "maint-" + Math.floor(Math.random() * 10000)
    }

    if(id === "fatal-error") {
        intervals.forEach(interval => {
            clearInterval(interval)
            intervals.splice(intervals.indexOf(interval), 1)
        })
        alerts = [id];
    } else {
        if(alerts.length > 0) {
            intervals.push(setTimeout(() => {
                alert(id, title, content)
            }, 300))
            return
        }
        alerts.push(id)
        intervals.forEach(interval => {
            clearInterval(interval)
            intervals.splice(intervals.indexOf(interval), 1)
        })
    }
    $("#alert-placer").html(`
<dialog
    id="${id}"
    open
    role='dialog'
    aria-labelledby="${id}-title"
    aria-describedby="${id}-content"
>
    <section>
    <header id="${id}-title">
        <strong>
        <h2 class="alert-title">${title}</h2>
        </strong>
    </header>

    <div id="${id}-content">
        ${content}
    </div>
    <button onclick="closeAlert()" id="alert-close" class="block mx-auto">
        Close
    </button>
    </section>
</dialog>

<style>
dialog {
    position: fixed;
    top: 0;
    right: 0;
    left: 0;
    bottom: 0;
    z-index: 9999;
    height: 100%;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background: transparent;
    color: black !important;
}
dialog::after {
    content: '';
    display: block;
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background: black;
    opacity: .5;
    z-index: -1;
    pointer-events: none;
}
section {
    width: 500px;
    min-height: 200px;
    max-height: 500px;
    padding: 10px;
    border-radius: 4px 4px 4px 4px;
    background: white;
}
#alert-close {
    position: relative;
    text-align: center !important;
    top: 0 !important;
    bottom: 0 !important;
}
.alert-title {
    color: black !important;
}

#alert-close {
    background-color: white !important;
    color: black !important;
    font-weight: bold !important;
    border: black solid 1px !important;
    margin-top: 3px;
    padding: 10px;
}

block {
    display: block;
}
</style>
    `)
}

function closeAlert() {
    alerts.forEach(id => {
        $(`#${id}`).remove()
        alerts.splice(alerts.indexOf(id), 1)
    })
}

window.alert = alert

ready(load)
