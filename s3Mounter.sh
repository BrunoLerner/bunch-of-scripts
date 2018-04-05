#! /bin/bash

# assuming that /s3mnt was mounted with s3fs
sudo mkdir /s3mnt/$USERNAME

# Now we bind this new folder with the user's home folder
sudo mount --bind /s3mnt/$USERNAME /home/$USERNAME
sudo mkdir -p /home/$USERNAME/upload_to_this_directory
sudo mkdir -p /home/$USERNAME/download_from_this_directory

...
