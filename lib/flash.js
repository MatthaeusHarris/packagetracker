module.exports = function(req, message) {
    if (req.session) {
        if (req.session.flash == undefined) {
            req.session.flash = [];
        }
        req.session.flash.push(message);
    } else {
        throw new Error('req did not contain a session');
    }
};