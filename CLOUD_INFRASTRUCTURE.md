# Cloud Infrastructure Setup Guide

This document provides comprehensive instructions for setting up the cloud infrastructure for the AI Tutoring Platform.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Infrastructure Components](#infrastructure-components)
4. [Deployment Options](#deployment-options)
5. [Terraform Deployment](#terraform-deployment)
6. [Kubernetes Deployment](#kubernetes-deployment)
7. [Database Setup](#database-setup)
8. [Redis Cluster Configuration](#redis-cluster-configuration)
9. [CDN and Load Balancer](#cdn-and-load-balancer)
10. [Monitoring and Logging](#monitoring-and-logging)
11. [Security Configuration](#security-configuration)
12. [Scaling and Performance](#scaling-and-performance)
13. [Disaster Recovery](#disaster-recovery)
14. [Cost Optimization](#cost-optimization)

## Overview

The AI Tutoring Platform infrastructure is designed for high availability, scalability, and security. It uses:

- **Kubernetes (GKE)** for container orchestration
- **Cloud SQL (PostgreSQL)** for relational data
- **MongoDB** for document storage
- **Cloud Memorystore (Redis)** for caching
- **Cloud CDN** for static asset delivery
- **Cloud Load Balancing** for traffic distribution
- **Cloud Armor** for DDoS protection

## Prerequisites

### Required Tools

```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Install kubectl
gcloud components install kubectl

# Install Terraform
brew install terraform  # macOS
# or download from https://www.terraform.io/downloads

# Install Helm
brew install helm  # macOS
```

### GCP Project Setup

```bash
# Set your project ID
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable \
  container.googleapis.com \
  compute.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  servicenetworking.googleapis.com \
  cloudresourcemanager.googleapis.com
```

## Infrastructure Components

### 1. Kubernetes Cluster (GKE)

- **Node Pool**: 3-10 nodes (auto-scaling)
- **Machine Type**: n2-standard-4 (4 vCPU, 16 GB RAM)
- **Disk**: 100 GB SSD per node
- **Features**: Workload Identity, Binary Authorization, Network Policy

### 2. Databases

#### PostgreSQL (Cloud SQL)
- **Tier**: db-n1-standard-4
- **Storage**: 100 GB SSD (auto-resize enabled)
- **Availability**: Regional (HA)
- **Backups**: Daily with 30-day retention, PITR enabled

#### MongoDB
- **Deployment**: StatefulSet in GKE
- **Replicas**: 3 (replica set)
- **Storage**: 100 GB SSD per replica

#### Redis (Cloud Memorystore)
- **Tier**: Standard HA
- **Memory**: 5 GB
- **Version**: Redis 7.0

### 3. Load Balancer and CDN

- **Type**: Global HTTP(S) Load Balancer
- **SSL**: Managed SSL certificates
- **CDN**: Enabled for static assets
- **Security**: Cloud Armor with rate limiting

## Deployment Options

### Option 1: Terraform (Recommended)

Terraform provides infrastructure as code for reproducible deployments.

### Option 2: Manual Kubernetes

Deploy directly to an existing Kubernetes cluster using kubectl.

## Terraform Deployment

### Step 1: Configure Variables

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
```

### Step 2: Initialize Terraform

```bash
terraform init
```

### Step 3: Plan Deployment

```bash
terraform plan
```

### Step 4: Apply Configuration

```bash
terraform apply
```

This will create:
- VPC network and subnets
- GKE cluster with node pool
- Cloud SQL PostgreSQL instance
- Cloud Memorystore Redis instance
- Load balancer and CDN
- Security policies

### Step 5: Configure kubectl

```bash
gcloud container clusters get-credentials ai-tutoring-platform-cluster \
  --region us-central1 \
  --project $PROJECT_ID
```

### Step 6: Verify Cluster

```bash
kubectl cluster-info
kubectl get nodes
```

## Kubernetes Deployment

### Step 1: Update Secrets

```bash
cd k8s
cp secrets.yaml secrets.yaml.backup
# Edit secrets.yaml with actual values
```

**Important**: Never commit secrets.yaml with real values to version control!

### Step 2: Deploy Infrastructure

```bash
./deploy.sh
```

This script will:
1. Create namespace
2. Apply secrets and config maps
3. Deploy databases (PostgreSQL, MongoDB, Redis)
4. Wait for databases to be ready
5. Deploy application services
6. Configure ingress and SSL

### Step 3: Verify Deployment

```bash
# Check all resources
kubectl get all -n ai-tutoring-platform

# Check pods
kubectl get pods -n ai-tutoring-platform

# Check services
kubectl get svc -n ai-tutoring-platform

# Check ingress
kubectl get ingress -n ai-tutoring-platform
```

### Step 4: Get Load Balancer IP

```bash
kubectl get ingress main-ingress -n ai-tutoring-platform \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

### Step 5: Configure DNS

Point your domain DNS records to the load balancer IP:

```
A    ai-tutoring-platform.com          -> <LOAD_BALANCER_IP>
A    www.ai-tutoring-platform.com      -> <LOAD_BALANCER_IP>
A    api.ai-tutoring-platform.com      -> <LOAD_BALANCER_IP>
A    admin.ai-tutoring-platform.com    -> <LOAD_BALANCER_IP>
```

## Database Setup

### PostgreSQL Initialization

```bash
# Connect to PostgreSQL pod
kubectl exec -it postgres-0 -n ai-tutoring-platform -- psql -U postgres

# Run migrations
kubectl exec -it deployment/auth-service -n ai-tutoring-platform -- \
  npm run migrate
```

### MongoDB Initialization

```bash
# Connect to MongoDB
kubectl exec -it mongodb-0 -n ai-tutoring-platform -- mongosh

# Initialize replica set
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongodb-0.mongodb-service:27017" },
    { _id: 1, host: "mongodb-1.mongodb-service:27017" },
    { _id: 2, host: "mongodb-2.mongodb-service:27017" }
  ]
})
```

## Redis Cluster Configuration

### Initialize Redis Cluster

```bash
# Get Redis pod IPs
REDIS_NODES=$(kubectl get pods -n ai-tutoring-platform \
  -l app=redis-cluster -o jsonpath='{range.items[*]}{.status.podIP}:6379 ')

# Create cluster
kubectl exec -n ai-tutoring-platform redis-cluster-0 -- \
  redis-cli --cluster create $REDIS_NODES \
  --cluster-replicas 1 --cluster-yes
```

### Verify Cluster

```bash
kubectl exec -n ai-tutoring-platform redis-cluster-0 -- \
  redis-cli cluster info
```

## CDN and Load Balancer

### Configure Cloud CDN

The CDN is automatically configured via Terraform. To verify:

```bash
gcloud compute backend-services describe \
  ai-tutoring-platform-cluster-frontend-backend \
  --global
```

### Configure SSL Certificates

SSL certificates are automatically provisioned via cert-manager. To check status:

```bash
kubectl get certificate -n ai-tutoring-platform
kubectl describe certificate tls-secret -n ai-tutoring-platform
```

### Test Load Balancer

```bash
# Get load balancer IP
LB_IP=$(kubectl get ingress main-ingress -n ai-tutoring-platform \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Test HTTP (should redirect to HTTPS)
curl -I http://$LB_IP

# Test HTTPS
curl -I https://ai-tutoring-platform.com
```

## Monitoring and Logging

### Enable Monitoring

```bash
# Install Prometheus and Grafana
kubectl apply -f ../monitoring/docker-compose.monitoring.yml
```

### View Logs

```bash
# View logs for a service
kubectl logs -f deployment/auth-service -n ai-tutoring-platform

# View logs for all pods
kubectl logs -f -l tier=backend -n ai-tutoring-platform

# Stream logs to Cloud Logging
gcloud logging read "resource.type=k8s_container" --limit 50
```

### Access Grafana

```bash
kubectl port-forward -n monitoring svc/grafana 3000:3000
# Open http://localhost:3000
```

## Security Configuration

### Network Policies

Network policies are automatically applied to restrict traffic between pods.

```bash
# Verify network policies
kubectl get networkpolicies -n ai-tutoring-platform
```

### Secrets Management

Use Google Secret Manager for production secrets:

```bash
# Create secret in Secret Manager
echo -n "my-secret-value" | gcloud secrets create my-secret --data-file=-

# Grant access to service account
gcloud secrets add-iam-policy-binding my-secret \
  --member="serviceAccount:ai-tutoring-platform-nodes@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Enable Binary Authorization

```bash
gcloud container binauthz policy import policy.yaml
```

## Scaling and Performance

### Horizontal Pod Autoscaling

HPA is configured for all services. To view:

```bash
kubectl get hpa -n ai-tutoring-platform
```

### Cluster Autoscaling

Node pool autoscaling is configured via Terraform (3-10 nodes).

### Manual Scaling

```bash
# Scale a deployment
kubectl scale deployment auth-service -n ai-tutoring-platform --replicas=5

# Scale node pool
gcloud container clusters resize ai-tutoring-platform-cluster \
  --node-pool=ai-tutoring-platform-cluster-node-pool \
  --num-nodes=5 \
  --region=us-central1
```

## Disaster Recovery

### Database Backups

#### PostgreSQL
- Automated daily backups with 30-day retention
- Point-in-time recovery enabled

```bash
# List backups
gcloud sql backups list --instance=ai-tutoring-platform-cluster-postgres

# Restore from backup
gcloud sql backups restore BACKUP_ID \
  --backup-instance=ai-tutoring-platform-cluster-postgres \
  --backup-id=BACKUP_ID
```

#### MongoDB
```bash
# Manual backup
kubectl exec mongodb-0 -n ai-tutoring-platform -- \
  mongodump --out=/backup/$(date +%Y%m%d)

# Copy backup locally
kubectl cp ai-tutoring-platform/mongodb-0:/backup ./mongodb-backup
```

### Cluster Backup

```bash
# Backup cluster configuration
kubectl get all -n ai-tutoring-platform -o yaml > cluster-backup.yaml
```

## Cost Optimization

### Right-sizing Resources

Monitor resource usage and adjust:

```bash
# View resource usage
kubectl top nodes
kubectl top pods -n ai-tutoring-platform
```

### Use Preemptible Nodes (Non-production)

For development/staging, use preemptible nodes to save costs:

```terraform
node_config {
  preemptible = true
  # ...
}
```

### Enable Cluster Autoscaling

Ensure autoscaling is enabled to scale down during low traffic.

### Use Cloud CDN

CDN reduces origin traffic and costs.

### Monitor Costs

```bash
# View cost breakdown
gcloud billing accounts list
gcloud billing projects describe $PROJECT_ID
```

## Troubleshooting

### Pod Not Starting

```bash
kubectl describe pod <pod-name> -n ai-tutoring-platform
kubectl logs <pod-name> -n ai-tutoring-platform
```

### Database Connection Issues

```bash
# Test PostgreSQL connection
kubectl exec -it postgres-0 -n ai-tutoring-platform -- \
  psql -U postgres -c "SELECT 1"

# Test Redis connection
kubectl exec -it redis-cluster-0 -n ai-tutoring-platform -- \
  redis-cli ping
```

### Ingress Not Working

```bash
# Check ingress status
kubectl describe ingress main-ingress -n ai-tutoring-platform

# Check cert-manager
kubectl get certificate -n ai-tutoring-platform
kubectl logs -n cert-manager deployment/cert-manager
```

### High Latency

```bash
# Check pod resource usage
kubectl top pods -n ai-tutoring-platform

# Check HPA status
kubectl get hpa -n ai-tutoring-platform

# Check node resource usage
kubectl top nodes
```

## Cleanup

### Destroy Infrastructure

```bash
# Using Terraform
cd terraform
terraform destroy

# Using kubectl
cd k8s
./teardown.sh
```

**Warning**: This will delete all data. Ensure backups are taken before destroying infrastructure.

## Support

For issues or questions:
- Check logs: `kubectl logs -f <pod-name> -n ai-tutoring-platform`
- Review events: `kubectl get events -n ai-tutoring-platform`
- Contact DevOps team: devops@ai-tutoring-platform.com

## References

- [GKE Documentation](https://cloud.google.com/kubernetes-engine/docs)
- [Cloud SQL Documentation](https://cloud.google.com/sql/docs)
- [Cloud Memorystore Documentation](https://cloud.google.com/memorystore/docs)
- [Terraform GCP Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
