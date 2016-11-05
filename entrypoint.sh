#!/bin/bash
npm install --global pm2
cd src
npm install
pm2 start pm2-prod.json
pm2 logs