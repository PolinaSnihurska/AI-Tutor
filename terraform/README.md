# Terraform Infrastructure Configuration

This directory contains Terraform configurations for provisioning cloud infrastructure for the AI Tutoring Platform on Google Cloud Platform (GCP).

## What Gets Created

- **GKE Cluster**: Kubernetes cluster with auto-scaling node pool
- **Cloud SQL**: PostgreSQL database with HA and automated backups
- **Cloud Memorystore**: Redis cache with HA
- **VPC Network**: Private network with subnets
- **Load Balancer**: Global HTTP(S) load balancer with SSL
- **Cloud CDN**: Content delivery network for static assets
- **Cloud Armor**: DDoS protection and security policies
- **Storage Bucket**: For static assets
- **IAM**: Service accounts and permissions

## Prerequisites

1. **GCP Account** with billing enabled
2. **gcloud CLI** installed and configured
3. **Terraform** >= 1.0 installed
4. **kubectl** installed

## Setup

### 1. Configure GCP Project

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
  cloudresourcemanager.googleapis.com \
  storage-api.googleapis.com
```

### 2. Create Terraform State Bucket

```bash
# Create bucket for Terraform state
gsutil mb -p $PROJECT_ID gs://${PROJECT_ID}-terraform-state

# Enable versioning
gsutil versioning set on gs://${PROJECT_ID}-terraform-state
```

### 3. Configure Variables

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your values:

```hcl
project_id = "your-gcp-project-id"
region     = "us-central1"
zone       = "us-central1-a"

cluster_name   = "ai-tutoring-platform-cluster"
node_count     = 3
machine_type   = "n2-standard-4"
min_node_count = 3
max_node_count = 10

environment = "production"

db_tier              = "db-n1-standard-4"
db_password          = "SECURE_PASSWORD_HERE"
redis_memory_size_gb = 5
```

**Important**: Never commit `terraform.tfvars` with real credentials!

## Deployment

### Initialize Terraform

```bash
terraform init
```

This will:
- Download required providers
- Configure backend (GCS bucket)
- Initialize modules

### Plan Deployment

```bash
terraform plan
```

Review the plan to see what will be created.

### Apply Configuration

```bash
terraform apply
```

Type `yes` when prompted. This will take 15-20 minutes.

### Get Outputs

```bash
terraform output
```

Important outputs:
- `cluster_name` - GKE cluster name
- `load_balancer_ip` - Public IP for your application
- `postgres_connection_name` - Cloud SQL connection name
- `redis_host` - Redis host address
- `configure_kubectl` - Command to configure kubectl

## Post-Deployment

### Configure kubectl

```bash
# Use the command from terraform output
gcloud container clusters get-credentials ai-tutoring-platform-cluster \
  --region us-central1 \
  --project $PROJECT_ID
```

### Verify Cluster

```bash
kubectl cluster-info
kubectl get nodes
```

### Deploy Applications

```bash
cd ../k8s
./deploy.sh
```

## File Structure

```
terraform/
├── main.tf                  # Provider and backend configuration
├── variables.tf             # Variable definitions
├── outputs.tf              # Output definitions
├── gke-cluster.tf          # GKE cluster configuration
├── databases.tf            # Cloud SQL and Redis configuration
├── cdn-loadbalancer.tf     # Load balancer and CDN configuration
├── terraform.tfvars.example # Example variables file
└── README.md               # This file
```

## Configuration Details

### GKE Cluster

- **Node Pool**: Auto-scaling (3-10 nodes)
- **Machine Type**: n2-standard-4 (4 vCPU, 16 GB RAM)
- **Disk**: 100 GB SSD per node
- **Features**:
  - Workload Identity
  - Binary Authorization
  - Network Policy
  - Managed Prometheus
  - Auto-repair and auto-upgrade

### Cloud SQL (PostgreSQL)

- **Version**: PostgreSQL 15
- **Tier**: db-n1-standard-4
- **Storage**: 100 GB SSD (auto-resize)
- **Availability**: Regional (HA)
- **Backups**:
  - Daily automated backups
  - 30-day retention
  - Point-in-time recovery
  - Transaction log retention: 7 days

### Cloud Memorystore (Redis)

- **Version**: Redis 7.0
- **Tier**: Standard HA
- **Memory**: 5 GB
- **Features**:
  - High availability
  - Automatic failover
  - LRU eviction policy

### Load Balancer

- **Type**: Global HTTP(S) Load Balancer
- **SSL**: Managed SSL certificates
- **CDN**: Enabled for static assets
- **Security**: Cloud Armor with rate limiting
- **Features**:
  - HTTP to HTTPS redirect
  - Multi-domain support
  - Health checks
  - Session affinity

## Scaling

### Scale Node Pool

```bash
# Update terraform.tfvars
node_count = 5

# Apply changes
terraform apply
```

### Scale Database

```bash
# Update terraform.tfvars
db_tier = "db-n1-standard-8"

# Apply changes
terraform apply
```

### Scale Redis

```bash
# Update terraform.tfvars
redis_memory_size_gb = 10

# Apply changes
terraform apply
```

## Maintenance

### Update Cluster

```bash
# Update Terraform
terraform plan
terraform apply
```

### View State

```bash
terraform show
```

### List Resources

```bash
terraform state list
```

## Disaster Recovery

### Backup State

```bash
# State is automatically backed up to GCS
# Download current state
terraform state pull > terraform.tfstate.backup
```

### Restore from Backup

```bash
# If needed, restore state
terraform state push terraform.tfstate.backup
```

## Cost Estimation

Approximate monthly costs (us-central1):

- **GKE Cluster**: $220/month (3 nodes)
- **Cloud SQL**: $300/month (db-n1-standard-4)
- **Redis**: $150/month (5 GB HA)
- **Load Balancer**: $20/month
- **Network Egress**: Variable
- **Storage**: $10-50/month

**Total**: ~$700-800/month (excluding traffic)

### Cost Optimization

1. Use preemptible nodes for non-production
2. Enable cluster autoscaling
3. Right-size database instances
4. Use Cloud CDN to reduce egress
5. Set up budget alerts

## Troubleshooting

### Terraform Init Fails

```bash
# Check GCS bucket exists
gsutil ls gs://${PROJECT_ID}-terraform-state

# Check permissions
gcloud projects get-iam-policy $PROJECT_ID
```

### Apply Fails

```bash
# Check API enablement
gcloud services list --enabled

# Check quotas
gcloud compute project-info describe --project=$PROJECT_ID
```

### State Lock Issues

```bash
# Force unlock (use with caution)
terraform force-unlock LOCK_ID
```

## Cleanup

### Destroy Infrastructure

```bash
terraform destroy
```

Type `yes` when prompted.

**Warning**: This will delete all resources and data!

### Manual Cleanup

If terraform destroy fails:

```bash
# Delete GKE cluster
gcloud container clusters delete ai-tutoring-platform-cluster --region=us-central1

# Delete Cloud SQL
gcloud sql instances delete ai-tutoring-platform-cluster-postgres

# Delete Redis
gcloud redis instances delete ai-tutoring-platform-cluster-redis --region=us-central1

# Delete VPC
gcloud compute networks delete ai-tutoring-platform-cluster-vpc
```

## Multi-Environment Setup

For multiple environments (dev, staging, prod):

```bash
# Create workspace
terraform workspace new staging
terraform workspace new production

# Switch workspace
terraform workspace select staging

# Deploy
terraform apply
```

## Security Best Practices

1. **Never commit secrets** to version control
2. Use **Google Secret Manager** for sensitive data
3. Enable **Binary Authorization** for container security
4. Configure **VPC Service Controls** for data protection
5. Enable **Cloud Audit Logs** for compliance
6. Use **Workload Identity** instead of service account keys
7. Regularly **rotate credentials**
8. Enable **Private Google Access** for nodes

## Monitoring

### View Resources in Console

```bash
# Open GCP Console
gcloud console
```

Navigate to:
- Kubernetes Engine → Clusters
- SQL → Instances
- Memorystore → Redis
- Network Services → Load Balancing

### CLI Monitoring

```bash
# Cluster status
gcloud container clusters describe ai-tutoring-platform-cluster --region=us-central1

# Database status
gcloud sql instances describe ai-tutoring-platform-cluster-postgres

# Redis status
gcloud redis instances describe ai-tutoring-platform-cluster-redis --region=us-central1
```

## Support

For issues or questions:
- Review [CLOUD_INFRASTRUCTURE.md](../CLOUD_INFRASTRUCTURE.md)
- Check [Terraform GCP Provider Docs](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- Contact DevOps team

## References

- [Terraform Documentation](https://www.terraform.io/docs)
- [GCP Terraform Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [GKE Best Practices](https://cloud.google.com/kubernetes-engine/docs/best-practices)
- [Cloud SQL Best Practices](https://cloud.google.com/sql/docs/postgres/best-practices)
