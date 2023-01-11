// processor.js

const redis_client = require('../routes/redis-client');
const tile38_host = process.env.TILE38_SERVER || '0.0.0.0';
const tile38_port = process.env.TILE38_PORT || 9851;

const { v4: uuidv4 } = require('uuid');

var Tile38 = require('tile38');
const axios = require('axios');
require("dotenv").config();
const qs = require('qs');
var tile38_client = new Tile38({ host: tile38_host, port: tile38_port });
let passport_helper = require('../routes/passport_helper');


function setGeoFenceLocally(geo_fence_detail) {

    const geo_fence_list = geo_fence_detail;

    for (let index = 0; index < geo_fence_list.length; index++) {
        const geo_fence = geo_fence_list[index];
        // console.log(geo_fence_properties, typeof(geo_fence_properties));

        let upper_limit = geo_fence['upper_limit'];
        let lower_limit = geo_fence['lower_limit'];
        // Create a new geo fence
        console.info("Setting Geofence..");
        tile38_client.set('geo_fence', uuidv4(), geo_fence.raw_geo_fence, {
            'upper_limit': upper_limit,
            'lower_limit': lower_limit
        });
    }
}

const getGeoFenceConsumerProcess = async (job) => {

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

    let geo_fence_url = base_url + '/geo_fence_ops/geo_fence?view=' + viewport;
    
    axios_instance.get(geo_fence_url).then(function (blender_response) {
        // response.send(blender_response.data);
        const geo_fences = blender_response.data;

        setGeoFenceLocally(geo_fences);


    }).catch(function (blender_error) {
        console.log("Error in retrieveing data from Blender")
        console.log(blender_error);
    });



    console.log('Computation Complete..');
};

module.exports = {
    getGeoFenceConsumerProcess,
};
