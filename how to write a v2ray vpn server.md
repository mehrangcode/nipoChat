how to write a v2ray vpn server

---

V2Ray is a legitimate proxy platform (part of Project V) used for privacy, tunneling, and censorship circumvention. Here's how to set one up.

## 1. Get a Server

Any VPS works (DigitalOcean, Linode, Vultr, AWS, etc.) running Ubuntu/Debian.

## 2. Install V2Ray

The easiest method is the official install script:

```bash
bash <(curl -L https://raw.githubusercontent.com/v2fly/fhs-install-v2ray/master/install-release.sh)
```

This installs the binary to `/usr/local/bin/v2ray` and sets up a systemd service.

(Note: the original V2Ray project has largely been superseded by **Xray-core**, which is a compatible, actively maintained fork with more features. Many people now use Xray instead — installer: `bash <(curl -L https://raw.githubusercontent.com/XTLS/Xray-install/main/install-release.sh)`. Config format is nearly identical.)

## 3. Configure the Server

Config lives at `/usr/local/etc/v2ray/config.json` (or `/usr/local/etc/xray/config.json`). A common minimal setup uses VMess or VLESS with TCP+TLS or WebSocket:

```json
{
  "inbounds": [
    {
      "port": 443,
      "protocol": "vless",
      "settings": {
        "clients": [
          {
            "id": "YOUR-UUID-HERE",
            "flow": "xtls-rprx-vision"
          }
        ],
        "decryption": "none"
      },
      "streamSettings": {
        "network": "tcp",
        "security": "tls",
        "tlsSettings": {
          "certificates": [
            {
              "certificateFile": "/etc/ssl/v2ray/fullchain.pem",
              "keyFile": "/etc/ssl/v2ray/privkey.pem"
            }
          ]
        }
      }
    }
  ],
  "outbounds": [
    {
      "protocol": "freedom"
    }
  ]
}
```

Generate a UUID for the client ID:

```bash
uuidgen
```

## 4. Get a TLS Certificate

Use Let's Encrypt with a domain pointed at your server:

```bash
apt install certbot -y
certbot certonly --standalone -d yourdomain.com
```

Point the cert paths in your config to the generated files (usually under `/etc/letsencrypt/live/yourdomain.com/`).

## 5. Open Firewall Ports

```bash
ufw allow 443/tcp
ufw allow 22/tcp
ufw enable
```

## 6. Start the Service

```bash
systemctl enable v2ray
systemctl start v2ray
systemctl status v2ray
```

## 7. Set Up the Client

On the client side (phone/laptop), use a V2Ray-compatible client app — **v2rayN** (Windows), **v2rayNG** (Android), **Shadowrocket** or **Quantumult X** (iOS), **Qv2ray** (cross-platform) — and enter matching details: server address, port 443, protocol (VLESS), UUID, and TLS settings.

## Simplifying with a Script

If manual config editing feels tedious, community scripts like **v2ray-agent** or **x-ui** (a web panel for Xray) automate cert issuance, config generation, and even generate a QR code / share link for clients. Example:

```bash
bash <(curl -Ls https://raw.githubusercontent.com/wulabing/Xray_onekey/main/Xray_onekey.sh)
```

## Want me to walk through a specific variant (e.g., VLESS+WebSocket+CDN for use behind Cloudflare, or a multi-user setup)?

## walk through a specific variant (e.g., VLESS+WebSocket+CDN for use behind Cloudflare, or a multi-user setup)

Let's do **VLESS + WebSocket + TLS behind Cloudflare CDN**, since it's the most popular setup right now (disguises traffic as normal HTTPS to a CDN, works well in restrictive networks) — then I'll add multi-user config at the end.

## Why this variant

- Traffic looks like ordinary HTTPS/WebSocket traffic to Cloudflare's edge.
- Your real server IP is hidden behind Cloudflare (only Cloudflare's IPs are exposed).
- Works even in networks that block direct VPS IP connections, since the traffic goes through Cloudflare's massive, hard-to-block IP ranges.

## Architecture

```
Client → Cloudflare (TLS, port 443) → your VPS (Nginx reverse proxy) → Xray (WebSocket, localhost)
```

Cloudflare terminates the "outer" TLS. Nginx on your VPS handles Cloudflare's connection and forwards WebSocket traffic to Xray running locally. This is why you also want TLS between Nginx and Xray, or at least between client and Cloudflare — "full (strict)" mode below covers this properly.

## 1. Prerequisites

- A domain added to Cloudflare (nameservers pointed to Cloudflare).
- A VPS with Xray/V2Ray installed (see previous message).
- Nginx installed: `apt install nginx -y`

## 2. DNS Setup in Cloudflare

- Add an **A record**: `vpn.yourdomain.com` → your VPS IP.
- Set the proxy status to **Proxied** (orange cloud) — this is what routes traffic through Cloudflare.

## 3. Cloudflare SSL/TLS Mode

In Cloudflare dashboard → SSL/TLS → set mode to **Full (strict)**. This means:

- Client → Cloudflare: encrypted (Cloudflare's edge cert, automatic).
- Cloudflare → your VPS: also encrypted, and Cloudflare validates your origin cert.

So you need a valid cert on your VPS too. Easiest: use **Cloudflare Origin Certificates** (free, issued from the dashboard, valid 15 years, only trusted by Cloudflare — that's fine since only Cloudflare talks to your origin directly).

Cloudflare dashboard → SSL/TLS → Origin Server → Create Certificate. Save the cert and key to your VPS:

```bash
mkdir -p /etc/ssl/cloudflare
nano /etc/ssl/cloudflare/cert.pem   # paste origin cert
nano /etc/ssl/cloudflare/key.pem    # paste private key
```

## 4. Xray Config (VLESS + WebSocket, listening locally)

`/usr/local/etc/xray/config.json`:

```json
{
  "inbounds": [
    {
      "listen": "127.0.0.1",
      "port": 10000,
      "protocol": "vless",
      "settings": {
        "clients": [
          {
            "id": "UUID-1-HERE",
            "email": "user1"
          }
        ],
        "decryption": "none"
      },
      "streamSettings": {
        "network": "ws",
        "wsSettings": {
          "path": "/mysecretpath"
        }
      }
    }
  ],
  "outbounds": [{ "protocol": "freedom" }]
}
```

Note: Xray listens only on `127.0.0.1` — it's never exposed directly to the internet. Nginx handles the public-facing side.

Generate UUIDs:

```bash
uuidgen
```

## 5. Nginx Reverse Proxy Config

`/etc/nginx/sites-available/vpn`:

```nginx
server {
    listen 443 ssl http2;
    server_name vpn.yourdomain.com;

    ssl_certificate     /etc/ssl/cloudflare/cert.pem;
    ssl_certificate_key /etc/ssl/cloudflare/key.pem;

    location /mysecretpath {
        if ($http_upgrade != "websocket") {
            return 404;
        }
        proxy_redirect off;
        proxy_pass http://127.0.0.1:10000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        return 404;  # anything not matching the path gets a plain 404, looks like a normal server
    }
}
```

Enable it:

```bash
ln -s /etc/nginx/sites-available/vpn /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

## 6. Firewall

```bash
ufw allow 443/tcp
ufw allow 22/tcp
ufw enable
```

Port 80 isn't needed since Cloudflare handles ACME/cert stuff for you (you're using Origin Certs, not Let's Encrypt, so no port 80 requirement).

## 7. Start Xray

```bash
systemctl enable xray
systemctl restart xray
systemctl status xray
```

## 8. Client Config

Share link format (VLESS):

```
vless://UUID-1-HERE@vpn.yourdomain.com:443?encryption=none&security=tls&type=ws&host=vpn.yourdomain.com&path=%2Fmysecretpath#MyServer
```

Import this into v2rayN / v2rayNG / Shadowrocket / NekoRay, or scan a QR code generated from it.

---

## Multi-User Setup

Just add more entries to the `clients` array in the Xray config — each with a unique UUID and identifying email/label:

```json
"clients": [
  { "id": "uuid-for-alice", "email": "alice" },
  { "id": "uuid-for-bob", "email": "bob" },
  { "id": "uuid-for-carol", "email": "carol" }
]
```

Restart Xray after editing:

```bash
systemctl restart xray
```

Each user gets their own share link with their own UUID, same domain/path/port. To track usage per user, enable stats:

```json
"stats": {},
"api": {
  "tag": "api",
  "services": ["StatsService"]
},
"policy": {
  "levels": { "0": { "statsUserUplink": true, "statsUserDownlink": true } },
  "system": { "statsInboundUplink": true, "statsInboundDownlink": true }
}
```

Then query stats via the Xray API or a panel tool. For anything beyond a handful of users, a management panel makes life much easier — **X-UI** or **3X-UI** give you a web dashboard for adding/removing users, traffic limits, expiry dates, and QR code generation, instead of hand-editing JSON:

```bash
bash <(curl -Ls https://raw.githubusercontent.com/mhsanaei/3x-ui/master/install.sh)
```

## Want help setting up 3X-UI specifically, or adding traffic quotas/expiration per user?

## i want share it with my freinds but i want create them a settngs with define how much can they use whats their expire time etc

Perfect use case for a management panel — hand-editing JSON for traffic limits and expiry gets painful fast. **3X-UI** is the standard tool for this: it gives you a web dashboard where you add a user with a data cap and expiration date, and it auto-generates their share link/QR code.

## 1. Install 3X-UI

```bash
bash <(curl -Ls https://raw.githubusercontent.com/mhsanaei/3x-ui/master/install.sh)
```

The installer will ask you to set:

- Panel port (default 2053, pick something not in use)
- Username/password for the admin panel
- A random path/secret for the panel URL (recommended, avoids scanners finding your admin login)

At the end it prints your panel URL, like:

```
http://your-vps-ip:2053/randompath/
```

Open that in a browser and log in.

## 2. Create an Inbound (if you don't already have one)

In the panel: **Inbounds → Add Inbound**

- Protocol: VLESS (or VMess)
- Port: 443 (or whatever you're using)
- Network: WebSocket
- Path: `/mysecretpath` (match whatever you set in Nginx if you're using the Cloudflare setup from before)
- TLS: enable, point to your certs (or let the panel manage it if you're not using Cloudflare)

If you already have Xray running standalone, 3X-UI can take over managing it — just recreate the inbound matching your existing Nginx config's path/port.

## 3. Add a Client (this is the per-friend part)

Inside your inbound, click **Add Client**. For each friend you get fields for:

| Field                  | What it does                                             |
| ---------------------- | -------------------------------------------------------- |
| **Email/Remark**       | Just a label, e.g. "alice" — not a real email            |
| **UUID**               | Auto-generated, unique per person                        |
| **Limit IP**           | Max simultaneous connections/devices for that user       |
| **Total Traffic (GB)** | Data cap — once hit, they're cut off automatically       |
| **Expire Date**        | Set a date; access auto-revokes after                    |
| **Enable**             | Toggle to instantly disable a user without deleting them |

So for example, for a friend you want to give 100GB for 30 days:

- Total Traffic: `100` GB
- Expire Date: pick a date 30 days out
- Limit IP: `2` (allow phone + laptop, say)

Save, and the panel shows a **QR code** and **subscription link** for that specific client — send that to your friend, they scan it in v2rayNG/Shadowrocket/v2rayN and they're connected with exactly those limits.

## 4. Monitoring Usage

The dashboard shows live upload/download stats per client, so you can see who's close to their cap. You can edit any client's traffic/expiry on the fly if someone needs more.

## 5. Resetting or Renewing

When a friend's month is up or they run out of data, just edit their client entry — reset traffic to 0, push the expiry date forward. No need to regenerate their UUID or send them a new link unless you want to.

## A Couple of Practical Tips

- **Give each friend their own client entry** (own UUID) rather than sharing one — this is what makes individual limits and monitoring possible, and lets you kill one person's access without affecting others.
- **Back up the panel's SQLite DB** occasionally (`/etc/x-ui/x-ui.db`) so you don't lose your client list if something goes wrong.
- If you're running behind Cloudflare (from the earlier setup), make sure the inbound's WebSocket path/port in 3X-UI matches your Nginx config exactly, or connections will fail with a 404 from Nginx before ever reaching Xray.

## Want me to walk through the Cloudflare + 3X-UI integration specifically (i.e., wiring the panel-managed inbound through the Nginx reverse proxy from before), or set up automatic traffic reset (e.g. monthly renewal) via the panel's API?
