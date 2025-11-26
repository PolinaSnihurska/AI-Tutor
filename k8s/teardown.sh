#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${RED}WARNING: This will delete all resources in the ai-tutoring-platform namespace!${NC}"
read -p "Are you sure you want to continue? (yes/NO) " -r
echo

if [[ ! $REPLY == "yes" ]]; then
    echo -e "${YELLOW}Teardown cancelled.${NC}"
    exit 0
fi

echo -e "${YELLOW}Starting teardown...${NC}"

# Delete ingress first
echo -e "${YELLOW}Deleting ingress...${NC}"
kubectl delete -f ingress.yaml --ignore-not-found=true

# Delete services
echo -e "${YELLOW}Deleting application services...${NC}"
kubectl delete -f frontend.yaml --ignore-not-found=true
kubectl delete -f admin-service.yaml --ignore-not-found=true
kubectl delete -f learning-plan-service.yaml --ignore-not-found=true
kubectl delete -f analytics-service.yaml --ignore-not-found=true
kubectl delete -f test-service.yaml --ignore-not-found=true
kubectl delete -f ai-service.yaml --ignore-not-found=true
kubectl delete -f auth-service.yaml --ignore-not-found=true

# Delete databases
echo -e "${YELLOW}Deleting databases...${NC}"
kubectl delete -f redis-cluster.yaml --ignore-not-found=true
kubectl delete -f mongodb-statefulset.yaml --ignore-not-found=true
kubectl delete -f postgres-statefulset.yaml --ignore-not-found=true

# Delete PVCs
echo -e "${YELLOW}Deleting persistent volume claims...${NC}"
kubectl delete pvc --all -n ai-tutoring-platform

# Delete config and secrets
echo -e "${YELLOW}Deleting config maps and secrets...${NC}"
kubectl delete -f configmap.yaml --ignore-not-found=true
kubectl delete -f secrets.yaml --ignore-not-found=true

# Delete network policies
echo -e "${YELLOW}Deleting network policies...${NC}"
kubectl delete -f network-policy.yaml --ignore-not-found=true

# Delete namespace
echo -e "${YELLOW}Deleting namespace...${NC}"
kubectl delete -f namespace.yaml --ignore-not-found=true

echo -e "${GREEN}Teardown completed!${NC}"
