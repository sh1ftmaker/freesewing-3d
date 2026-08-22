#!/bin/bash
# Much to my ... let's say surprise ... the only way to run the console
# inside this container is to attach to it. Which requires the -it startup
# flags, but those are incompatible with running as a systemd service.
#
# So, this script runs the container with the same config as systemd, but
# interactively.
#
# To use this, first stop the service:
# sudo systemctl stop continuity
#
# Then run this script

# Config from service file
CONTINUWUITY_CONFIG_ROOT=/etc/continuwuity
CONTINUWUITY_DATA_ROOT=/data/continuwuity
CONTINUWUITY_LOGS_ROOT=/var/log/continuwuity

# First make sure the service is stopped
sudo systemctl stop continuwuity

# Start the container with -it
sudo docker run --rm \
  --name=continuwuity \
  --hostname=continuwuity \
  --log-driver=journald \
  --log-opt labels=continuwuity.service \
  --network=morionet \
  --network-alias=continuwuity.internal \
  -v "${CONTINUWUITY_CONFIG_ROOT}:/etc/continuwuity" \
  -v "${CONTINUWUITY_DATA_ROOT}/data:/var/lib/conduwuit" \
  -v "${CONTINUWUITY_DATA_ROOT}/backups:/var/lib/conduwuit-backups" \
  -v "${CONTINUWUITY_LOGS_ROOT}:/var/log/continuwuity" \
  -e "CONTINUWUITY_CONFIG=/etc/continuwuity/config.toml" \
  -it \
  jadedblueeyes/continuwuit:v26.7.3-maxperf
