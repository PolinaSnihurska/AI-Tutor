#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Kubernetes deployment for AI Tutoring Platform${NC}"

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}kubectl is not installed. Please install kubectl first.${NC}"
    exit 1
fi

# Check if cluster is accessible
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}Cannot connect to Kubernetes cluster. Please check your kubeconfig.${NC}"
    exit 1
fi

# Create namespace
echo -e "${YELLOW}Creating namespace...${NC}"
kubectl apply -f namespace.yaml

# Create storage class
echo -e "${YELLOW}Creating storage class...${NC}"
kubectl apply -f storage-class.yaml

# Create secrets (ensure secrets.yaml is updated with actual values)
echo -e "${YELLOW}Creating secrets...${NC}"
if grep -q "REPLACE_WITH_ACTUAL" secrets.yaml; then
    echo -e "${RED}WARNING: secrets.yaml contains placeholder values!${NC}"
    echo -e "${RED}Please update secrets.yaml with actual values before deploying.${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
kubectl apply -f secrets.yaml

# Create config maps
echo -e "${YELLOW}Creating config maps...${NC}"
kubectl apply -f configmap.yaml

# Deploy databases
echo -e "${YELLOW}Deploying PostgreSQL...${NC}"
kubectl apply -f postgres-statefulset.yaml

echo -e "${YELLOW}Deploying MongoDB...${NC}"
kubectl apply -f mongodb-statefulset.yaml

echo -e "${YELLOW}Deploying Redis Cluster...${NC}"
kubectl apply -f redis-cluster.yaml

# Wait for databases to be ready
echo -e "${YELLOW}Waiting for databases to be ready...${NC}"
kubectl wait --for=condition=ready pod -l app=postgres -n ai-tutoring-platform --timeout=300s
kubectl wait --for=condition=ready pod -l app=mongodb -n ai-tutoring-platform --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis-cluster -n ai-tutoring-platform --timeout=300s

# Initialize Redis cluster
echo -e "${YELLOW}Initializing Redis cluster...${NC}"
REDIS_NODES=$(kubectl get pods -n ai-tutoring-platform -l app=redis-cluster -o jsonpath='{range.items[*]}{.status.podIP}:6379 ')
kubectl exec -n ai-tutoring-platform redis-cluster-0 -- redis-cli --cluster create $REDIS_NODES --cluster-replicas 1 --cluster-yes

# Deploy application services
echo -e "${YELLOW}Deploying application services...${NC}"
kubectl apply -f auth-service.yaml
kubectl apply -f ai-service.yaml
kubectl apply -f test-service.yaml
kubectl apply -f analytics-service.yaml
kubectl apply -f learning-plan-service.yaml
kubectl apply -f admin-service.yaml
kubectl apply -f frontend.yaml

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
kubectl wait --for=condition=available deployment --all -n ai-tutoring-platform --timeout=300s

# Install cert-manager if not already installed
if ! kubectl get namespace cert-manager &> /dev/null; then
    echo -e "${YELLOW}Installing cert-manager...${NC}"
    kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
    kubectl wait --for=condition=available deployment --all -n cert-manager --timeout=300s
fi

# Create certificate issuers
echo -e "${YELLOW}Creating certificate issuers...${NC}"
kubectl apply -f cert-manager.yaml

# Deploy ingress
echo -e "${YELLOW}Deploying ingress...${NC}"
kubectl apply -f ingress.yaml

# Apply network policies
echo -e "${YELLOW}Applying network policies...${NC}"
kubectl apply -f network-policy.yaml

# Get ingress IP
echo -e "${YELLOW}Waiting for ingress to get external IP...${NC}"
sleep 10
INGRESS_IP=$(kubectl get ingress main-ingress -n ai-tutoring-platform -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}Ingress IP: ${INGRESS_IP}${NC}"
echo -e "${YELLOW}Please update your DNS records to point to this IP address.${NC}"
echo ""
echo -e "${YELLOW}To check the status of your deployment:${NC}"
echo "kubectl get all -n ai-tutoring-platform"
echo ""
echo -e "${YELLOW}To view logs:${NC}"
echo "kubectl logs -f deployment/<service-name> -n ai-tutoring-platform"
