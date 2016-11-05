#!/bin/bash
npm install --global pm2
pm2 start pm2-prod.json
pm2 logs