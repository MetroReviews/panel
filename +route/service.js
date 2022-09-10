$rump.title = "Metro Reviews Staff Panel"

$rump.service = async () => {
	await commonService()

	setTimeout(() => {
		if(!$rump.state.token) {
			document.querySelector("#login").style.display = "block"
		} else {
			document.querySelector("#logout").style.display = "block"
		}
	}, 300)
}
