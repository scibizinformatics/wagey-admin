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