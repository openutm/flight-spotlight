// processor.js

var tools = require('./airtraffic-processor/tools');
module.exports = function (job) {
    // Do some heavy work
    const viewport = job.data.viewport;
    const job_id = job.data.job_id;
    let fullproc = 40;
    for (var h = 0; h < fullproc; h++) { // we will send 40 requests

        tools.queryBlenderforFlights(viewport);
        counter += 1;
        job.progress({
            'percent': parseInt((100 * counter) / fullproc),
            'job_id': job_id
        });

    }


    console.log('Computation Complete..');

    return Promise.resolve(job_id);
}