title="Metro Reviews Staff Panel"

async function service() {
	await commonService()

	setTimeout(() => {
		if(!$rump.state.token) {
			$("#login").show()
		} else {
			$("#logout").show()
		}
	}, 300)
}
