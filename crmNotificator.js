const Slack = require('slack-node');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const webhookUri = 'secret';

//Slack conf
var slack = new Slack();
slack.setWebhook(webhookUri);
var reportToSlack = function (text) {
    slack.webhook({
        channel:"#intercom-notification",
        username: "Intercom Notifications",
        text: text,
    }, function(err, response) {
        console.log(response);
        if (err)
            console.log('error', 'Error reporting to Slack: %s', err);
    });
}

//User variables
var usersArray = [];
var next_page = "https://api.intercom.io/users?per_page=50&page=1";
var eventsNotified = new Map();
var isUsersUpdated = false;

//This function runs every 1 hour
var getUsers = function () {
    var d = new Date();
    console.log(d.getHours()+":"+d.getMinutes()+" Updating User list ...")
    var xmlhttp = new XMLHttpRequest();
    var url = next_page;
    console.log(url);

    xmlhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            try {
                var response = JSON.parse(this.responseText);
                for (var i = 0; i < response.users.length; i++) {
                    usersArray.push(response.users[i]);
                }

                var theNextPage = response.pages.next;
                if (theNextPage !== null) {
                    next_page = theNextPage;
                    getUsers();
                } else {
                    next_page = "https://api.intercom.io/users?per_page=50&page=1";
                    isUsersUpdated = true;
                }
            }catch(e){
                console.log(e);
            }
        }
    };

    xmlhttp.open("GET", url, true);
    xmlhttp.setRequestHeader("Authorization","secret");
    xmlhttp.setRequestHeader("Accept","application/json");
    xmlhttp.send();
}


//this function runs every 5 minutes
var checkUserEvents = function () {
    console.log("Checking users events ...")
    if(isUsersUpdated){
        usersArray.forEach(function (user) {
            var xmlhttp = new XMLHttpRequest();
            var url = "https://api.intercom.io/events?type=user&email=" + user.email;

            xmlhttp.onreadystatechange = function () {
                if (this.readyState == 4 && this.status == 200) {
                    var response = JSON.parse(this.responseText);
                    try {
                        //first check if the user has any recorded action
                        if (response.events[0] !== undefined) {

                            //Find the last checked event (outside 5min interval)
                            var n = 0;
                            while (response.events[n] !== undefined && (Date.now() / 1000 - response.events[n].created_at) <= 6 * 60) {
                                n++;
                            }
                            var d = new Date();
                            // check if this event found outside the interval wasn't the last one
                            if (n !== 0 && response.events[n] !== undefined) {
                                //Here n references the first event outside the unchecked interval
                                //now we have to check if this event was more than 3 hours before the next one
                                console.log(d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds() + " Checking user " + user.name + ", " + user.email + " time inactive: " + (response.events[n - 1].created_at - response.events[n].created_at) / 3600 + " hours. <timestamp> " + response.events[n - 1].created_at);

                                if ((response.events[n - 1].created_at - response.events[n].created_at) >= 3 * 60 * 60) {
                                    if (!eventsNotified.has(user.email)) {
                                        reportToSlack("New event for user : " + user.name + "\n Event : " + response.events[n - 1].event_name + "\n User's Email : " + user.email);
                                        eventsNotified.set(user.email, response.events[n - 1].created_at);
                                    }else if (response.events[n - 1].created_at !== eventsNotified.get(user.email)) {
                                        reportToSlack("New event for user : " + user.name + "\n Event : " + response.events[n - 1].event_name + "\n User's Email : " + user.email);
                                        eventsNotified.set(user.email,response.events[n - 1].created_at);
                                    }else{
                                        console.log(d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds() + " Checking user " + user.name + ", " + user.email + " This event was already notified");
                                    }

                                }

                            } else {
                                console.log(d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds() + " Checking user " + user.name + ", " + user.email + " time inactive: " + (Date.now() / 1000 - response.events[n].created_at) / 3600 + " hours.");
                            }

                            //If the while loop ended because of an undefined event
                            if (response.events[n] == undefined && response.events[n - 1] !== undefined) {
                                console.log("Looks like this is the first event of " + user.name + ", " + user.email);
                                if (!eventsNotified.has(user.email)) {
                                    eventsNotified.set(user.email, response.events[n - 1].created_at);
                                    reportToSlack("Looks like this is the first event of : " + user.name + "\n Event : " + response.events[n - 1].event_name + "\n User's Email : " + user.email);
                                }
                            }

                        } else {
                            var d = new Date();
                            console.log(d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds() + " Checking user " + user.name + ", " + user.email + " doesn't have any recorded events :/")
                        }

                    }catch(e){
                        console.log(e);
                    }
                    if (this.readyState == 4 && this.status !== 200) {
                        var d = new Date();
                        console.log(d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds() + " Checking user " + user.name + ", " + user.email + " HTTP ERROR: " + this.status);
                    }
                }
            }
            xmlhttp.open("GET", url, true);
            xmlhttp.setRequestHeader("Authorization","secret");
            xmlhttp.setRequestHeader("Accept","application/json");
            xmlhttp.send();
        });
    }else{
        console.log("Ops! Users Array being filled. Waiting...Almost there, the array length now is: "+usersArray.length);
        setTimeout(checkUserEvents,20*1000)
    }

}

getUsers();
setTimeout(checkUserEvents,40*1000);


//Get users every hour
setInterval(function () {
    isUsersUpdated = false;
    usersArray=[];
    getUsers();
},60*60*1000);

//Check users`s events every 5 minutes
setInterval(checkUserEvents,5*60*1000);
