$rump.title = "Admin Panel"

$rump.service = async () => {
	// Everything else will be done by initPanel post-WS connection
	setAddressBar()
}

async function initPanel() {
	await wsSend({"req": "elevate_conn"})
}
