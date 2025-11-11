#!/bin/bash
set -e
API_BASE_URL=${API_BASE_URL:?Debes definir API_BASE_URL}
sed -i "s|\${API_BASE_URL}|$API_BASE_URL|g" src/environments/environment.prod.ts
