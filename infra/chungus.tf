# Chungus, the Cyrus agent on the Mac mini, receives Linear, GitHub and Slack webhooks at
# chungus.eslee.io. The Mac mini publishes Cyrus with Tailscale Funnel on port 8443 and this Worker
# forwards to it. A Cloudflare Tunnel can't connect through the Mac mini's Mullvad exit node.
resource "cloudflare_workers_script" "chungus" {
  account_id         = var.cloudflare_account_id
  script_name        = "chungus"
  content            = file("${path.module}/workers/chungus.js")
  main_module        = "chungus.js"
  compatibility_date = "2026-09-01"
}

resource "cloudflare_workers_route" "chungus" {
  zone_id = var.cloudflare_zone_id
  pattern = "chungus.eslee.io/*"
  script  = cloudflare_workers_script.chungus.script_name
}

# A Worker route only runs on a proxied record. 100:: is the placeholder for hosts without an origin.
resource "cloudflare_dns_record" "eslee_io_chungus" {
  zone_id = var.cloudflare_zone_id
  type    = "AAAA"
  name    = "chungus"
  content = "100::"
  ttl     = 1
  proxied = true
}
