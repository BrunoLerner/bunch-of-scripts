#!/bin/bash
sudo inotifywait -m -r -e moved_to,delete,create /home |
while read path action; do
	if [[ $action == *",ISDIR"* ]]; then
		IFS=',' read -r -a array <<< "$action"
		curl -H "Content-Type: application/x-www-form-urlencoded" -X POST -d "token=secret&text=${array[0]} a directory on $path" https://slack.com/api/chat.postMessage
	else
		curl -H "Content-Type: application/x-www-form-urlencoded" -X POST -d "token=secret&channel=#ftpserver&text=$action on $path" https://slack.com/api/chat.postMessage
	fi    
done
