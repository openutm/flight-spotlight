
const redis_client = require('../routes/redis-client');
const axios = require('axios');
require("dotenv").config();
const qs = require('qs');
let passport_helper = require('../routes/passport_helper');


const createBlenderDSSSubscriptionProcess = async (job) => {

    const passport_token = await passport_helper.getPassportToken();
    let cred = "Bearer " + passport_token;

    const base_url = process.env.BLENDER_BASE_URL || 'http://local.test:8000';

    const view = job.data.viewport;
    const job_id = job.data.job_id;
    const job_type = job.data.job_type;


    let axios_instance = axios.create({
        headers: {
            'Content-Type': 'application/json',
            'Authorization': cred
        }
    });
    // const v = [view[1], view[0], view[3], view[2]]; // Flip co-ordinates for Turf
    const viewport = view.join(',');
  
    let dss_subscription_create_url = base_url + '/rid/create_dss_subscription?view=' + viewport;
    // Start a feed 
    axios_instance.put(dss_subscription_create_url)
        .then(function (blender_response) {
            // console.log(blender_response);
            console.log("DSS Subscription started...");
        }).catch(function (error) {
            console.log(error.data);
                console.log("Error in creating a DSS subscription..");
        });

}

module.exports = {
    createBlenderDSSSubscriptionProcess,
};



