const mongoose = require("mongoose");

/*
PIN THRESHOLD:
If a certain amount of Karma is met, this can be used to pin a message to a given channel.

This is decoupled from Reactable for multiple reasons:
- The user may award Karma with any Reactable. The sendsToChannel element is only used on
  Reactables that send messages to a channel, such as the :pin: default. We need a way to
  keep track 
- The user may not create a Reactable with pinning abilities (for example, if they only want
  to have a Starboard-like bot without the manual Pinning). As such, we have to account for
  pinning with no sendsToChannel element present.
- The user may have different Pin Thresholds for different amounts of Karma - for example,
  +5 Karma for a #best-of channel and -5 Karma for a #worst-of channel.
*/

const pinThresholdSchema = new mongoose.Schema({

	// The amount of karma that is needed to trigger this Pin Threshold.
	karma: {
		type: Number,
		required: false,
		default: 0
	},
    
	// The ID of the channel this Pin Threshold rule is applied to.
	channelId: {
		type: String,
		required: true
	},
    
	// The ID of the guild this Pin Threshold rule is applied to.
	guildId: {
		type: String,
		required: true
	},
});

module.exports = mongoose.model("pinThreshold", pinThresholdSchema);