module.exports = async (command, message, error) => {
    const date = new Date();
    console.log("[" + date.toISOString() + "] ❗" + "Error found while running command " + command + ": " + error);
};