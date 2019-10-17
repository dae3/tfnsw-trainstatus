#!/bin/sh

yum update -y

# Node
curl -sL https://rpm.nodesource.com/setup_10.x | bash -
yum install nodejs -y

# Deployment user
useradd -m -N -g users deploy
mkdir -p /home/deploy/.ssh
cat > /home/deploy/.ssh/authorized_hosts <<KEY
${deploy_public_key}
KEY
chown -R deploy.users /home/deploy/.ssh
chmod 0600 /home/deploy/.ssh/authorized_keys

# CloudWatch agent
curl -L https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm -o $${TMP}/cwa.rpm && \
  rpm -U $${TMP}/cwa.rpm && rm -f $${TMP}/cwa.rpm
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json <<EOF
{
	"agent": {
		"metrics_collection_interval": 60,
		"run_as_user": "cwagent"
	},
	"logs": {
		"logs_collected": {
			"files": {
				"collect_list": [
					{
						"file_path": "/home/ec2-user/tfnsw/tfnsw.log",
						"log_group_name": "${log_group_name}",
						"log_stream_name": "{instance_id}"
					}
				]
			}
		}
	},
	"metrics": {
		"metrics_collected": {
			"disk": {
				"measurement": [
					"used_percent"
				],
				"metrics_collection_interval": 60,
				"resources": [
					"*"
				]
			},
			"mem": {
				"measurement": [
					"mem_used_percent"
				],
				"metrics_collection_interval": 60
			},
			"statsd": {
				"metrics_aggregation_interval": 60,
				"metrics_collection_interval": 30,
				"service_address": ":8125"
			}
		}
	}
}

EOF

# app permissions for deploy and cloudwatch user
groupadd tfnsw
for u in ec2-user cwagent deploy
do
	usermod -a -G tfnsw $${u}
done
mkdir -p /home/ec2-user/tfnsw
chown -R ec2-user.tfnsw /home/ec2-user
chmod g+x /home/ec2-user
chgrp tfnsw /home/ec2-user/tfnsw
chmod 2770 /home/ec2-user/tfnsw

systemctl enable amazon-cloudwatch-agent && systemctl start amazon-cloudwatch-agent

# utilities
yum install tmux -y

# vi:ft=sh
