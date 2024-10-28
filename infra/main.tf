resource "cloudflare_dns_record" "eslee_io" {
  zone_id = var.cloudflare_zone_id
  name    = "@"
  content = "76.76.21.21"
  type    = "A"
  ttl     = 1
}
