const Pin = require('../../classes/pin');

module.exports = async (message) => {
    await Pin.deleteMessage(
      message,
      message.client
    )
};