# WORM (Write-Once-Read-Many) Storage Configuration
# For immutable report storage to meet compliance requirements

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# S3 Bucket for Reports with Object Lock (WORM)
resource "aws_s3_bucket" "reports_worm" {
  bucket = "${var.environment}-cpam-reports-worm"

  tags = {
    Name        = "CPAM Reports (WORM)"
    Environment = var.environment
    Compliance  = "SOC2"
    Retention   = "7-years"
  }
}

# Enable Object Lock for WORM functionality
resource "aws_s3_bucket_object_lock_configuration" "reports_lock" {
  bucket = aws_s3_bucket.reports_worm.id

  rule {
    default_retention {
      mode = "COMPLIANCE"  # Cannot be overridden, even by root
      days = 2555          # 7 years for compliance
    }
  }
}

# Enable versioning (required for Object Lock)
resource "aws_s3_bucket_versioning" "reports_versioning" {
  bucket = aws_s3_bucket.reports_worm.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "reports_encryption" {
  bucket = aws_s3_bucket.reports_worm.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.reports.arn
    }
    bucket_key_enabled = true
  }
}

# KMS key for report encryption
resource "aws_kms_key" "reports" {
  description             = "KMS key for CPAM reports encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Name        = "cpam-reports-key"
    Environment = var.environment
  }
}

resource "aws_kms_alias" "reports" {
  name          = "alias/${var.environment}-cpam-reports"
  target_key_id = aws_kms_key.reports.key_id
}

# Block public access
resource "aws_s3_bucket_public_access_block" "reports_block" {
  bucket = aws_s3_bucket.reports_worm.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle policy for transitioning to cheaper storage
resource "aws_s3_bucket_lifecycle_configuration" "reports_lifecycle" {
  bucket = aws_s3_bucket.reports_worm.id

  rule {
    id     = "transition-to-glacier"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }

    # Expiration after 7 years (compliance requirement)
    expiration {
      days = 2555
    }

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

# Bucket policy for application access
resource "aws_s3_bucket_policy" "reports_policy" {
  bucket = aws_s3_bucket.reports_worm.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowApplicationWrite"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.app_reports.arn
        }
        Action = [
          "s3:PutObject",
          "s3:PutObjectRetention",
          "s3:PutObjectLegalHold"
        ]
        Resource = "${aws_s3_bucket.reports_worm.arn}/*"
      },
      {
        Sid    = "AllowApplicationRead"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.app_reports.arn
        }
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.reports_worm.arn,
          "${aws_s3_bucket.reports_worm.arn}/*"
        ]
      },
      {
        Sid    = "DenyUnencryptedObjectUploads"
        Effect = "Deny"
        Principal = "*"
        Action = "s3:PutObject"
        Resource = "${aws_s3_bucket.reports_worm.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption" = "aws:kms"
          }
        }
      }
    ]
  })
}

# IAM role for application to access WORM storage
resource "aws_iam_role" "app_reports" {
  name = "${var.environment}-cpam-reports-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name        = "cpam-reports-role"
    Environment = var.environment
  }
}

# IAM policy for KMS key access
resource "aws_iam_role_policy" "app_reports_kms" {
  name = "kms-access"
  role = aws_iam_role.app_reports.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:GenerateDataKey"
        ]
        Resource = aws_kms_key.reports.arn
      }
    ]
  })
}

# CloudWatch alarms for monitoring
resource "aws_cloudwatch_metric_alarm" "reports_bucket_size" {
  alarm_name          = "${var.environment}-cpam-reports-size"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "BucketSizeBytes"
  namespace           = "AWS/S3"
  period              = "86400"  # 1 day
  statistic           = "Average"
  threshold           = "1099511627776"  # 1TB
  alarm_description   = "Reports bucket size exceeds 1TB"

  dimensions = {
    BucketName  = aws_s3_bucket.reports_worm.id
    StorageType = "StandardStorage"
  }

  alarm_actions = [var.sns_topic_arn]
}

# Outputs
output "reports_bucket_name" {
  value       = aws_s3_bucket.reports_worm.id
  description = "Name of the WORM reports bucket"
}

output "reports_bucket_arn" {
  value       = aws_s3_bucket.reports_worm.arn
  description = "ARN of the WORM reports bucket"
}

output "reports_kms_key_id" {
  value       = aws_kms_key.reports.id
  description = "KMS key ID for reports encryption"
}

# Variables
variable "environment" {
  type        = string
  description = "Environment name (e.g., production, staging)"
}

variable "sns_topic_arn" {
  type        = string
  description = "SNS topic ARN for CloudWatch alarms"
}
