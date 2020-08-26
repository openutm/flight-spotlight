<img src="https://i.imgur.com/6GWaYcD.png" width="350">

Flight Spotlight is a open-source project to see all flights in a area _in realtime_ by subscribing to updates to a geographic area. From a UTM / U-Space point of view, this includes querying flights in a DSS and a live feed such as ADS-B or even Broadcast Remote ID. It uses CesiumJS to display the flight data on a 3D map.

## Features

This software is compatible with all ASTM and EuroCAE upcoming standards for UTM / U-Space. Specifically it is compatible with Remote ID (Remote ID Display provider) and Geofencing standards

- Geofencing display
- Display Network Remote ID via connectioons to DSS
- Display ADS-B traffic
- Query Flight Registry information

## Screenshots

Initial screen
![terrain1](https://i.imgur.com/6kfx13d.png)

All data is in 3D + time
![3D](https://i.imgur.com/gysUdTd.jpgs)

## Self host / Installation

Docker and Docker Compose files are available for running this on your own infrastructure. To install a production server please follow our [Installation Guide](https://github.com/openskies-sh/flight-spotlight/blob/master/documents/installation-instructions.md).

This project uses Node JS and Express JS, a Tile 38 and Redis server, and can connect to a DSS instance. If you are using a DSS instance, you will need a JWT token to connect to the airspace. For that, you will need a approved UTM / U-Space OAUTH server (e.g. [Flight Passport](https://www.github.com/openskies-sh/flight_passport)).

1. In the console execute the following command `git clone https://github.com/openskies-sh/flight-spotlight`
2. Enter the directory `cd flight-spotlight`
3. Copy the sample .env file: `cp .env.sample .env`
4. Open the .env file and fill out the credentials `nano .env`
5. You will need help to fill out the all the links, since this is associated with Authentication, in short, it will ask you to point to a Flight Spotlight or any other OAUTH2 provider for credentails. (See below for non-Docker Installation)
6. Finally run the installation by typing `docker-compose up`

## Test run

Once you have the Docker container running, you can follow the instructions below

1. Navigate to `http://localhost:5000/spotlight` in your browser to launch the application. You should see a globe and a control to input a Area of Interest (AOI).
2. Copy paste the sample GeoJSON AOI from the importers [folder](https://raw.githubusercontent.com/openskies-sh/flight-spotlight/master/importers/aoi_geo_fence/aoi.geojson)
3. Click the __Stream flights__ button. This subscribe you to the channel.
4. Navigate to the importers directory and type in `python import_flight_json_secured.py` file to upload flight information and see it on a map. This script parses the JSON flight details and uploads the data every five seconds. The flights should be appear as point on the globe.

## Under the hood

Take a look at the raw [JSON file](https://www.github.com/openskies-sh/flight-spotlight/importers/micro_flight_data.json) for sample flight data. This file follows the format as specified in the [Airtraffic data protocol](https://github.com/openskies-sh/airtraffic-data-protocol-development/blob/master/Airtraffic-Data-Protocol.md) and has a series of observations. Every five seconds this data is uploaded to the server and if the uploaded data intersects the aoi polygon bounds, then the flight is shown on the globe. In the production version there is a POST request to post this data in realtime.

## Logo source

[Hatchful](https://hatchful.shopify.com/)