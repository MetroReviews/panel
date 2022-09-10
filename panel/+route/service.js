$rump.title = "Admin Panel"

$rump.service = async () => {
	// Everything else will be done by initPanel post-WS connection
	setAddressBar()
}

class States {
	constructor(states) {
		this.statesFwd = states
		this.statesBack = {}
		
		for (const [key, value] of Object.entries(this.statesFwd)) {
			this.statesBack[value] = key
		}
	}

	get(s) {
		if(typeof s === 'string' || s instanceof String) {
			return this.statesBack[s]
		}
		return this.statesFwd[s]
	}
}

botStates = new States({
	0: "pending",
	1: "under_review",
	2: "approved",
	3: "denied"
})

function addBot(k, v) {
	return `
<div class="bot" id=${v.bot_id}>
	<details>
		<summary>${DOMPurify.sanitize(v.username)}</summary>
		<p class="bot-description"><strong>Description: </strong>${DOMPurify.sanitize(v.description)}</p>
		<p class="bot-state"><strong>State: </strong>${v.state} (${botStates.get(v.state)})</p>
		<p class="bot-id"><strong>Bot ID: </strong>${v.bot_id}</p>
	</details>
</div>`
}

async function initPanel() {
	await wsSend({"req": "elevate_conn"})

	await commonService()

	setTimeout(async () => {
		let botQueue = ""
		
		wsCache.bots.forEach((v, k) => {
			info("Panel", "Adding bot:", k)
			switch(botStates.get(v.state)) {
				case "pending": 
				botQueue += addBot(k, v)
				break;
			}
		})

		document.querySelector("#queue").innerHTML = botQueue // DOMPurify.sanitize
	}, 300)
}
