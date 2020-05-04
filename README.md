# Flight Spotlight

A project to see all flights in a area _in realtime_ by subscribing to updates to a geographic area. From a UTM / U-Space point of view, this includes querying flights in a DSS and a live feed. It uses CesiumJS to display the flight data in 3D .

## Self host / Installation

This project uses Node JS and Express JS, a Tile 38 server, and can connect to a DSS instance. If you are using a DSS instance, you will need a JWT token to connect to the airspace. For that, you will need a approved UTM / U-Space OAUTH server (e.g. [Flight Passport](https://www.github.com/openskies-sh/flight_passport)). The following steps are for self host / test. In these steps we will not connect to the DSS and turn off all authentication:

   1. Clone the repository and use `npm install | npm i` 
   2. In Github switch the branch to `testrun`, this branch turns off all identity and authentication capabilities. You can use `git checkout testrun`
   3. Create a process.env file using `touch process.env`
      1. Take a look at the [.env.sample](https://github.com/openskies-sh/flight-spotlight/blob/master/.env.sample) file to fill in your details. You will need the Bing / Mapbox keys for basemaps, you can igonre the Identity and Authorization settings. 
   4. Download a precompiled binary of the [Tile 38](https://www.tile38.com) server for your system. You can follow the instructions [in the releases page](https://github.com/tidwall/tile38/releases). Sample for Linux below:

      ```shell
      curl -L  https://github.com/tidwall/tile38/releases/download/1.19.5/tile38-1.19.5-linux-amd64.tar.gz -o tile38-1.19.5-linux-amd64.tar.gz
      tar xzvf tile38-1.19.5-linux-amd64.tar.gz
      cd tile38-1.19.5-linux-amd64
      ./tile38-server
      ```
   5. Run the local server using `npm start`
   6. Navigate to `http://localhost:5000/spotlight` in your browser to launch the application. You should see a globe and a control to input a Area of Interest (AOI).
   7. Copy paste the sample GeoJSON AOI from the importers [folder](https://raw.githubusercontent.com/openskies-sh/flight-spotlight/master/importers/aoi.geojson)
   8. Click the __Stream flights__ button. This subscribe you to the channel.
   8. This part needs Python3. In another terminal install the redis dependency in Python `pip install redis`
   9. Navigate to the importers directory and type in `python import_flight_json.py` file to upload flight information and see it on a map. This script parses the JSON flight details and uploads the data every five seconds. The flights should be appear as point on the globe.

### Under the hood

Take a look at the raw [JSON file](https://www.github.com/openskies-sh/flight-spotlight/importers/micro_flight_data.json) for sample flight data. This file follows the format as specified in the [Airtraffic data protocol](https://github.com/openskies-sh/airtraffic-data-protocol-development/blob/master/Airtraffic-Data-Protocol.md) and has a series of observations. Every five seconds this data is uploaded to the server and if the uploaded data intersects the aoi polygon bounds, then the flight is shown on the globe. 

In the production version there is a POST request to post this data in realtime. 


## Screenshots

Initial screen
![terrain1](https://i.imgur.com/hQ3LmFk.jpg)