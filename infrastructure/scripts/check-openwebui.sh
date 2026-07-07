#!/bin/bash
# Check OptamusUI status
echo '=== Container Status ==='
docker ps --filter name=optamusui --format "table {{.Names}}\t{{.Status}}"

echo ''
echo '=== Logs ==='
docker logs infrastructure-optamusui-1 2>&1 | tail -10
