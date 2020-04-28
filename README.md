# Flight Spotlight

A project to see all flights in a area _in realtime_ by subscribing to updates to a geographic area. From a UTM / U-Space point of view, this includes querying flights in a DSS and a live feed. It uses CesiumJS to display the flight data in 3D .

## Installation

This project uses Node JS and Express JS, a Tile 38 server, for DSS and other queries you will need a UTM / U-Space OAUTH server ([Flight Passport](https://www.github.com/openskies-sh/flight_passport)). Installation Steps:

1. Clone the repository and use `npm install | npm i` 
2. Create a process.env file using `touch process.env`
   1. Add credential information information including the URL of the DSS endpoint
3. Download and run a [Tile 38](https://www.tile38.com) server
3. Run the local server using `npm start`
4. Navigate to `http://local.test:5000` to launch the application
5. Use the `import_flight_data.py` file to upload flight information. 

## Screenshots

Initial screen
![terrain1](https://i.imgur.com/hQ3LmFk.jpg)