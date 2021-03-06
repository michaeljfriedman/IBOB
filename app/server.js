/*
 * server.js
 *
 * Configures and starts the server.
 */

const express = require('express');
const app = express();

const axios = require('axios');
const constants = require('./lib/serverConstants');
const debug = require('./lib/debug');
const path = require('path');
const requests = require('./lib/requests');

/******************************************************************************/

// Configuration

var allowCrossDomain = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  next()
}

app.use(allowCrossDomain);

// Expose static files at URLs prefixed with /public/
const publicDir = path.join(__dirname, 'public');
app.use('/public', express.static(publicDir));


// Store raw request body in req.body.
// Ref: https://stackoverflow.com/questions/9920208/expressjs-raw-body/9920700#9920700
app.use(function(req, res, next) {
    var data = "";
    req.setEncoding("utf8");

    // Concatenate request body into `data`
    req.on("data", function(chunk) {
        data += chunk;
    });

    // Store in req.body
    req.on("end", function() {
        req.body = data;
        next();
    });
});

/******************************************************************************/

// Url endpoints
const urls = {
    // Logging in
    index: '/',
    manifest: '/manifest.json',
    initialization: '/initialization',
    createUserServer: '/create-user-server',

    // Main pages
    profile: '/profile/:bsid',
    feed: '/feed',
    error: '/error',
    newPost: '/new-post'
};

// Base directory of views
const viewsDir = path.join(__dirname, '/views');

/******************************************************************************/

// Public pages, available to users

/*
 * Returns the index (login) page
 */
app.get(urls.index, function(req, res, next) {
    res.sendFile(path.join(viewsDir, 'index.html'));
});


/*
 * Returns the app's manifest file. We are required to have this page
 * for login to work.
 */
app.get(urls.manifest, function(req, res, next) {
    res.sendFile(path.join(publicDir, 'manifest.json'));
});


/*
 * Returns the initialization page. This page is loaded upon the user's
 * first login to help them initialize their user-server.
 */
app.get(urls.initialization, function(req, res, next) {
    res.sendFile(path.join(viewsDir, 'initialization.html'));
});



/*
 * This sends the site admins a message to initialize the user-server for a
 * given user. Requires a signature.  See docs for details.
 */
app.post(urls.createUserServer, function(req, res, next) {
    // TODO: Verify signature
    var bsid = req.query.requester;
    debug.log('Got request for ' + bsid);

    // For now, just return here without doing anything
    res.json({success: false, msg: 'Request not implemented'});
    return;

    //--------------------------------------------------------------------------

    // TODO: This section does not run, though most of it is implemented. Some
    // parts are still missing, and are marked with TODOs.
    var body = JSON.parse(req.body);

    // Check that a user-server has not already been created for this user
    debug.log('Checking if ' + bsid + ' already has a user-server...');
    axios.get(constants.directoryBaseUrl + '/api/get/' + bsid)
    .then(resp => {

        var json = resp.data;
        if (json.success) {
            // User-server already exists. Respond with failure
            debug.log(bsid + ' already has a user-server. Fail.');
            res.json({success: false, msg: 'This user already has a user-server!'});
            return;
        }


        // TODO: Spin up user-server
        debug.log('Spinning up user-server for ' + bsid + '...');
        var url = 'https://example.herokuapp.com'; // hard-coded URL for now

        // Add entry to the directory for the new user-server
        debug.log('Adding entry (' + bsid + ', ' + url + ') to directory...');
        var data = {bsid: bsid, ip: url, timestamp: requests.makeTimestamp()};
        var reqBody = requests.makeBody(data, privateKey);
        axios.post(constants.directoryBaseUrl + '/api/put?requester=' + bsid, reqBody)
        .then(resp => {

            debug.log('Got response from directory');
            var json = resp.data;
            if (!json.success) {
                // The directory responded with a failure. Send that error
                // message back.
                res.json({success: false, msg: json.msg});
                return;
            }


            // All done!
            debug.log('All done! Responding success');
            res.json({success: true, url: url});


        }).catch(err => { // failed to put entry into directory
            debug.log('Failed to put entry into directory');
            res.json({success: false, msg: 'User-server has been created, but failed to put entry into directory. Directory never responded.'});
        });

    }).catch(err => {  // failed to get entry from directory
        debug.log('Failed to get entry from directory');
        res.json({success: false, msg: 'Cannot determine if user already '
            + 'has a user-server. Directory never responded.'});
    });
});


/*
 * Returns the profile page
 */
app.get(urls.profile, function(req, res, next) {
    // Check that bsid requested has an account in the directory
    var bsid = req.params.bsid;
    var errorPage = path.join(viewsDir, '404.html');
    axios.get(constants.directoryBaseUrl + '/api/get/' + bsid)
    .then(resp => {

        var json = resp.data;
        if (!json.success) {
            res.redirect(urls.error);
            return;
        }

        // Bsid exists, so we can send the profile page
        res.sendFile(path.join(viewsDir, 'profile.html'));
    })
    .catch(err => {
        res.redirect(urls.error);
    });
});


/*
 * Returns the feed page
 */
app.get(urls.feed, function(req, res, next) {
    res.sendFile(path.join(viewsDir, 'feed.html'));
});


/*
 * Returns a 404 error page
 */
app.get(urls.error, function(req, res, next) {
    res.sendFile(path.join(viewsDir, '404.html'));
});


/*
 * Returns the new-post page
 */
app.get(urls.newPost, function(req, res, next) {
    res.sendFile(path.join(viewsDir, 'new-post.html'));
});

/******************************************************************************/

// Start server
app.listen(constants.port, function() {
    console.log('App is running on port ' + constants.port);
});
