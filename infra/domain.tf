locals {
  vercel_cnames_map = {
    www = {
      name    = "www.eslee.io"
      content = "31001004ba3b35ab.vercel-dns-017.com."
    }
    cms = {
      name    = "cms.eslee.io"
      content = "96207210ac0cd4b0.vercel-dns-017.com."
    }
    photography = {
      name    = "photography.eslee.io"
      content = "af5be78ee6612dfd.vercel-dns-017.com."
    }
  }
}

# ? Dynamic CNAME records that point to the new vercel DNS records
# ? https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs/resources/dns_record
resource "cloudflare_dns_record" "eslee_io_vercel_cnames_map" {
  for_each = local.vercel_cnames_map

  zone_id = var.cloudflare_zone_id
  type    = "CNAME"
  name    = each.value.name
  content = each.value.content
  ttl     = 1
  proxied = false
}


# ? Homepage (Manual Config)
resource "cloudflare_dns_record" "eslee_io_root" {
  zone_id = var.cloudflare_zone_id
  type    = "A"
  name    = "@"
  content = "216.198.79.1"
  ttl     = 1
  proxied = false
}


# ? Google site verification
resource "cloudflare_dns_record" "eslee_io_google_site_verification" {
  zone_id = var.cloudflare_zone_id
  type    = "TXT"
  name    = "@"
  content = "google-site-verification=LUi5KHoamAkZvHa2Uj9SP3s-odkJfMcnuUHsdXmMzJY"
  ttl     = 3600
  proxied = false
}
