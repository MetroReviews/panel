$rump.title = "Metro Reviews Staff Panel"

$rump.service = async () => {
	await commonService()

	setTimeout(() => {
		if(!$rump.state.token) {
			$("#login").show()
		} else {
			$("#logout").show()
		}
	}, 300)
}
