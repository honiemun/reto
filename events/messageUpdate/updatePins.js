const Pin = require('../../classes/pin');

module.exports = async (oldMessage, newMessage) => {
    await Pin.pinMessageToChannel(
      newMessage,
      false,
      newMessage.client,
      true
    )
};