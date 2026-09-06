locals {
  railway_cnames_map = {
    api_noai = {
      name    = "api.noai"
      content = "nql8oew3.up.railway.app"
      proxied = false
      verification = {
        name    = "_railway-verify.api.noai"
        content = "railway-verify=b60b6007ba63de6fcbc06c416e14b88409de5eb89711a8868d46200ae4b708bd"
      }
    }
  }
}

resource "cloudflare_dns_record" "eslee_io_railway_cnames_map" {
  for_each = local.railway_cnames_map

  zone_id = var.cloudflare_zone_id
  type    = "CNAME"
  name    = each.value.name
  content = each.value.content
  ttl     = 1
  proxied = each.value.proxied
}

resource "cloudflare_dns_record" "eslee_io_railway_cname_site_verifications" {
  for_each = {
    for key, cname in local.railway_cnames_map : key => cname.verification
    if cname.verification != null
  }

  zone_id = var.cloudflare_zone_id
  type    = "TXT"
  name    = each.value.name
  content = each.value.content
  ttl     = 1
}
