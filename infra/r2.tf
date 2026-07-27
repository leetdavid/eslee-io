resource "cloudflare_r2_bucket" "media" {
  account_id = var.cloudflare_account_id
  name       = var.r2_bucket_name
}

resource "cloudflare_r2_bucket_cors" "media" {
  account_id  = var.cloudflare_account_id
  bucket_name = cloudflare_r2_bucket.media.name

  rules = [
    {
      allowed = {
        headers = ["content-length", "content-type"]
        methods = ["PUT"]
        origins = ["http://localhost:3002", "https://cms.eslee.io"]
      }
      expose_headers  = ["ETag"]
      max_age_seconds = 3600
    },
  ]
}

data "cloudflare_account_api_token_permission_groups_list" "r2" {
  account_id = var.cloudflare_account_id
  name       = "Workers%20R2%20Storage%20Bucket%20Item%20Write"
}

resource "cloudflare_api_token" "cms_r2" {
  name = "cms-r2-media"

  policies = [
    {
      effect = "allow"
      permission_groups = [
        {
          id = one(data.cloudflare_account_api_token_permission_groups_list.r2.result).id
        },
      ]
      resources = jsonencode({
        "com.cloudflare.edge.r2.bucket.${var.cloudflare_account_id}_default_${var.r2_bucket_name}" = "*"
      })
    },
  ]
}

output "r2_cms_access_key_id" {
  value     = cloudflare_api_token.cms_r2.id
  sensitive = true
}

output "r2_cms_secret_access_key" {
  value     = sha256(cloudflare_api_token.cms_r2.value)
  sensitive = true
}
