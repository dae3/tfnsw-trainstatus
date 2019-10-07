data "aws_ami" "amazon_linux" {
  most_recent = true

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-2.0.20190823.1-x86_64-gp2"]
  }

  owners = ["137112412989"]
}

resource "aws_instance" "gtfs_poller" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t2.micro"
  subnet_id = aws_subnet.gtfs_poller.id
  key_name = aws_key_pair.gtfs_poller.id
  associate_public_ip_address = true
  user_data = file("./gtfs-poller-startup.sh")
  vpc_security_group_ids = [ aws_security_group.gtfs_poller.id ]
  depends_on = [ aws_internet_gateway.gtfs_poller ]
  iam_instance_profile = aws_iam_instance_profile.gtfs_poller.id
}

resource "aws_vpc" "gtfs_poller" {
  cidr_block = "10.0.0.0/24"
}

resource "aws_network_acl" "gtfs_poller" {
  vpc_id = aws_vpc.gtfs_poller.id

  egress {
    cidr_block = "0.0.0.0/0"
    protocol  = "tcp"
    rule_no   = 100
    action    = "allow"
    from_port = 0
    to_port   = 0
  }

  ingress {
    cidr_block = "0.0.0.0/0"
    protocol  = "tcp"
    rule_no   = 100
    action    = "allow"
    from_port = 0
    to_port   = 0
  }
}

resource "aws_subnet" "gtfs_poller" {
  vpc_id = aws_vpc.gtfs_poller.id
  cidr_block = "10.0.0.0/24"
}

resource "aws_security_group" "gtfs_poller" {
  vpc_id = aws_vpc.gtfs_poller.id
  name = "gtfs_poller"
  description = "Allow inbound SSH"

  ingress {
    cidr_blocks = [ "0.0.0.0/0" ]
    from_port = 22
    to_port = 22
    protocol = "tcp"
  }

  egress {
    cidr_blocks = [ "0.0.0.0/0" ]
    from_port = 0
    to_port = 0
    protocol = "-1"
  }

}

resource "aws_internet_gateway" "gtfs_poller" {
  vpc_id = aws_vpc.gtfs_poller.id
}

resource "aws_route_table" "gtfs_poller" {
  vpc_id = aws_vpc.gtfs_poller.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gtfs_poller.id
  }
}

resource "aws_route_table_association" "gtfs_poller" {
  subnet_id = aws_subnet.gtfs_poller.id
  route_table_id = aws_route_table.gtfs_poller.id
}

resource "aws_key_pair" "gtfs_poller" {
  key_name = "tfnsw"
  public_key = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDDxuo6rzm+BSbyRR9nskB2774PkW5cZEK5PL6YtITWn9MtoCfE6SjdzKEGRrrphzOcf6X4e5siTzTFuenKeTdrI47SHJAvzvW88xh8jvWhtPaDsKU+8Br0K2AYh34Z3R2BR8R6yrQIv/uCUBuWl3iqNTSxNDYBstud3rU+qd6qL5i1XT9XP8Xg6kMEtlrjJY3bOAAp/w6z31CQsGJoztcyfeG/ZO9mfnsDBwdCZJh5YjmWgonuLZKUriLSGD1VoiBOq0cvNchmGF50PJDe218Hs8sbdc7xVFUhE6R5GbKQVpwApwZezW4zMe1Tfyt5XJIDkSD/tGwVRx9uXL36LzV5 tfnsw-ec2"
}

data "aws_iam_policy_document" "instance_assume_role_policy" {
  statement {
    actions = [ "sts:AssumeRole" ]

    principals {
      type = "Service"
      identifiers = [ "ec2.amazonaws.com" ]
    }
  }
}

resource "aws_iam_role" "gtfs_poller" {
  name =  "${var.prefix}-${var.environment}-gtfs_poller"
  assume_role_policy = data.aws_iam_policy_document.instance_assume_role_policy.json
}

resource "aws_iam_instance_profile" "gtfs_poller" {
  name =  "${var.prefix}-${var.environment}-gtfs_poller"
  role = aws_iam_role.gtfs_poller.name
}
