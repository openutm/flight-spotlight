# Flight Spotlight

A project to see all flights in a area, including querying flights in a DSS and a custom database. It uses CesiumJS to display the flight data in 3D and as an navigable list.

## Installation

This project uses Node JS and Express JS to query a DSS instance API. Installation Steps:

1. Clone the repository and use `npm install | npm i` 
2. Create a process.env file using `touch process.env`
   1. Add credential information information including the URL of the DSS endpoint
3. Run the local server using `node server.js`
4. Navigate to `http://local.test:5000` to launch the application

## Screenshots

Initial screen
![terrain1](https://i.imgur.com/hQ3LmFk.jpg)