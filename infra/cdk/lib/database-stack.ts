import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import { Construct } from "constructs";

export class DatabaseStack extends cdk.Stack {
  /** VPC shared with the API stack */
  public readonly vpc: ec2.Vpc;
  /** Security group that allows inbound 5432 from ECS tasks */
  public readonly dbSecurityGroup: ec2.SecurityGroup;
  /** RDS instance — credentials auto-stored in Secrets Manager */
  public readonly dbInstance: rds.DatabaseInstance;

  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    // ─── VPC ──────────────────────────────────────────────────────────────
    // 2 AZs, 1 public subnet (ALB) + 1 private subnet (ECS + RDS)
    this.vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: "Private",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
      natGateways: 1,
    });

    // ─── Security group for RDS ────────────────────────────────────────────
    // Inbound 5432 will be added by ApiStack when it creates the ECS SG
    this.dbSecurityGroup = new ec2.SecurityGroup(this, "DbSecurityGroup", {
      vpc: this.vpc,
      description: "Allow PostgreSQL access from ECS tasks",
      allowAllOutbound: false,
    });

    // ─── RDS PostgreSQL 16 ────────────────────────────────────────────────
    this.dbInstance = new rds.DatabaseInstance(this, "Postgres", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      vpc: this.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [this.dbSecurityGroup],
      allocatedStorage: 20,
      storageType: rds.StorageType.GP3,
      multiAz: false,
      deletionProtection: true,
      backupRetention: cdk.Duration.days(7),
      databaseName: "experience_rag",
      credentials: rds.Credentials.fromGeneratedSecret("postgres", {
        secretName: "/experience-rag-bot/prod/db-credentials",
      }),
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ─── Outputs ──────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, "DbEndpoint", {
      value: this.dbInstance.dbInstanceEndpointAddress,
      description: "RDS endpoint hostname",
      exportName: "ExperienceRagBotDbEndpoint",
    });

    new cdk.CfnOutput(this, "DbSecretArn", {
      value: this.dbInstance.secret!.secretArn,
      description: "Secrets Manager ARN for DB credentials",
      exportName: "ExperienceRagBotDbSecretArn",
    });

    new cdk.CfnOutput(this, "VpcId", {
      value: this.vpc.vpcId,
      exportName: "ExperienceRagBotVpcId",
    });
  }
}
