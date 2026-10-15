#!/bin/bash
set -e
source /home/iskotwfh/nodevenv/ldss-monitor/22/bin/activate
cd /home/iskotwfh/ldss-monitor
export DB_HOST=localhost DB_NAME=iskotwfh_ldss_monitor DB_USER=iskotwfh_monitor
unset DB_PASSWORD
trap 'unset DB_PASSWORD' EXIT
IFS= read -r -s -p 'Database password (hidden): ' DB_PASSWORD
printf '\n'
export DB_PASSWORD
node hosting/preflight.mjs
