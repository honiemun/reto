const express = require('express');

const app = express();
const PORT = process.env.API_PORT || 6370;

/* Lightweight API server. Right now exclusively used for health checks, may be expanded in the future? */

function startServer(client) {
	// Make client available to routes
	app.use((req, res, next) => {
		req.client = client;
		next();
	});

	app.get('/api/health', (req, res) => {
		res.json({
			status: 'ok',
			timestamp: new Date().toISOString(),
			bot: {
				name: req.client?.user ? req.client.user.username : 'Not ready',
				ready: req.client?.readyAt ? true : false
			}
		});
	});

	app.listen(PORT, () => {
        console.log(`📡 API running on port ${PORT}`.gray);
	});
}

module.exports = { startServer };