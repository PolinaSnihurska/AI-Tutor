# TLS 1.3 Configuration Guide

This document describes how to configure TLS 1.3 for secure connections in the AI Tutoring Platform.

## Requirements

- Implements requirement 9.1, 9.2: Ensure TLS 1.3 for all connections
- All production traffic must use HTTPS with TLS 1.3
- Minimum TLS version: 1.3
- Strong cipher suites only

## Production Deployment

### 1. Using NGINX as Reverse Proxy (Recommended)

Create an NGINX configuration file:

```nginx
# /etc/nginx/sites-available/ai-tutor

upstream auth_service {
    server localhost:3001;
}

upstream api_gateway {
    server localhost:3000;
}

server {
    listen 80;
    server_name api.ai-tutor.com;
    
    # Redirect all HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.ai-tutor.com;
    
    # TLS 1.3 Configuration
    ssl_protocols TLSv1.3;
    ssl_prefer_server_ciphers off;
    
    # TLS 1.3 Cipher Suites
    ssl_ciphers 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256';
    
    # SSL Certificates (Let's Encrypt recommended)
    ssl_certificate /etc/letsencrypt/live/api.ai-tutor.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.ai-tutor.com/privkey.pem;
    
    # SSL Session Configuration
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    
    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/api.ai-tutor.com/chain.pem;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Proxy Configuration
    location /api/ {
        proxy_pass http://api_gateway/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### 2. Obtaining SSL Certificates with Let's Encrypt

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.ai-tutor.com

# Auto-renewal (already configured by certbot)
sudo certbot renew --dry-run
```

### 3. Using AWS Application Load Balancer

Configure ALB with TLS 1.3:

```yaml
# AWS CloudFormation example
LoadBalancer:
  Type: AWS::ElasticLoadBalancingV2::LoadBalancer
  Properties:
    SecurityPolicy: ELBSecurityPolicy-TLS13-1-2-2021-06
    Certificates:
      - CertificateArn: arn:aws:acm:region:account:certificate/id
```

### 4. Using Kubernetes Ingress with cert-manager

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ai-tutor-ingress
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-protocols: "TLSv1.3"
    nginx.ingress.kubernetes.io/ssl-ciphers: "TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384"
spec:
  tls:
  - hosts:
    - api.ai-tutor.com
    secretName: ai-tutor-tls
  rules:
  - host: api.ai-tutor.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 3000
```

## Development Environment

For local development, you can use self-signed certificates:

```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Use with Node.js
# Update your service to use HTTPS
```

Example Node.js HTTPS server:

```typescript
import https from 'https';
import fs from 'fs';
import express from 'express';

const app = express();

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),
  minVersion: 'TLSv1.3',
  ciphers: 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256',
};

https.createServer(options, app).listen(3001, () => {
  console.log('HTTPS server running on port 3001');
});
```

## Verification

### Test TLS Configuration

```bash
# Test TLS version
openssl s_client -connect api.ai-tutor.com:443 -tls1_3

# Check SSL Labs rating
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=api.ai-tutor.com

# Test with curl
curl -v --tlsv1.3 https://api.ai-tutor.com/health
```

### Automated Testing

```bash
# Install testssl.sh
git clone https://github.com/drwetter/testssl.sh.git
cd testssl.sh

# Run tests
./testssl.sh --protocols --ciphers api.ai-tutor.com:443
```

## Security Best Practices

1. **Certificate Management**
   - Use automated certificate renewal (Let's Encrypt)
   - Monitor certificate expiration
   - Use strong key sizes (minimum 2048-bit RSA or 256-bit ECDSA)

2. **Cipher Suites**
   - Only use TLS 1.3 cipher suites
   - Disable older protocols (TLS 1.0, 1.1, 1.2)
   - Prefer AEAD ciphers

3. **HSTS**
   - Enable HTTP Strict Transport Security
   - Include subdomains
   - Add to HSTS preload list

4. **Monitoring**
   - Monitor TLS handshake failures
   - Track certificate expiration
   - Alert on protocol downgrade attempts

## Compliance

This configuration meets the following requirements:

- ✅ Requirement 9.1: Encrypt all user data in transit
- ✅ Requirement 9.2: Comply with GDPR data protection
- ✅ TLS 1.3 only (no fallback to older versions)
- ✅ Strong cipher suites
- ✅ Perfect Forward Secrecy (PFS)
- ✅ HSTS enabled

## Troubleshooting

### Common Issues

1. **Certificate not trusted**
   - Ensure certificate chain is complete
   - Check intermediate certificates

2. **TLS handshake failures**
   - Verify client supports TLS 1.3
   - Check cipher suite compatibility

3. **Performance issues**
   - Enable session resumption
   - Use OCSP stapling
   - Configure appropriate timeouts

## References

- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [OWASP TLS Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html)
- [RFC 8446 - TLS 1.3](https://datatracker.ietf.org/doc/html/rfc8446)
