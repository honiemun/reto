<p align="center">
  <img width="200" src="assets/logos/icon.png">
</p>
<h1 align="center">Reto</h1>
<p align="center"><i>A Karma and Starboard bot for the modern era</i></p>

### Retool
This is the Github repository for **Retool**, the codename for the v2 rewrite of the Reto Discord bot. The old version is available on [this repo](https://github.com/honiemun/reto-legacy).

> Reto was primarily developed from 2022 to 2024. No further major updates are planned, but its code is source-available if you wish to tinker with it. The code is provided "as-is", and the Reto development team can not guarantee prolonged support.

### Installation

You will need to create a `.env` file with your [app token and secret](https://discord.com/developers/applications).

You also need to create custom emoji in your Discord application, and change the existing ones in `/data/retoEmojis.js`. The images used are available under the `/assets` folder.

#### Local

Clone to your local machine, install all dependencies using `npm i .` and run the development version with `npm run dev`.

You'll need a local [MongoDB](https://www.mongodb.com/docs/manual/installation/) instance to attach to this code.

#### Docker

Run `docker compose up -d --build` on a server running Docker. You can read the log output using `docker logs reto-bot`.

### Invite links
A temporal [invite link](https://discord.com/oauth2/authorize?client_id=900470229845561385&permissions=293400341584&scope=bot%20applications.commands) for the Retool Open Beta is available. The permissions may not be accurate.

You can also visit the [Support server](https://discord.gg/PR8A88epzg) to report bugs and feature requests.

### License

This project is licensed under the [PolyForm Noncommercial License 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0/).

You may use, modify, and run this software for non-commercial purposes. Commercial use, hosting for profit, or offering this software as a paid service is not permitted without explicit permission.

The Reto name, branding, mascot and icons are not licensed for reuse. [Learn more about permitted use in the Terms of Service](https://retobot.com/legal/terms-of-service).