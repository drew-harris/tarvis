#!/usr/bin/env bash
ssh root@cloud-enterprises "cd tarvis && git pull && docker compose -f prod-compose.yml up --build -d"
