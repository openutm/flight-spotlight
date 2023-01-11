
const redis_client = require('../routes/redis-client');
const axios = require('axios');
require("dotenv").config();
const qs = require('qs');
let passport_helper = require('../routes/passport_helper');


const createBlenderADSBFeedProcess = async (job) => {

    const passport_token = await passport_helper.getPassportToken();
    let cred = "Bearer " + passport_token;

    const base_url = process.env.BLENDER_BASE_URL || 'http://local.test:8000';

    const view = job.data.viewport;
    const job_id = job.data.job_id;
    const job_type = job.data.job_type;

    // const v = [view[1], view[0], view[3], view[2]]; // Flip co-ordinates for Turf
    const viewport = view.join(',');

    let axios_instance = axios.create({
        headers: {
            'Content-Type': 'application/json',
            'Authorization': cred
        }
    });

    let adsb_feed_url = base_url + '/flight_stream/start_opensky_feed?view=' + viewport;
    // Start a feed 
    console.log(adsb_feed_url);
    axios_instance.get(adsb_feed_url)
        .then(function (blender_response) {
            console.log(blender_response);
            console.log("Openskies Stream started...");
        }).catch(function (error) {
            console.log(error.data);
            console.log("Error in starting Openskies Stream..");
        });

}

module.exports = {
    createBlenderADSBFeedProcess,
};

