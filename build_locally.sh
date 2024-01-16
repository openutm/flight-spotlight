#!/usr/bin/env bash

APP=flight-spotlight
docker build --platform linux/amd64 -t "openskiessh/$APP" .
