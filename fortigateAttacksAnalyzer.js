const elasticsearch = require('elasticsearch');
const request = require('request');

var client = new elasticsearch.Client({
    host: 'localhost:9200'/*,
    log: 'trace'*/
});
var dangerousIps = [];
var incidentsCreated = new Map();

//Configurables
var index =process.argv[2];
var type = process.argv[3];
var hostname = process.argv[4];
if(process.argv[5] !== undefined){
    var timeout = process.argv[5]*1000;
}else{
    var timeout = 30000;
}
if(process.argv[6] !== undefined){
    var frequency = process.argv[6]*60*1000;
}else{
    var frequency = 60*60*1000;
}
if(process.argv[7] !== undefined){
    var httpHttps = process.argv[7];
}else{
    var httpHttps = "http";
}
if(process.argv[8] !== undefined){
    var output = process.argv[8];
}else{
    var output = "logs"
}
if (process.argv[9] !== undefined){
    var whiteList = process.argv[9].split(",");
}else{
    var whiteList = [];
}


var searchForTopAttackers = function () {

    console.log("Looking for the 10 most dangerous attackers");
    dangerousIps = [];

    //Querying the fortigate logs grouping by IP the ones with the most amount of 'deny' action
    client.search({
        index: index,
        type: type,
        requestTimeout:timeout,
        body: {
            query: {
                bool: {
                    must: [{
                        match: {
                            "properties.action": "deny"
                        }
                    },{
                        match:{
                            "properties.type" : "traffic"
                        }
                    }],
                    must_not: {
                        terms: {
                            "properties.srcip": whiteList
                        }
                    }
                }
            },
            aggs: {
                group_by_source_ip:{
                    terms:{
                        field:'properties.srcip.keyword'
                    }
                }
            }
        }
    }).then(function (resp) {

        if(resp === undefined){
            console.log("Something went wrong on the search, maybe the index/type")
        }else{
            var buckets = resp.aggregations.group_by_source_ip.buckets;
            console.log(buckets);

            //Create an array with the dangerous Ips
            for(var i = 0; i < buckets.length; i++){
                dangerousIps.push(buckets[i].key);
            }

            if(buckets.length === 0){
                console.log("No IP's with deny action were found");
            }else{
                console.log("This are the most dangerous attackers:");
                console.log(dangerousIps);
                checkingAttackers();
            }
        }
    }, function (err) {
        console.trace(err.message);
    });

};

var checkingAttackers = function () {
    console.log("Checking if these attackers have an allowed attack");


    dangerousIps.forEach(function (user) {
        client.search({
            index: index,
            type: type,
            body: {
                query: {
                    bool:{
                        must: {
                            match:{
                                "properties.srcip": user
                            }
                        },
                        must_not: {
                            match:{
                                "properties.action":'deny'
                            }
                        }
                    }
                }
            }
        }).then(function (resp) {
            console.log("Attacks from "+ user);
            var allowedAttacks = resp.hits.hits;
            var dstPorts=[];
            var mostRecentTime = 0;
            if(allowedAttacks.length > 0){
                allowedAttacks.forEach(function (attack) {
                    var result = attack._source;
                    console.log(result);
                    var timestamp = result["@timestamp"];
                    if(timestamp > mostRecentTime){
                        mostRecentTime = timestamp;
                    }
                    dstPorts.push(result.dst_port);
                });

                if(output.equals('incident')){
                    createIncident(user,dstPorts,mostRecentTime);
                }
            }else{
                console.log("No allowed attacks from this source")
            }
        },function (err) {
            console.trace(err.message);
        });
    });
};
var createIncident = function(user,dstPorts,mostRecentTime){
    var loomUrl = httpHttps + '://' + hostname + '.loomsystems.com/api/v1/incidents';


    var data = JSON.stringify({
        "id": 115211,
        "occurrenceTime": mostRecentTime,
        "routingTime": Date.now(),
        "routingLastUpdateTime": Date.now(),
        "topAlerts": [
            {
                "id": 1659260834,
                "name": "type.meter.manual.54",
                "alertType": "Manual",
                "anomalyType": "MANUAL",
                "occurrenceTime": mostRecentTime,
                "routingTime": Date.now(),
                "metric": {
                    "type": "ManualMetric",
                    "properties": {
                        "application": "",
                        "service": "",
                        "manualAlertId": 54,
                        "totalOccurrences": 33,
                        "type": "MANUAL",
                        "numOfOccurrences": 0.009166666666666667
                    }
                },
                "patternExamples": [
                    "TSDBSyncRetry: Failed retrying to connect to graphite",
                    "TSDBSyncRetry: Failed retrying to connect to graphite",
                    "TSDBSyncRetry: Failed retrying to connect to graphite",
                    "TSDBSyncRetry: Failed retrying to connect to graphite",
                    "TSDBSyncRetry: Failed retrying to connect to graphite",
                    "TSDBSyncRetry: Failed retrying to connect to graphite",
                    "TSDBSyncRetry: Failed retrying to connect to graphite",
                    "TSDBSyncRetry: Failed retrying to connect to graphite",
                    "TSDBSyncRetry: Failed retrying to connect to graphite",
                    "TSDBSyncRetry: Failed retrying to connect to graphite"
                ],
                "patternPartsWithExamples": [
                    {
                        "value": "TSDBSyncRetry: Failed retrying to connect to graphite",
                        "examples": []
                    }
                ],
                "insights": [],
                "application": "",
                "service": "",
                "properties": [
                    {
                        "Host": hostname
                    },
                    {
                        "Logger": ""
                    },
                    {
                        "LocalPort": ""
                    },
                    {
                        "hostname": hostname
                    },
                    {
                        "thread": ""
                    },
                    {
                        "app_name ": ""
                    },
                    {
                        "severity": "ERROR"
                    }
                ],
                "changePercentage": 9.223372036854776E+18,
                "dataPoints": null,
                "indexPatternId": "[events--]YYYY.MM.DD-HH.mm",
                "autoTunerVerdict": null,
                "autoTunerScore": 0.0,
                "frequentPatternsMap": [
                    {
                        "patternPartDTOs": [
                            {
                                "value": "TSDBSyncRetry: Failed retrying to connect to graphite",
                                "examples": []
                            }
                        ],
                        "frequency": 100
                    }
                ],
                "manualAlertDTO": {
                    "id": 54,
                    "alertType": "MANUAL",
                    "name": "[Fortigate] Allowed attacks found for dangerous IPs",
                    "insight": "Fortigate have allowed an attack from IP: "+user+ " (Which is one of the TOP 10 attackers to your application)\nApplication ports that attacked: " +dstPorts.toString(),
                    "query": "",
                    "severity": "HIGH",
                    "operator": "BIGGER_EQUAL",
                    "valueCount": 30,
                    "periodAmount": 1,
                    "periodType": "HOURS",
                    "consecutivePeriodsThreshold": 1
                },
                "meaningfulFactors": null,
                "rootCauseAnalysis": {
                    "meaningfulFactors": {
                        "meaningfulFactors": []
                    },
                    "entities": {
                        "entities": []
                    },
                    "highlights": {
                        "highlights": [],
                        "sharedHost": null,
                        "sharedDay": null,
                        "sharedHour": null
                    }
                },
                "schemaVersion": 5.0,
                "annotationMap": null,
                "predictive": false
            }
        ],
        "durationInMinutes": 1,
        "severity": "HIGH",
        "state": "Dispatched",
        "correlatingTags": null,
        "suggestedCorrelators": null,
        "ongoing": false,
        "topAlertsIds": [
            1659260834
        ]
    });

    request.post({
        headers: {'content-type' : 'application/json', "x-csrf-token" : "secret", "cookie": "secret"},
        url:     loomUrl,
        body:    data
    }, function(error, response, body){
        console.log("Creating incident for IP:"+user);
        console.log("POST finished");
        console.log("HTTP Status: "+ response.statusCode);
        if(response.statusCode === 200){
            if(!incidentsCreated.has(user)){
                incidentsCreated.set(user,mostRecentTime);
            }else{
                if(incidentsCreated.get(user) < mostRecentTime){
                    incidentsCreated.set(user,mostRecentTime);
                }
            }
        }
    });
};


setInterval(searchForTopAttackers,frequency);
