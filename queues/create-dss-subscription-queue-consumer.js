
const redis_client = require('../routes/redis-client');
const axios = require('axios');
require("dotenv").config();
const qs = require('qs');

async function get_passport_token() {
    redis_key = 'blender_passport_token';
    const stored_token = await redis_client.get(redis_key);

    if (stored_token == null) {
        let post_data = {
            "client_id": process.env.PASSPORT_BLENDER_CLIENT_ID,
            "client_secret": process.env.PASSPORT_BLENDER_CLIENT_SECRET,
            "grant_type": "client_credentials",
            "scope": process.env.PASSPORT_BLENDER_SCOPE,
            "audience": process.env.PASSPORT_BLENDER_AUDIENCE
        };
        let passport_response = async () => {

            let res = await axios.request({
                url: process.env.PASSPORT_TOKEN_URL || '/oauth/token/',
                method: "post",
                header: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                baseURL: process.env.PASSPORT_URL,
                data: qs.stringify(post_data)
            });
            if (res.status == 200) {
                let a_token = res.data;
                let access_token = JSON.stringify(a_token);
                await redis_client.set(redis_key, access_token);
                await redis_client.expire(redis_key, 3500);

                return a_token['access_token'];
            } else {

                return {
                    "error": "Error in Passport Query, response not 200"
                };
            }

        }
        return passport_response();

    } else {
        let raw_a_token = JSON.parse(stored_token);
        return raw_a_token['access_token'];
    }
}


const createBlenderDSSSubscriptionProcess = async (job) => {

    const passport_token = await get_passport_token();
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



