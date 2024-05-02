const Pin = require('../../classes/pin');

module.exports = async (channel) => {
    await Pin.deletePinThreshold(
        channel
    );
};