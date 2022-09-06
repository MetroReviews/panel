title = "Login"

async function service() {
	setStatus("Logging you in... in 3...")

	let sp = new URLSearchParams(window.location.search)

	let tik = sp.get("ticket")

	if(!tik) {
		setStatus("No ticket found")
		return
	}

	let mapleResp = await tryReturn(fetch, `https://catnip.metrobots.xyz/_panel/mapleshade?ticket=${tik}`)

	if(!mapleResp || !mapleResp.ok) {
		setStatus("Your ticket was denied, loser!!!")
		return
	}

	let maple = await mapleResp.json()

	if(!maple.access) {
                setStatus("Your ticket was denied, loser!!!")
                return
	}
	
	setBody(`<h1>Welcome...</h1>`)
	
	await sleep(1000)

	setBody(`<h1>Welcome ${maple.member.name} (${maple.member.id})...</h1>`)

	$rump.state.token = tik
	$rump.state.id = maple.member.id
	$rump.state.username = maple.member.name

	setStatus("Loading panel...")

	await sleep(300) // Avoid CLS

	loadService("/panel")
}
