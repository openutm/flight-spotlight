# Flight Spotlight Installation Instructions

## Introduction

This document goes through a step-by-step process to setup and create a server to install Flight Spotlight. Flight Spotlight is a Node JS Application and uses the [Tile 38](https://www.tile38.com) server as a backend. In addition, access is protected by the [Flight Passport](https://github.com/openskies-sh/flight_passport), you can choose to install your own server (not covered in this guide) or you can use [Openskies ID](https://id.openskies.sh) to get started. We will refer to well known guides on [DigitalOcean](https://www.digitalocean.com/) to do basic

### Outcome and Experience

This guide assumes that you have access to a Ubuntu virtual server and have root access to it, it also assumes basic profiency with Linux commands and server setup. If you dont have the adequate knowledge, please open a issue and we can help you.

## Stage 1 Intial Setup: Setup Ubuntu Server  

1. Assuming that you have Ubuntu 20.04 (LTS) installed, please follow the "[Initial Setup Guide](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu-20-04)", in this case your username should be `flightspotlight` or something similar.
2. It is recommended that you use SSH keys to access the server, it may already be setup for you but if not the guide above has instructions to create a SSH key.

### Install NodeJS

Flight Spotlight is a Node JS based application. In this section we will install Node JS and the `npm` package manager.

1. Follow the Node JS [installation instructions](https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-ubuntu-20-04), here only use Option 1 "Installing Node.js with Apt from the Default Repositories", you can ignore Option 2 and Option 3.

### Download and Run Tile 38 Server

We will download the opensource [Tile 38](https://tile38.com) server, this server acts as a backend the Node frontend.

1. Tile 38 is avaiable as a Docker service, if you are familiar with Docker, you can use that. 
2. We will follow the instrcutions on the releases page. 
    ```
    curl -L  https://github.com/tidwall/tile38/releases/download/1.21.1/tile38-1.21.1-linux-amd64.tar.gz -o tile38.tar.gz
    tar xzvf tile38.tar.gz
    cd tile38
    ./tile38-server

    ```
3. You should see the server running in the console. Press `Ctrl+C` on the console to exit out. You have now downloaded and run the Tile38 server locally.
