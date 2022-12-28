// processor.js

const redis_client = require('./redis-client');

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
function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
  }
module.exports = async function (job) {
    // Do some heavy work
    console.log('here');
    const passport_token = await get_passport_token();
    let cred = "Bearer " + passport_token;

    const view = job.data.viewport;
    const viewport = view.join(',');
    const job_id = job.data.job_id;
    let fullproc = 2;
    let counter = 0;
    let axios_instance = axios.create({
        headers: {
            'Content-Type': 'application/json',
            'Authorization': cred
          }
        }
      );
    for (var h = 0; h < fullproc; h++) { // we will send 40 requests


        const base_url = process.env.BLENDER_BASE_URL || 'http://local.test:8000';
        let flights_url = base_url + '/flight_stream/get_air_traffic?view=' + viewport;
        console.log(flights_url);
        axios_instance.get(flights_url).then(function (blender_response) {
            // response.send(blender_response.data);
            const observations = blender_response.data['observations'];
            console.debug(observations)
            for (let index = 0; index < observations.length; index++) {
                const current_observation = observations[index];
                let lon_dd = current_observation['lon_dd'];
                let lat_dd = current_observation['lat_dd'];
                let icao_address = current_observation['icao_address'];
                let altitude_mm = current_observation['altitude_mm'];
                let source_type = current_observation['source_type'];
                let traffic_source = current_observation['traffic_source'];
                let obs_metadata = current_observation['metadata'];

                try {
                    tile38_client.set('observation', icao_address, [lon_dd, lat_dd, altitude_mm], {
                        'source_type': source_type,
                        'traffic_source': traffic_source,
                        'metadata': JSON.stringify(obs_metadata)
                    }, {
                        expire: 300
                    });

                } catch (err) {
                    console.log("Error " + err);
                }
                let metadata_key = icao_address + '-metadata';
                // TODO: Set metatadata
                async function set_metadata(obs_metadata) {
                    await redis_client.set(metadata_key, JSON.stringify(obs_metadata));
                    await redis_client.expire(metadata_key, 300);
                }
                set_metadata(obs_metadata);
            }


        }).catch(function (blender_error) {
            console.log("Error in retrieveing data from Blender")
            console.log(blender_error);
        });

        counter += 1;
        // job.progress({
        //     'percent': parseInt((100 * counter) / fullproc),
        //     'job_id': job_id
        // });
        delay(1000).then(() => console.log('Waiting 1 second ..'));
    }
    console.log('Computation Complete..');

    return Promise.resolve(job_id);
}