const Queue = require("bull");
const { pollBlenderProcess } = require("./poll-blender-queue-consumer");
const { createBlenderADSBFeedProcess } = require("./create-blender-adsb-queue-consumer");
const { createBlenderDSSSubscriptionProcess } = require("./create-dss-subscription-queue-consumer");

const { getGeoFenceConsumerProcess } = require("./get-geofence-queue-consumer");

// Our job queues
const pollBlenderQueue = new Queue("pollblender", {
  redis: process.env.REDIS_URL,
});
const adsbBlenderQueue = new Queue("adsbfeed", {
  redis: process.env.REDIS_URL,
});

const dssSubscriptionQueue = new Queue("dsssubscriptiongenerator", {
  redis: process.env.REDIS_URL,
});

const getGeoFenceQueue = new Queue("getgeofencequeue", {
  redis: process.env.REDIS_URL,
});
getGeoFenceQueue.process(getGeoFenceConsumerProcess);

const createNewGeofenceProcess = (geofenceRequestDetails) => {
  getGeoFenceQueue.add(geofenceRequestDetails, {
    attempts: 1,
  });
};


dssSubscriptionQueue.process(createBlenderDSSSubscriptionProcess);

const createNewBlenderDSSSubscriptionProcess = (dssSubsriptionDetails) => {
  dssSubscriptionQueue.add(dssSubsriptionDetails, {
  attempts: 1,
});
};


adsbBlenderQueue.process(createBlenderADSBFeedProcess);

const createNewADSBFeedProcess = (adsbRequestDetails) => {
  adsbBlenderQueue.add(adsbRequestDetails, {
  attempts: 1,
});
};

pollBlenderQueue.process(pollBlenderProcess);

const createNewPollBlenderProcess = (pollBlenderDetails) => {
    pollBlenderQueue.add(pollBlenderDetails, {
    attempts: 2,
  });
};

module.exports = {
  pollBlenderQueue,
  createNewPollBlenderProcess,

  adsbBlenderQueue,
  createNewADSBFeedProcess,

  dssSubscriptionQueue,
  createNewBlenderDSSSubscriptionProcess,

  getGeoFenceQueue,
  createNewGeofenceProcess

};
