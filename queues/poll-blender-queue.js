const Queue = require("bull");
const { pollBlenderProcess } = require("./poll-blender-queue-consumer");

// Our job queue
const pollBlenderQueue = new Queue("pollblender", {
  redis: process.env.REDIS_URL,
});

pollBlenderQueue.process(pollBlenderProcess);

const createNewPollBlenderProcess = (pollBlenderDetails) => {
    pollBlenderQueue.add(pollBlenderDetails, {
    // priority: getJobPriority(pollBlenderDetails),
    attempts: 2,
  });
};

// const getJobPriority = (order) => {
//   if (!order.price) return 3;
//   return order > 100 ? 1 : 2;
// };

module.exports = {
  pollBlenderQueue,
  createNewPollBlenderProcess,
};
