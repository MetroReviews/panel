title = "Admin Panel"

async function service() {
	// Everything else will be done by initPanel post-WS connection
	setAddressBar()
}

async function initPanel() {
	await wsSend({"req": "elevate_conn"})
}
