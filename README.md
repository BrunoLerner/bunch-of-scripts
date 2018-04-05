# bunch-of-scripts
Here I put together some .sh and .js scripts I did during my internship at an israeli start up

## Security related

### Fortigate logs analyzer ([fortigateAttacksAnalyzer.js](https://github.com/BrunoLerner/bunch-of-scripts/blob/master/fortigateAttacksAnalyzer.js))
* Problem - One of the company's client is a huge insurance company in Israel, and they were target of a bunch of attacker, so they use Fortigate firewalls, but it produces a huge amount of logs and it has to be parsed.
* How I solved it - This script query the logs in elasticsearch and keeps track of the top 10 attackers (the ones that tries the most), and it checks for these specifics IP's if there was a recent attack, and then it notifies who should be notified

## Notifications related

### FTP listener ([folderListener.sh](https://github.com/BrunoLerner/bunch-of-scripts/blob/master/folderListener.sh))
* Problem - The most common way clients used to send data to the company was via FTP, and sometimes it used to get errors and nobody knew about them
* How I solved it - I've made a .sh script that notifies slack whenever a user sent data via FTP. So when they were expecting for receiving user's data, they should also expect the notification in slack

### User engagement Notificator ([crmNotificator.js](https://github.com/BrunoLerner/bunch-of-scripts/blob/master/crmNotificator.js))
* Problem - They should know when a user was using their platform so they could be there to help them if they have a problem
* How I solved it - I've made a script that polls intercom's web API and check for the last events to notify slack if a user that haven't been using the platform for a long time was now using

## AWS related

### S3 Mounter ([s3Mounter.sh](https://github.com/BrunoLerner/bunch-of-scripts/blob/master/s3Mounter.sh))

* Problem - FTP server was getting too much files, and people used to get this files and put it in S3 buckets for each client manually
* How I solved it - I've mounted the S3 bucket in a folder called `/s3mnt` using `s3fs` . And for each new user, they should run this script that binds the user's folder under `/home` with the user's folder under the mounted point `/s3mnt`

### Route53 Cleaner ([AWSRoute53Cleaner.js](https://github.com/BrunoLerner/bunch-of-scripts/blob/master/AWSRoute53Cleaner.js))

* Problem - The route 53 was full of domains with the wrong version and hosts used for test, and this was costing the company
* How I solved it - The script checks the domains with a mismatch of version by comparing to versions listed in a sheet produced by another script
