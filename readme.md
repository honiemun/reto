<p align="center">
  <img width="200" src="assets/logos/icon.png">
</p>
<h1 align="center">Reto</h1>
<p align="center"><i>A Karma and Starboard bot for the modern era</i></p>

### Retool
This is the Github repository for **Retool**, the codename for the v2 rewrite of the Reto Discord bot. The old version is available on [this repo](https://github.com/honiemun/reto-legacy).

Reto was developed from 2022 to 2024. No further major updates are planned, but its code is open source if you wish to tinker with it.

### Installation

## Local

Clone to your local machine, install all dependencies using `npm i .` and run the development version with `npm run dev`.

You may need to create a `.env` file with your [app token and secret](https://discord.com/developers/applications), along with other optional features.

## Docker

Run `docker compose up -d --build` on a computer running Docker. You can read the log output using `docker logs reto-bot`.

### Backup retrieval and database migration

TO-DO: Move this to the documentation.

To restore the database from a back-up through Docker:

```
docker cp mongodb_backups/250523 reto-mongo:/restore

docker exec -it reto-mongo mongorestore \
  --drop \
  -u [MONGODB USERNAME] \
  -p '[MONGODB PASSWORD]' \
  --authenticationDatabase admin \
  /restore
```

### Invite links
A temporal [invite link](https://discord.com/oauth2/authorize?client_id=900470229845561385&permissions=293400341584&scope=bot%20applications.commands) for the Retool Open Beta is available. The permissions may not be accurate.

You can also visit the [Support server](https://discord.gg/PR8A88epzg) to report bugs and feature requests.
