<img src="images/spotlight-logo.png" width="350">

Flight Spotlight enables you to see flights _in realtime_ by subscribing to updates to a geographic area. It can display live manned and unmanned air traffic on a 3D globe and additionally display geo-fences etc. In the context of UTM / U-Space you can identify drone traffic using Network Remote-ID, accept feeds for broadcast Remote-ID data and plug in live ADS-B or other air-traffic data. From an unmanned aviation perspective, currently there is  ASTM Network and Broadcast Remote-ID standards and they are implemented, as other standards are released, they can be enabled as well.

The live feed and the identification data is processed using a complementary server application called [Flight Blender](https://flightblender.com). Flight Blender can fuse and stream manned and unmanned flight data using multiple technologies: ADS-B, Radar, FLARM etc. Network Remote-ID capabilities are also provided by Flight Blender as a specialized module.

## Features

This software is compatible with all ASTM and EuroCAE upcoming standards for UTM / U-Space

- Geofencing display compatible with [EuroCAE ED-269](https://eshop.eurocae.net/eurocae-documents-and-reports/ed-269/)
- Display Network Remote ID via connections to [DSS](https://github.com/interuss/dss) using [Flight Blender](https://flightblender.com)
- Display ADS-B and other traffic using streamlined [JSON format](https://github.com/openskies-sh/airtraffic-data-protocol-development) using a Flight Blender backend
- Upload JSON based [flight declarations](https://github.com/openskies-sh/flight-declaration-protocol-development) and/or mission plans from ground control stations. 

## Join the OpenUTM community 

Join our Discord community via [this link](https://discord.gg/dnRxpZdd9a) 💫


## Screenshots

Initial screen

<img src="https://i.imgur.com/6kfx13d.png" width="600">

Declared Flights

<img src="https://i.imgur.com/zbl6hKx.png" width="600">

All data is in 3D + time

<img src="https://i.imgur.com/gysUdTd.jpgs" width="600">

## Self host / Installation

Docker and Docker Compose files are available for running this on your own infrastructure. To install a production server please follow our [Installation Guide](https://github.com/openskies-sh/flight-spotlight/blob/master/documents/installation-instructions.md).

This project uses Node JS and Express JS, a Tile 38 and Redis server, and can connect to a DSS instance. If you are using a DSS instance, you will need a JWT token to connect to the airspace. For that, you will need a approved UTM / U-Space OAUTH server (e.g. [Flight Passport](https://www.github.com/openskies-sh/flight_passport)).

1. In the console execute the following command `git clone https://github.com/openskies-sh/flight-spotlight`
2. Enter the directory `cd flight-spotlight`
3. Copy the sample .env file: `cp .env.sample .env`
4. Open the .env file and fill out the credentials `nano .env`
5. You will need help to fill out all the links, since this is associated with Authentication, in short, it will ask you to point to a Flight Spotlight or any other OAUTH2 provider for credentials. (See below for non-Docker Installation)
6. Finally run the installation by typing `docker-compose up`

## Test run

Once you have the Docker container running, you can follow the instructions below to "subscribe" to flights in a AOI:

1. Navigate to `http://localhost:5000/spotlight` in your browser to launch the application. You should see a globe and a control to input a Area of Interest (AOI).
2. Copy paste the sample GeoJSON AOI from the importers [folder](https://raw.githubusercontent.com/openskies-sh/flight-blender/master/importers/aoi_geo_fence/aoi.geojson) in the Flight Blender repository
3. Click the __Stream flights__ button. This subscribe you to the flights in AOI.

## Openskies stack 

Flight tracking data can be submitted to Flight Spotlight by an Display provider like [Flight Blender](https://github.com/openskies-sh/flight-blender) via the accompanying software like [Flight Launchpad](https://github.com/openskies-sh/flight-launchpad), for more information see the diagram below

![OpenskiesStack](images/openskies-stack.png)

## Logo source

[Hatchful](https://hatchful.shopify.com/)
