# Kubernetes Configuration

This directory contains Kubernetes manifests for deploying the AI Tutoring Platform.

## Quick Start

1. **Update secrets**:
   ```bash
   cp secrets.yaml secrets.yaml.backup
   # Edit secrets.yaml with actual values
   ```

2. **Deploy**:
   ```bash
   ./deploy.sh
   ```

3. **Get load balancer IP**:
   ```bash
   kubectl get ingress main-ingress -n ai-tutoring-platform
   ```

## Files Overview

### Core Configuration
- `namespace.yaml` - Creates the ai-tutoring-platform namespace
- `configmap.yaml` - Application configuration
- `secrets.yaml` - Sensitive credentials (DO NOT COMMIT WITH REAL VALUES)
- `storage-class.yaml` - Storage class for persistent volumes

### Databases
- `postgres-statefulset.yaml` - PostgreSQL database
- `mongodb-statefulset.yaml` - MongoDB database
- `redis-cluster.yaml` - Redis cluster for caching

### Application Services
- `auth-service.yaml` - Authentication service
- `ai-service.yaml` - AI/ML service
- `test-service.yaml` - Test generation service
- `analytics-service.yaml` - Analytics service
- `learning-plan-service.yaml` - Learning plan service
- `admin-service.yaml` - Admin panel service
- `frontend.yaml` - Frontend application

### Networking
- `ingress.yaml` - Ingress configuration with SSL
- `cert-manager.yaml` - SSL certificate management
- `network-policy.yaml` - Network security policies

### Scripts
- `deploy.sh` - Automated deployment script
- `teardown.sh` - Cleanup script

## Manual Deployment

If you prefer to deploy manually:

```bash
# 1. Create namespace
kubectl apply -f namespace.yaml

# 2. Create storage class
kubectl apply -f storage-class.yaml

# 3. Create secrets and config
kubectl apply -f secrets.yaml
kubectl apply -f configmap.yaml

# 4. Deploy databases
kubectl apply -f postgres-statefulset.yaml
kubectl apply -f mongodb-statefulset.yaml
kubectl apply -f redis-cluster.yaml

# Wait for databases
kubectl wait --for=condition=ready pod -l app=postgres -n ai-tutoring-platform --timeout=300s
kubectl wait --for=condition=ready pod -l app=mongodb -n ai-tutoring-platform --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis-cluster -n ai-tutoring-platform --timeout=300s

# 5. Initialize Redis cluster
REDIS_NODES=$(kubectl get pods -n ai-tutoring-platform -l app=redis-cluster -o jsonpath='{range.items[*]}{.status.podIP}:6379 ')
kubectl exec -n ai-tutoring-platform redis-cluster-0 -- redis-cli --cluster create $REDIS_NODES --cluster-replicas 1 --cluster-yes

# 6. Deploy services
kubectl apply -f auth-service.yaml
kubectl apply -f ai-service.yaml
kubectl apply -f test-service.yaml
kubectl apply -f analytics-service.yaml
kubectl apply -f learning-plan-service.yaml
kubectl apply -f admin-service.yaml
kubectl apply -f frontend.yaml

# 7. Deploy ingress
kubectl apply -f cert-manager.yaml
kubectl apply -f ingress.yaml

# 8. Apply network policies
kubectl apply -f network-policy.yaml
```

## Monitoring

```bash
# Check all resources
kubectl get all -n ai-tutoring-platform

# Check pod status
kubectl get pods -n ai-tutoring-platform

# View logs
kubectl logs -f deployment/auth-service -n ai-tutoring-platform

# Check HPA status
kubectl get hpa -n ai-tutoring-platform

# Check ingress
kubectl describe ingress main-ingress -n ai-tutoring-platform
```

## Scaling

```bash
# Manual scaling
kubectl scale deployment auth-service -n ai-tutoring-platform --replicas=5

# HPA is configured automatically for most services
```

## Troubleshooting

### Pod not starting
```bash
kubectl describe pod <pod-name> -n ai-tutoring-platform
kubectl logs <pod-name> -n ai-tutoring-platform
```

### Database connection issues
```bash
# Test PostgreSQL
kubectl exec -it postgres-0 -n ai-tutoring-platform -- psql -U postgres

# Test MongoDB
kubectl exec -it mongodb-0 -n ai-tutoring-platform -- mongosh

# Test Redis
kubectl exec -it redis-cluster-0 -n ai-tutoring-platform -- redis-cli ping
```

### SSL certificate issues
```bash
kubectl get certificate -n ai-tutoring-platform
kubectl describe certificate tls-secret -n ai-tutoring-platform
kubectl logs -n cert-manager deployment/cert-manager
```

## Cleanup

```bash
./teardown.sh
```

**Warning**: This will delete all resources and data!

## Security Notes

1. **Never commit secrets.yaml with real values**
2. Use Google Secret Manager for production secrets
3. Rotate credentials regularly
4. Review network policies before deployment
5. Enable Pod Security Policies in production

## Cloud Provider Specific Notes

### GCP (Google Cloud Platform)
- Uses `pd-ssd` for storage
- Requires VPC-native cluster
- Enable required APIs before deployment

### AWS
- Update storage class to use `gp3` EBS volumes
- Configure VPC and security groups
- Use AWS Secrets Manager

### Azure
- Update storage class to use `Premium_LRS`
- Configure virtual network
- Use Azure Key Vault

## Support

For issues or questions, refer to the main [CLOUD_INFRASTRUCTURE.md](../CLOUD_INFRASTRUCTURE.md) documentation.
