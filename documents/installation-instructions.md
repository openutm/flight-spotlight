# Flight Spotlight Installation Instructions

- [Flight Spotlight Installation Instructions](#flight-spotlight-installation-instructions)
  - [Introduction](#introduction)
    - [Outcome and Experience](#outcome-and-experience)
  - [Stage 1 Initial Setup (Basic server setup)](#stage-1-initial-setup-basic-server-setup)
    - [1.1 Setup Ubuntu Server](#11-setup-ubuntu-server)
  - [Stage 2 Initial Setup (Docker and Docker Compose)](#stage-2-initial-setup-docker-and-docker-compose)
    - [2.1 Install Docker and Docker Compose](#21-install-docker-and-docker-compose)
  - [Stage 3 Clone Repository](#stage-3-clone-repository)
    - [3.1 Download the software and setup Environment variables](#31-download-the-software-and-setup-environment-variables)
  - [Stage 4 Final Stage Configure NGINX Reverse Proxy](#stage-4-final-stage-configure-nginx-reverse-proxy)
    - [4.1 Install NGINX as reverse proxy](#41-install-nginx-as-reverse-proxy)
    - [4.2 Install Lets Encrypt Certificate for SSL](#42-install-lets-encrypt-certificate-for-ssl)

## Introduction

This document goes through a step-by-step process to setup and create a server to install Flight Spotlight. Flight Spotlight is a Node JS Application and uses the [Tile 38](https://www.tile38.com) server as a backend. In addition, access is protected by the [Flight Passport](https://github.com/openskies-sh/flight_passport), you can choose to install your own server (not covered in this guide) or you can use [Openskies ID](https://id.openskies.sh) to get started. We will refer to well known guides on [DigitalOcean](https://www.digitalocean.com/) since they provide a great basis to start.

### Outcome and Experience

This guide assumes that you have access to a Ubuntu virtual server and have root access to it, it also assumes basic profiency with Linux commands and server setup. If you don't have the adequate knowledge, please open a issue and we can help you.

## Stage 1 Initial Setup (Basic server setup)

### 1.1 Setup Ubuntu Server  

1. Assuming that you have Ubuntu 20.04 (LTS) installed, please follow the [Initial Setup Guide](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu-20-04), in this case your username should be `flightspotlight` or something similar.
2. It is recommended that you use SSH keys to access the server, it may already be setup for you but if not the guide above has instructions to create a SSH key.
3. After completing the steps in the guide, you should login in to the console using the newly created user and update the system.

## Stage 2 Initial Setup (Docker and Docker Compose)

### 2.1 Install Docker and Docker Compose

We recommend that you use Flight Spotlight Docker Compose for installation and running it. This method is recommended since all the orchestration is done by Docker and installation is straight forward. We will install Docker tools on Ubuntu now. To install Docker on Ubuntu 20.04 follow the steps in the [Install Docker guide](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-docker-on-ubuntu-20-04)

1. Follow Step 1 in the guide above, once you have installed `docker-ce` you should be able to run `sudo systemctl status docker` to see Docker running.
2. We will now install Docker Compose, you can choose to install directly from repository or use the apt command `sudo apt install docker-compose`
3. Check Docker compose is installed properly `docker-compose version`

We now have Ubuntu, Docker and Docker Compose Installed

## Stage 3 Clone Repository

We will clone the Github repository and download load the latest Docker Compose file.

### 3.1 Download the software and setup Environment variables

1. In the console execute the following command `git clone https://github.com/openskies-sh/flight-spotlight`
2. Enter the directory `cd flight-spotlight`
3. Copy the sample .env file: `cp .env.sample .env`
4. Open the .env file and fill out the credentials `nano .env`
5. You will need help to fill out the all the links, since this is associated with Authentication, in short, it will ask you to point to a Flight Spotlight or any other OAUTH2 / OpenID Connect (OIDC) provider for credentials.
6. Finally run the installation by typing `docker-compose up`
7. There are additional options for Docker Compose e.g. `docker-compose up -d`, it is recommended that you familiarize yourself with the software.

## Stage 4 Final Stage Configure NGINX Reverse Proxy

We will now install Nginx and point it to the Docker Compose instance running in the server. Securing a NGINX installation is a wide and complex topic we will not cover this in this guide.

### 4.1 Install NGINX as reverse proxy

In this section we will install Nginx and have the node app as a reverse proxy, we will follow the steps detailed in the [install NGINX](https://www.digitalocean.com/community/tutorials/how-to-install-nginx-on-ubuntu-20-04) guide.

1. We will setup the default site at `sudo nano /etc/nginx/sites-available/default`
2. Paste the following block this will point nginx to the docker-compose installation
   
   ```
    location / {
            proxy_pass http://localhost:5000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

   ```
3. Check for nginx settings file `sudo nginx -t`
4. Restart nginx `sudo systemctl restart nginx`

### 4.2 Install Lets Encrypt Certificate for SSL 

TBC, more information [here](https://www.digitalocean.com/community/tutorials/how-to-secure-nginx-with-let-s-encrypt-on-ubuntu-20-04)

Go to the IP of the instance and you should see Flight Spotlight instance running.