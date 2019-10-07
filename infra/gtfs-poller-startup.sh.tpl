#!/bin/sh

yum update -y

# Node
curl -sL https://rpm.nodesource.com/setup_10.x | bash -
yum install nodejs -y

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

systemctl enable amazon-cloudwatch-agent && systemctl start amazon-cloudwatch-agent

# utilities
yum install tmux -y

