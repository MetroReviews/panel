title="Metro Reviews Staff Panel"

async function service() {
	await commonService()

	setTimeout(() => {
		if(!$rump.state.token) {
			$("#login").show()
		}
	}, 300)
}
