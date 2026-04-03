# How to run the MacroCoder API

## Local Development

```bash
cd macrocoder-api
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Hetzner API key and JWT secret

# Generate JWT secret:
python -c "import secrets; print(secrets.token_hex(32))"

uvicorn app.main:app --reload --port 8000
```

## Environment Variables

```
# Required
HETZNER_API_KEY=your_hetzner_api_key_here
JWT_SECRET=your_32_char_hex_secret

# Optional
LOG_DIR=/var/log          # Where to write audit logs
ENV=production           # Set to enforce JWT_SECRET requirement
```

## Deploy to Hetzner

### 1. Create a Hetzner Cloud Server
- Go to https://console.hetzner.cloud/
- Create a new server (CX22 or better)
- Install Ubuntu 22.04

### 2. Deploy the API
```bash
# SSH into your server
ssh root@your-server-ip

# Install Python and dependencies
apt update && apt install -y python3 python3-pip python3-venv

cd /opt
git clone your-repo macrocoder-api
cd macrocoder-api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env file
echo 'HETZNER_API_KEY=your_key' > .env
echo 'JWT_SECRET=your_secret' >> .env

# Create systemd service
cat > /etc/systemd/system/macrocoder-api.service << EOF
[Unit]
Description=MacroCoder API
After=network.target

[Service]
User=root
WorkingDirectory=/opt/macrocoder-api
ExecStart=/opt/macrocoder-api/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 443
EnvironmentFile=/opt/macrocoder-api/.env
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable macrocoder-api
systemctl start macrocoder-api

# Enable port 443 in firewall
ufw allow 443/tcp
```

### 3. Get Hetzner API Key
- Go to https://console.hetzner.cloud/
- Click your project → Security → API Tokens
- Create new token with Read/Write permissions
- Add to `.env` on server

### 4. Optional: Set up Caddy for HTTPS
```bash
# Install Caddy
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/deb.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install caddy

# Create Caddyfile
cat > /etc/caddy/Caddyfile << EOF
api.macrocoder.dev {
    reverse_proxy localhost:443
}
EOF

systemctl enable caddy
systemctl start caddy
```