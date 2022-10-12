(async () => { 
	// IMPORT MODULES
	// const HTTPSProxyAgent = require('https-proxy-agent');
	// const url = require('url');
	const ws = require('ws');
	const https = require('https');
	const fetch = require('node-fetch');

	const { Shuffler, Unshuffler } = require('./protocol');
	const { Reader, Writer } = require('./coder');
	const solve = require('./pow_worker');
	
	// GET BUILD HASH
	const body = await fetch('https://diep.io/'), response = await body.text();
	const BUILD_STRING = /(?!build_)([0-9a-f]{40})/g.exec(response)[0];
	
	// HIJACK HTTPS.GET FUNCTION TO ORDER HEADERS
	const _https_get = https.get;
	https.get = (...args) => {
		if (args[0]?.headers) {
			args[0].headers = {
				Host: args[0].host,
				Connection: undefined,
				Pragma: undefined,
				'Cache-Control': undefined,
				'User-Agent': undefined,
				Upgrade: undefined,
				Origin: undefined,
				'Sec-WebSocket-Version': undefined,
				'Accept-Encoding': undefined,
				'Accept-Language': undefined,
				'Sec-WebSocket-Key': undefined,
				'Sec-WebSocket-Extensions': undefined,
				...args[0].headers,
			};
		}
		
		return _https_get(...args);
	};
	
	let unshuffler, shuffler, WebSocket, PARTY_STRING;
	
	let region = 'amsterdam';
	let link = 'https://diep.io/#26A6E64300082D1F2013C3';

	PARTY_STRING = link.split('00')[1] || 0;
	let b = await fetch('http://api.n.m28.io/endpoint/diepio-sandbox/findEach'), r = await b.json(), id = r.servers[`vultr-${region}`]?.id;
	const options = {
		origin: 'https://diep.io',
		rejectUnauthorized: false,
		headers: {
			Pragma: 'no-cache',
			'Cache-Control': 'no-cache',
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.111 Safari/537.36',
			'Accept-Encoding': 'gzip, deflate, br',
			'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
		},
	};
	
	let match = link.match(/diep\.io\/#(([0-9A-F]{2})+)/);
	if (!match) throw 'Invalid link.';
	
	shuffler = new Shuffler();
	unshuffler = new Unshuffler();
	
	await shuffler.reset();
	await unshuffler.reset();
	
	WebSocket = new ws(`wss://${id}.s.m28n.net`, options);
	WebSocket.binaryType = 'arraybuffer';

	WebSocket.on('open', async () => {
		console.log('Bot opened.');
		WebSocket.send(new Writer().vu(0).string(BUILD_STRING).string('').string(PARTY_STRING).vu(0).out());
		WebSocket.send(shuffler.serverbound(new Uint8Array([0x05])));
	});
	
	WebSocket.on('message', async (data) => {
		data = unshuffler.clientbound(data);
		data = new Reader(data);

		const header = data.vu();

		switch (header) {
			case 0x0b:
				console.log('Solving PoW...');
			
				const difficulty = data.vu();
				const prefix = data.string();
	
				const result = solve(prefix, difficulty).split(':')[1];

				console.log(`Got result: ${result}.`);
				WebSocket.send(shuffler.serverbound(new Writer().vu(10).string(result).out()));
				
				break;
			case 0x05:
				const now = Date.now();
				WebSocket.lastPing = now;
				WebSocket.send(shuffler.serverbound(new Uint8Array([0x05])));

				break;
			case 0x00:
				WebSocket.lastPing = Date.now();
				break;
			case 0x07:
				WebSocket.send(shuffler.serverbound(new Writer().vu(2).string('bot').out()));
				break;
		}
	});
	
	WebSocket.on('close', () => console.log('Bot disconnected.'));
})();
