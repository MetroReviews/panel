async function login() {
	let data = await tryReturn(fetch, "https://catnip.metrobots.xyz/_panel/strikestone")
	if(!data || !data.ok) {
		alert("Failed to fetch data")
	}

	let url = await data.json()

	window.location.href = url.url
}
