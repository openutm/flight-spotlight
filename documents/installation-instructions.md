# Flight Spotlight Installation Instructions

## Introduction

This document goes through a step-by-step process to setup and create a server to install Flight Spotlight. Flight Spotlight is a Node JS Application and uses the [Tile 38](https://www.tile38.com) server as a backend. In addition, access is protected by the [Flight Passport](https://github.com/openskies-sh/flight_passport), you can choose to install your own server (not covered in this guide) or you can use [Openskies ID](https://id.openskies.sh) to get started. We will refer to well known guides on [DigitalOcean](https://www.digitalocean.com/) since they provide a great basis to start.

### Outcome and Experience

This guide assumes that you have access to a Ubuntu virtual server and have root access to it, it also assumes basic profiency with Linux commands and server setup. If you dont have the adequate knowledge, please open a issue and we can help you.

## Stage 1 Intial Setup

### 1.1 Setup Ubuntu Server  

1. Assuming that you have Ubuntu 20.04 (LTS) installed, please follow the "[Initial Setup Guide](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu-20-04)", in this case your username should be `flightspotlight` or something similar. Note that this guide uses the user name as `flightspotlight`, if you choose a different username, you will have to change the occurances below.
2. It is recommended that you use SSH keys to access the server, it may already be setup for you but if not the guide above has instructions to create a SSH key.

### 1.2 Install NodeJS

Flight Spotlight is a Node JS based application. In this section we will install Node JS and the `npm` package manager.

1. Follow the Node JS [installation instructions](https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-ubuntu-20-04), here only use Option 1 "Installing Node.js with Apt from the Default Repositories", you can ignore Option 2 and Option 3.

### 1.3 Download and Run Tile 38 Server

We will download the opensource [Tile 38](https://tile38.com) server, this server acts as a backend the Node frontend.

1. Tile 38 is avaiable as a Docker service, if you are familiar with Docker, you can use that.
2. We will follow the instrcutions on the releases page.
   
    ```
    curl -L  https://github.com/tidwall/tile38/releases/download/1.21.1/tile38-1.21.1-linux-amd64.tar.gz -o tile38.tar.gz
    tar xzvf tile38.tar.gz
    cd tile38-1.21.1-linux-amd64
    ./tile38-server

    ```
3. You should see the server running in the console. Press `Ctrl+C` on the console to exit out. You have now downloaded and run the Tile38 server locally.

### 1.4 Setup Tile 38 as a service

In this section we will setup Tile38 server as a Linux service.

1. In the console create a new file `sudo nano /etc/systemd/system/tile38.service`
2. Paste the following text in the file
    
    ```
    [Unit]
    Description=Tile38 service
    After=network.target
    [Service]
    ExecStart=/home/flightspotlight/tile38-1.21.1-linux-amd64/tile38-server
    WorkingDirectory=/home/flightspotlight/tile38-1.21.1-linux-amd64
    Restart=always
    RestartSec=10
    StandardOutput=syslog
    StandardError=syslog
    SyslogIdentifier=tile38-server
    User=flightspotlight
    Group=flightspotlight

    [Install]
    WantedBy=multi-user.target

    ```
3. Start the new service `systemctl start tile38`, this should start the server
4. You can see if the service running by running `sudo systemctl status tile38` and see the following output

    ```
        ● tile38.service - Tile38 service
            Loaded: loaded (/etc/systemd/system/tile38.service; enabled; vendor preset: enabled)
            Active: active (running) since Wed 2020-08-05 14:21:34 UTC; 1s ago
        Main PID: 28432 (tile38-server)
            Tasks: 6 (limit: 1137)
            Memory: 2.7M
            CGroup: /system.slice/tile38.service
                    └─28432 /home/gdhscratch/tile38-1.21.1-linux-amd64/tile38-server


    ```

### 1.5 Download and sync repository from Github

1. Go to the home directory by pressing `cd`
2. Clone the git repository `git clone https://github.com/openskies-sh/flight-spotlight.git`
3. Change the directory to flight-spotlight by `cd flight-spotlight`
4. Install the dependencies run `npm install | npm i`
5. Create process.env using `touch process.env` and fill in the variables, for more information take a look at [.env.sample](https://github.com/openskies-sh/flight-spotlight/blob/master/.env.sample)
6. You can test the installation by typing `npm start`, the server should start 

    ```

    ```