'use strict';

const
    spawn = require('child_process').spawn,
    rp = require('request-promise-native'),
    GoogleSpreadsheet = require('google-spreadsheet'),
    fs=require('fs');

var doc = new GoogleSpreadsheet('......');
var creds = require('./service-account-creds.json');
var sheet;
var domainsToDelete = [];
var domainsIPs = new Map()

var sheetPromise = new Promise(function (resolve) {
    doc.useServiceAccountAuth(creds, function (err) {
        if (err !== undefined) {
            console.error('Failed to set sheets auth: ' + err);
            process.exit(14);
        }
        
        doc.getInfo(function(err, info) {
            if (err !== null) {
                console.error('Failed to get document info: ' + err);
                process.exit(15);
            }
            console.log('Loaded doc: '+info.title+' by '+info.author.email);
            sheet = info.worksheets[1];
            console.log('sheet : '+sheet.title+' '+sheet.rowCount+'x'+sheet.colCount);
            sheet.getCells({
                'min-row' : 1,
                'max-row' : 300,
                'return-empty' : false
            },function(err,cells){
                cells.forEach(function(cell){
                if(cell.row != 1){
                    domainsToDelete.push(cell.value);
                }
            });
            // console.log(domainsToDelete);
            resolve(domainsToDelete);
    });
        });
    });
});


function concatTypedArrays(a, b) { // a, b TypedArray of same type
    var c = new (a.constructor)(a.length + b.length);
    c.set(a, 0);
    c.set(b, a.length);
    return c;
}


sheetPromise.then(function (domains) {

    const ls = spawn('aws', ['route53', 'list-resource-record-sets', '--hosted-zone-id', 'nothing']);
    var chunks = [];
    ls.stdout.on('data', data => {
        chunks.push(data);
        // console.log(data)
    });

    ls.stderr.on('data', data => {
        console.log(`stderr: ${data}`);
    });

    return new Promise(function (resolve, reject) {
        ls.on('close', code => {
            console.log(`child process exited with code ${code}`);
            var completeResponse = chunks.reduce((a, b) => concatTypedArrays(a, b), new (chunks[0].constructor)(0)).toString();
            //console.log(completeResponse)

            JSON.parse(completeResponse).ResourceRecordSets
                .filter(z => z.Type == "A")
                .filter(z => domains.includes(z.Name))
                .forEach(function (entry) {
                    domainsIPs.set(entry.Name, entry.ResourceRecords[0].Value);
                });
            //console.log(domainsIPs);
            resolve(domains);
        });
    });
}).then(function (domains) {
    var changes = domains.map(d => {
        return {
            "Action": "DELETE",
            "ResourceRecordSet": {
                "Name": d,
                "Type": "A",
                "TTL": 300,
                "ResourceRecords": [
                    {
                        "Value": domainsIPs.get(d)
                    }
                ]
            }
        }
    });

    var actionData = JSON.stringify({
        "Comment": "deleting domain names that doesnt have a version",
        "Changes": changes
    });

    fs.writeFile("change-resource-record-sets.json",actionData)

    const ls = spawn('aws', ['route53', 'change-resource-record-sets', '--hosted-zone-id', 'nothing', '--change-batch', "file://./change-resource-record-sets.json"]);
    var chunks = [];
    ls.stdout.on('data', data => {
        chunks.push(data);
        console.log(data);
    });

    ls.stderr.on('data', data => {
        console.log(`stderr: ${data}`);
    });

    ls.on('close', code => {
        console.log(`child process exited with code ${code}`);

    });
});
