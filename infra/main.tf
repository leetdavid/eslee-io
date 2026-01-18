# ? https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs/resources/dns_record
resource "cloudflare_dns_record" "eslee_io" {
  zone_id = var.cloudflare_zone_id
  name    = "@"
  content = "76.76.21.21"
  type    = "A"
  ttl     = 1
}

locals {
  vercel_cnames_map = {
    cms = {
      name    = "cms.eslee.io"
      content = "96207210ac0cd4b0.vercel-dns-017.com."
    }
  }
}

# ? Dynamic CNAME records that point to the new vercel DNS records
resource "cloudflare_dns_record" "eslee_io_vercel_cnames_map" {
  for_each = local.vercel_cnames_map

  zone_id = var.cloudflare_zone_id
  type    = "CNAME"
  name    = each.value.name
  content = each.value.content
  ttl     = 1
  proxied = false
}
