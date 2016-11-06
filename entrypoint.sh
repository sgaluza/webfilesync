#!/bin/bash
npm install --global pm2 babel-cli
pm2 start pm2-prod.json
pm2 logs