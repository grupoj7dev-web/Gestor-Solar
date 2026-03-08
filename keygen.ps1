New-Item -ItemType Directory -Force -Path .ssh_keys
ssh-keygen -t rsa -b 4096 -f .ssh_keys\id_rsa -N ""
