const Pin = require('../../classes/pin');

module.exports = async (message, instance) => {
    await Pin.deleteMessage(
      message,
      message.client
    )
};