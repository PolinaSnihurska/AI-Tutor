# Global Static IP for Load Balancer
resource "google_compute_global_address" "default" {
  name = "${var.cluster_name}-lb-ip"
}

# SSL Certificate
resource "google_compute_managed_ssl_certificate" "default" {
  name = "${var.cluster_name}-ssl-cert"

  managed {
    domains = [
      "ai-tutoring-platform.com",
      "www.ai-tutoring-platform.com",
      "api.ai-tutoring-platform.com",
      "admin.ai-tutoring-platform.com"
    ]
  }
}

# Backend bucket for static assets
resource "google_compute_backend_bucket" "static_assets" {
  name        = "${var.cluster_name}-static-assets"
  bucket_name = google_storage_bucket.static_assets.name
  enable_cdn  = true

  cdn_policy {
    cache_mode        = "CACHE_ALL_STATIC"
    client_ttl        = 3600
    default_ttl       = 3600
    max_ttl           = 86400
    negative_caching  = true
    serve_while_stale = 86400
  }
}

# Storage bucket for static assets
resource "google_storage_bucket" "static_assets" {
  name          = "${var.project_id}-static-assets"
  location      = "US"
  storage_class = "STANDARD"
  force_destroy = false

  uniform_bucket_level_access = true

  cors {
    origin          = ["https://ai-tutoring-platform.com", "https://www.ai-tutoring-platform.com"]
    method          = ["GET", "HEAD"]
    response_header = ["*"]
    max_age_seconds = 3600
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }
}

# Make bucket public for CDN
resource "google_storage_bucket_iam_member" "public_read" {
  bucket = google_storage_bucket.static_assets.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# Cloud Armor Security Policy
resource "google_compute_security_policy" "policy" {
  name = "${var.cluster_name}-security-policy"

  # Rate limiting rule
  rule {
    action   = "rate_based_ban"
    priority = "1000"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      enforce_on_key = "IP"
      rate_limit_threshold {
        count        = 100
        interval_sec = 60
      }
      ban_duration_sec = 600
    }
  }

  # Block known bad IPs
  rule {
    action   = "deny(403)"
    priority = "2000"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["0.0.0.0/0"] # Replace with actual bad IP ranges
      }
    }
    description = "Block known malicious IPs"
  }

  # Default rule
  rule {
    action   = "allow"
    priority = "2147483647"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Default allow rule"
  }

  # OWASP ModSecurity Core Rule Set
  adaptive_protection_config {
    layer_7_ddos_defense_config {
      enable = true
    }
  }
}

# URL Map for Load Balancer
resource "google_compute_url_map" "default" {
  name            = "${var.cluster_name}-url-map"
  default_service = google_compute_backend_service.frontend.id

  host_rule {
    hosts        = ["ai-tutoring-platform.com", "www.ai-tutoring-platform.com"]
    path_matcher = "frontend"
  }

  host_rule {
    hosts        = ["api.ai-tutoring-platform.com"]
    path_matcher = "api"
  }

  host_rule {
    hosts        = ["admin.ai-tutoring-platform.com"]
    path_matcher = "admin"
  }

  path_matcher {
    name            = "frontend"
    default_service = google_compute_backend_service.frontend.id

    path_rule {
      paths   = ["/static/*", "/assets/*"]
      service = google_compute_backend_bucket.static_assets.id
    }
  }

  path_matcher {
    name            = "api"
    default_service = google_compute_backend_service.api.id
  }

  path_matcher {
    name            = "admin"
    default_service = google_compute_backend_service.admin.id
  }
}

# Backend Service for Frontend
resource "google_compute_backend_service" "frontend" {
  name                  = "${var.cluster_name}-frontend-backend"
  protocol              = "HTTP"
  port_name             = "http"
  timeout_sec           = 30
  enable_cdn            = true
  security_policy       = google_compute_security_policy.policy.id
  load_balancing_scheme = "EXTERNAL_MANAGED"

  cdn_policy {
    cache_mode                   = "CACHE_ALL_STATIC"
    client_ttl                   = 3600
    default_ttl                  = 3600
    max_ttl                      = 86400
    negative_caching             = true
    serve_while_stale            = 86400
    signed_url_cache_max_age_sec = 7200
  }

  backend {
    group           = google_container_cluster.primary.id
    balancing_mode  = "RATE"
    max_rate        = 1000
    capacity_scaler = 1.0
  }

  health_check = [google_compute_health_check.frontend.id]
}

# Backend Service for API
resource "google_compute_backend_service" "api" {
  name                  = "${var.cluster_name}-api-backend"
  protocol              = "HTTP"
  port_name             = "http"
  timeout_sec           = 30
  security_policy       = google_compute_security_policy.policy.id
  load_balancing_scheme = "EXTERNAL_MANAGED"

  backend {
    group           = google_container_cluster.primary.id
    balancing_mode  = "RATE"
    max_rate        = 1000
    capacity_scaler = 1.0
  }

  health_check = [google_compute_health_check.api.id]
}

# Backend Service for Admin
resource "google_compute_backend_service" "admin" {
  name                  = "${var.cluster_name}-admin-backend"
  protocol              = "HTTP"
  port_name             = "http"
  timeout_sec           = 30
  security_policy       = google_compute_security_policy.policy.id
  load_balancing_scheme = "EXTERNAL_MANAGED"

  backend {
    group           = google_container_cluster.primary.id
    balancing_mode  = "RATE"
    max_rate        = 500
    capacity_scaler = 1.0
  }

  health_check = [google_compute_health_check.admin.id]
}

# Health Checks
resource "google_compute_health_check" "frontend" {
  name               = "${var.cluster_name}-frontend-health"
  check_interval_sec = 10
  timeout_sec        = 5

  http_health_check {
    port         = 80
    request_path = "/"
  }
}

resource "google_compute_health_check" "api" {
  name               = "${var.cluster_name}-api-health"
  check_interval_sec = 10
  timeout_sec        = 5

  http_health_check {
    port         = 80
    request_path = "/health"
  }
}

resource "google_compute_health_check" "admin" {
  name               = "${var.cluster_name}-admin-health"
  check_interval_sec = 10
  timeout_sec        = 5

  http_health_check {
    port         = 80
    request_path = "/health"
  }
}

# HTTPS Proxy
resource "google_compute_target_https_proxy" "default" {
  name             = "${var.cluster_name}-https-proxy"
  url_map          = google_compute_url_map.default.id
  ssl_certificates = [google_compute_managed_ssl_certificate.default.id]
}

# HTTP to HTTPS Redirect
resource "google_compute_url_map" "https_redirect" {
  name = "${var.cluster_name}-https-redirect"

  default_url_redirect {
    https_redirect         = true
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    strip_query            = false
  }
}

resource "google_compute_target_http_proxy" "https_redirect" {
  name    = "${var.cluster_name}-http-proxy"
  url_map = google_compute_url_map.https_redirect.id
}

# Forwarding Rules
resource "google_compute_global_forwarding_rule" "https" {
  name                  = "${var.cluster_name}-https-forwarding-rule"
  ip_protocol           = "TCP"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  port_range            = "443"
  target                = google_compute_target_https_proxy.default.id
  ip_address            = google_compute_global_address.default.id
}

resource "google_compute_global_forwarding_rule" "http" {
  name                  = "${var.cluster_name}-http-forwarding-rule"
  ip_protocol           = "TCP"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  port_range            = "80"
  target                = google_compute_target_http_proxy.https_redirect.id
  ip_address            = google_compute_global_address.default.id
}
