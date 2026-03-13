import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { DatabaseStack } from "./database-stack";

interface ApiStackProps extends cdk.StackProps {
  appName: string;
  dbStack: DatabaseStack;
  /** ECR image tag to deploy (e.g. git-sha or "latest") */
  imageTag: string;
  /** Custom domain for the API (e.g. api.example.com) */
  domainName?: string;
  /** ACM certificate ARN — required when domainName is set */
  certificateArn?: string;
}

export class ApiStack extends cdk.Stack {
  /** ECS cluster — exported so CI can trigger deployments */
  public readonly cluster: ecs.Cluster;
  public readonly service: ecs.FargateService;
  public readonly alb: elbv2.ApplicationLoadBalancer;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { appName, domainName, certificateArn } = props;
    const { vpc, dbSecurityGroup, dbInstance } = props.dbStack;
    const ssmPrefix = `/${appName}/prod`;

    // ─── ECR repository ───────────────────────────────────────────────────
    const repository = ecr.Repository.fromRepositoryName(this, "ApiRepo", `${appName}/api`);

    // ─── ECS Cluster ──────────────────────────────────────────────────────
    this.cluster = new ecs.Cluster(this, "Cluster", {
      vpc,
      clusterName: appName,
      containerInsights: true,
    });

    // ─── Task IAM role ────────────────────────────────────────────────────
    const taskRole = new iam.Role(this, "TaskRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      description: "Role assumed by the API Fargate task",
    });

    taskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
        resources: ["*"],
      }),
    );

    taskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"],
        resources: [`arn:aws:ssm:${this.region}:${this.account}:parameter${ssmPrefix}/*`],
      }),
    );

    taskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["secretsmanager:GetSecretValue"],
        resources: [dbInstance.secret!.secretArn],
      }),
    );

    // ─── Task execution role ──────────────────────────────────────────────
    const executionRole = new iam.Role(this, "ExecutionRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonECSTaskExecutionRolePolicy"),
      ],
    });

    // Allow pulling from ECR and reading secrets
    executionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["secretsmanager:GetSecretValue"],
        resources: [dbInstance.secret!.secretArn],
      }),
    );

    // ─── CloudWatch log group ─────────────────────────────────────────────
    const logGroup = new logs.LogGroup(this, "ApiLogs", {
      logGroupName: `/ecs/${appName}/api`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ─── Task definition ──────────────────────────────────────────────────
    const taskDef = new ecs.FargateTaskDefinition(this, "TaskDef", {
      cpu: 256,
      memoryLimitMiB: 512,
      taskRole,
      executionRole,
    });

    const container = taskDef.addContainer("api", {
      image: ecs.ContainerImage.fromEcrRepository(repository, props.imageTag),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: "api",
        logGroup,
      }),
      healthCheck: {
        command: ["CMD-SHELL", "wget -qO- http://localhost:3001/api/health || exit 1"],
        interval: cdk.Duration.seconds(10),
        timeout: cdk.Duration.seconds(5),
        retries: 6,
        startPeriod: cdk.Duration.seconds(30),
      },
      environment: {
        PORT: ssm.StringParameter.valueForStringParameter(this, `${ssmPrefix}/API_PORT`),
        AI_LLM_PROVIDER: ssm.StringParameter.valueForStringParameter(
          this,
          `${ssmPrefix}/AI_LLM_PROVIDER`,
        ),
        AI_EMBEDDING_PROVIDER: ssm.StringParameter.valueForStringParameter(
          this,
          `${ssmPrefix}/AI_EMBEDDING_PROVIDER`,
        ),
        BEDROCK_MODEL_ID: ssm.StringParameter.valueForStringParameter(
          this,
          `${ssmPrefix}/BEDROCK_MODEL_ID`,
        ),
        BEDROCK_EMBEDDING_MODEL_ID: ssm.StringParameter.valueForStringParameter(
          this,
          `${ssmPrefix}/BEDROCK_EMBEDDING_MODEL_ID`,
        ),
        EXPERIENCE_SOURCE: ssm.StringParameter.valueForStringParameter(
          this,
          `${ssmPrefix}/EXPERIENCE_SOURCE`,
        ),
        CACHE_PROVIDER: ssm.StringParameter.valueForStringParameter(
          this,
          `${ssmPrefix}/CACHE_PROVIDER`,
        ),
        CORS_ORIGIN: ssm.StringParameter.valueForStringParameter(this, `${ssmPrefix}/CORS_ORIGINS`),
        RATE_LIMIT_TTL: ssm.StringParameter.valueForStringParameter(
          this,
          `${ssmPrefix}/RATE_LIMIT_TTL`,
        ),
        RATE_LIMIT_MAX: ssm.StringParameter.valueForStringParameter(
          this,
          `${ssmPrefix}/RATE_LIMIT_MAX`,
        ),
        AWS_REGION: this.region,
        DB_PORT: "5432",
        DB_NAME: "experience_rag",
        DB_HOST: dbInstance.dbInstanceEndpointAddress,
        DB_SSL: "true",
      },
      secrets: {
        DB_USER: ecs.Secret.fromSecretsManager(dbInstance.secret!, "username"),
        DB_PASSWORD: ecs.Secret.fromSecretsManager(dbInstance.secret!, "password"),
      },
    });

    container.addPortMappings({ containerPort: 3001 });

    // ─── Security group for ECS tasks ─────────────────────────────────────
    const ecsSg = new ec2.SecurityGroup(this, "EcsSg", {
      vpc,
      description: "Allow inbound from ALB to ECS tasks",
    });

    // ─── ALB ──────────────────────────────────────────────────────────────
    const albSg = new ec2.SecurityGroup(this, "AlbSg", {
      vpc,
      description: "Allow HTTP/HTTPS inbound to ALB",
    });
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), "HTTP");
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), "HTTPS");

    ecsSg.addIngressRule(albSg, ec2.Port.tcp(3001), "ALB to ECS tasks");

    this.alb = new elbv2.ApplicationLoadBalancer(this, "Alb", {
      vpc,
      internetFacing: true,
      securityGroup: albSg,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    });

    const targetGroup = new elbv2.ApplicationTargetGroup(this, "TargetGroup", {
      vpc,
      port: 3001,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: "/api/health",
        interval: cdk.Duration.seconds(30),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
      deregistrationDelay: cdk.Duration.seconds(30),
    });

    if (certificateArn) {
      const certificate = acm.Certificate.fromCertificateArn(this, "ApiCert", certificateArn);

      // HTTP → redirect to HTTPS
      this.alb.addListener("HttpListener", {
        port: 80,
        defaultAction: elbv2.ListenerAction.redirect({
          protocol: "HTTPS",
          port: "443",
          permanent: true,
        }),
      });

      // HTTPS listener
      this.alb.addListener("HttpsListener", {
        port: 443,
        certificates: [certificate],
        defaultAction: elbv2.ListenerAction.forward([targetGroup]),
      });
    } else {
      // No cert — plain HTTP
      this.alb.addListener("HttpListener", {
        port: 80,
        defaultAction: elbv2.ListenerAction.forward([targetGroup]),
      });
    }

    // ─── Fargate service (Spot for cost savings) ──────────────────────────
    this.service = new ecs.FargateService(this, "Service", {
      cluster: this.cluster,
      taskDefinition: taskDef,
      desiredCount: 1,
      securityGroups: [ecsSg],
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      assignPublicIp: false,
      healthCheckGracePeriod: cdk.Duration.seconds(60),
      capacityProviderStrategies: [
        {
          capacityProvider: "FARGATE_SPOT",
          weight: 1,
          base: 0,
        },
        {
          capacityProvider: "FARGATE",
          weight: 0,
          base: 1, // at least 1 on-demand as fallback
        },
      ],
      circuitBreaker: { rollback: false },
    });

    this.service.attachToApplicationTargetGroup(targetGroup);

    // ─── Outputs ──────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, "AlbDnsName", {
      value: this.alb.loadBalancerDnsName,
      description: "ALB DNS — use as NEXT_PUBLIC_API_URL or point your domain here",
      exportName: "ExperienceRagBotAlbDnsName",
    });

    new cdk.CfnOutput(this, "EcsClusterName", {
      value: this.cluster.clusterName,
      exportName: "ExperienceRagBotClusterName",
    });

    new cdk.CfnOutput(this, "EcsServiceName", {
      value: this.service.serviceName,
      exportName: "ExperienceRagBotServiceName",
    });
  }
}
