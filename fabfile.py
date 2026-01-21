from fabric import task, Connection
from patchwork.transfers import rsync # type: ignore
import subprocess

# Configuration
REMOTE_HOST = '5.223.67.18'
REMOTE_USER = 'root'
REMOTE_PATH = '/root/wagey-admin'

def get_connection():
    """Helper function to create connection"""
    return Connection(host=REMOTE_HOST, user=REMOTE_USER)

@task
def prod(c):
    conn = c.config.run.env['conn'] = Connection(
        REMOTE_HOST,
        user=REMOTE_USER
    )
    

@task
def uname(c):
    """Test connection by running uname"""
    conn = get_connection()
    conn.run('uname -a')

@task
def sync(c):
    """Sync local files to remote server using rsync"""
    conn = c.config.run.env['conn']
    rsync(
        conn,
        '.',
        '/root/wagey-admin',
        exclude = [
            '--exclude=.git',
            '--exclude=.venv',
            '--exclude=.DS_Store',
            '--exclude=.env',
            '--exclude=__pycache__',
            '/node_modules',
            '--exclude=dist',
            '--exclude=.quasar',
            '--exclude=.vscode',
            '--exclude=.idea',
    ]
    )
    
    
    # exclude_str = ' '.join(excludes)
    # rsync_cmd = f'rsync -avz {exclude_str} --delete ./ {REMOTE_USER}@{REMOTE_HOST}:{REMOTE_PATH}/'
    
    # result = subprocess.run(rsync_cmd, shell=True)
    # if result.returncode == 0:
    #     print("✅ Files synced successfully")
    # else:
    #     print("❌ Sync failed")

@task
def build(c):
    """Build Docker image"""
    # conn = get_connection()
    # with conn.cd(REMOTE_PATH):
    #     conn.run('docker-compose -p wagey_admin -f docker-compose.prod.yml build --no-cache')
    conn = c.config.run.env['conn']
    with conn.cd('/root/wagey-admin'):
        conn.run('sudo docker-compose -p wagey_admin -f docker-compose.prod.yml build')

@task
def up(c):
    """Start Docker containers"""
    # conn = get_connection()
    conn = c.config.run.env['conn']
    with conn.cd(REMOTE_PATH):
        conn.run('sudo docker-compose -p wagey_admin -f docker-compose.prod.yml up -d --build --force-recreate')

@task
def down(c):
    """Stop Docker containers"""
    # conn = get_connection()
    conn = c.config.run.env['conn']
    with conn.cd(REMOTE_PATH):
        conn.run('sudo docker-compose -p wagey_admin -f docker-compose.prod.yml down')

@task
def restart(c):
    """Restart Docker containers"""
    conn = get_connection()
    with conn.cd(REMOTE_PATH):
        conn.run('docker-compose -f docker-compose.prod.yml restart')

@task
def prune(c):
    """Prune unused Docker images and networks"""
    conn = get_connection()
    conn.run('docker image prune -f')
    conn.run('docker network prune -f')
    print("✅ Docker cleanup complete")

@task
def logs(c, follow=True):
    """View Docker logs"""
    conn = get_connection()
    with conn.cd(REMOTE_PATH):
        if follow:
            conn.run('docker-compose -f docker-compose.prod.yml logs -f --tail=100')
        else:
            conn.run('docker-compose -f docker-compose.prod.yml logs --tail=100')

@task
def status(c):
    """Check Docker container status"""
    conn = get_connection()
    with conn.cd(REMOTE_PATH):
        conn.run('docker-compose -f docker-compose.prod.yml ps')

@task
def compose(c):
    """Check and install Docker Compose if needed"""
    conn = get_connection()
    
    result = conn.run('docker compose version', warn=True, hide=True)
    if result.ok:
        print("✅ 'docker compose' (plugin) is already installed.")
        return
    
    result = conn.run('docker-compose --version', warn=True, hide=True)
    if result.ok:
        print("✅ 'docker-compose' (legacy) is already installed.")
        return
    
    print("⚠️  Docker Compose is not installed. Installing legacy 'docker-compose'...")
    conn.run('sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" '
             '-o /usr/local/bin/docker-compose')
    conn.run('sudo chmod +x /usr/local/bin/docker-compose')
    
    result = conn.run('docker-compose --version', warn=True)
    if result.ok:
        print("✅ 'docker-compose' installed successfully.")
    else:
        print("❌ Failed to install 'docker-compose'. Please check manually.")

@task
def setup(c):
    """Create remote directory if it doesn't exist"""
    conn = get_connection()
    conn.run(f'mkdir -p {REMOTE_PATH}')
    print(f"✅ Created directory: {REMOTE_PATH}")

@task
def install_docker(c):
    """Install Docker on the server"""
    conn = get_connection()
    print("🐳 Installing Docker...")
    
    conn.run('curl -fsSL https://get.docker.com -o get-docker.sh')
    conn.run('sh get-docker.sh')
    
    conn.run('sudo systemctl start docker')
    conn.run('sudo systemctl enable docker')
    
    result = conn.run('docker --version', warn=True)
    if result.ok:
        print("✅ Docker installed successfully!")
        conn.run('docker --version')
    else:
        print("❌ Docker installation failed")

@task
def docker_start(c):
    """Start Docker daemon"""
    conn = get_connection()
    print("🐳 Starting Docker daemon...")
    conn.run('sudo systemctl start docker')
    conn.run('sudo systemctl enable docker')
    result = conn.run('sudo systemctl status docker', warn=True, hide=True)
    if result.ok:
        print("✅ Docker daemon is running")
    else:
        print("❌ Docker daemon failed to start")

@task
def docker_status(c):
    """Check Docker daemon status"""
    conn = get_connection()
    conn.run('sudo systemctl status docker')

@task
def setup_nginx(c):
    """Setup Nginx reverse proxy configuration"""
    conn = get_connection()
    
    nginx_config = """server {
    listen 80;
    server_name web.wageyapp.com www.web.wageyapp.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}"""
    
    conn.run(f"echo '{nginx_config}' | sudo tee /etc/nginx/sites-available/wagey-app")
    conn.run('sudo ln -sf /etc/nginx/sites-available/wagey-app /etc/nginx/sites-enabled/')
    conn.run('sudo rm -f /etc/nginx/sites-enabled/default', warn=True)
    
    result = conn.run('sudo nginx -t', warn=True)
    if result.ok:
        conn.run('sudo systemctl restart nginx')
        print("✅ Nginx configured and restarted successfully")
    else:
        print("❌ Nginx configuration test failed")

@task
def setup_ssl(c):
    """Setup SSL certificate with Let's Encrypt"""
    conn = get_connection()
    
    print("📦 Installing Certbot...")
    conn.run('sudo apt update', warn=True)
    conn.run('sudo apt install -y certbot python3-certbot-nginx', warn=True)
    
    print("🔒 Obtaining SSL certificate...")
    print("📝 Note: You'll need to enter your email and agree to terms")
    conn.run('sudo certbot --nginx -d web.wageyapp.com -d www.web.wageyapp.com')
    
    print("✅ SSL certificate installed. Your site is now accessible via HTTPS!")
    print("🔄 Certbot will automatically renew the certificate before it expires")

@task
def setup_cloudflare_ssl(c):
    """Setup Cloudflare Origin Certificate (Interactive)"""
    conn = get_connection()
    
    print("🔐 Cloudflare Origin Certificate Setup")
    print("")
    print("STEP 1: Generate certificate in Cloudflare:")
    print("  1. Visit: https://dash.cloudflare.com")
    print("  2. Select your domain")
    print("  3. Go to SSL/TLS → Origin Server")
    print("  4. Click 'Create Certificate'")
    print("  5. Keep defaults and click 'Create'")
    print("")
    input("Press Enter when you have the certificates ready...")
    
    # Create directory
    conn.run('sudo mkdir -p /etc/ssl/cloudflare')
    conn.run('sudo chmod 700 /etc/ssl/cloudflare')
    
    print("")
    print("STEP 2: Upload certificates")
    print("Now you need to paste the certificates on the server.")
    print("Run these commands on your server:")
    print("")
    print("  sudo nano /etc/ssl/cloudflare/cert.pem")
    print("  # Paste the Origin Certificate")
    print("")
    print("  sudo nano /etc/ssl/cloudflare/key.pem")
    print("  # Paste the Private Key")
    print("")
    print("  sudo chmod 600 /etc/ssl/cloudflare/key.pem")
    print("  sudo chmod 644 /etc/ssl/cloudflare/cert.pem")
    print("")
    input("Press Enter after uploading certificates...")
    
    # Update nginx config
    nginx_config = """server {
    listen 80;
    server_name web.wageyapp.com www.web.wageyapp.com;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

server {
    listen 443 ssl http2;
    server_name web.wageyapp.com www.web.wageyapp.com;

    ssl_certificate /etc/ssl/cloudflare/cert.pem;
    ssl_certificate_key /etc/ssl/cloudflare/key.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}"""
    
    conn.run(f"echo '{nginx_config}' | sudo tee /etc/nginx/sites-available/wagey-app")
    conn.run('sudo ln -sf /etc/nginx/sites-available/wagey-app /etc/nginx/sites-enabled/')
    
    result = conn.run('sudo nginx -t', warn=True)
    if result.ok:
        conn.run('sudo systemctl reload nginx')
        print("✅ Nginx configured successfully!")
        print("")
        print("FINAL STEP: In Cloudflare Dashboard")
        print("  SSL/TLS → Overview → Set to 'Full (strict)'")
    else:
        print("❌ Nginx configuration failed")

@task
def deploy(c):
    """Full deployment: sync, build, down, up"""
    print("🚀 Starting deployment...")
    sync(c)
    print("📦 Building Docker image...")
    build(c)
    print("🛑 Stopping old containers...")
    down(c)
    print("🎬 Starting new containers...")
    up(c)
    # print("✅ Deployment complete!")
    # print("📊 Container status:")
    # status(c)

@task
def quick_deploy(c):
    """Quick deployment: sync and restart (no rebuild)"""
    print("⚡ Quick deployment...")
    sync(c)
    restart(c)
    print("✅ Quick deployment complete!")

@task
def full_deploy(c):
    """Full deployment with cleanup"""
    print("🚀 Starting full deployment with cleanup...")
    sync(c)
    build(c)
    down(c)
    prune(c)
    up(c)
    print("✅ Full deployment complete!")
    status(c)