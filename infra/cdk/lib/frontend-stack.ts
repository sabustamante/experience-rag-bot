import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

interface FrontendStackProps extends cdk.StackProps {
  appName: string;
  /** Custom domain for the frontend (e.g. example.com) */
  domainName?: string;
  /** ACM certificate ARN — required when domainName is set */
  certificateArn?: string;
}

export class FrontendStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const { appName, domainName, certificateArn } = props;

    // ─── S3 bucket (private — served only via CloudFront OAC) ─────────────
    this.bucket = new s3.Bucket(this, "WebBucket", {
      bucketName: `${appName}-web-${this.account}-${this.region}`,
      versioned: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
    });

    const certificate =
      domainName && certificateArn
        ? acm.Certificate.fromCertificateArn(this, "FrontendCert", certificateArn)
        : undefined;

    // ─── CloudFront distribution ──────────────────────────────────────────
    this.distribution = new cloudfront.Distribution(this, "Distribution", {
      comment: `${appName} — Next.js static export`,
      domainNames: domainName ? [domainName] : undefined,
      certificate,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        compress: true,
      },
      defaultRootObject: "index.html",
      errorResponses: [
        {
          // SPA fallback — 404 → index.html (Next.js static export)
          httpStatus: 404,
          responsePagePath: "/index.html",
          responseHttpStatus: 200,
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 403,
          responsePagePath: "/index.html",
          responseHttpStatus: 200,
          ttl: cdk.Duration.seconds(0),
        },
      ],
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // US, Canada, Europe
    });

    // ─── Outputs ──────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, "BucketName", {
      value: this.bucket.bucketName,
      description: "S3 bucket — sync next build output here",
      exportName: "ExperienceRagBotWebBucket",
    });

    new cdk.CfnOutput(this, "DistributionId", {
      value: this.distribution.distributionId,
      description: "CloudFront distribution ID — used for cache invalidation",
      exportName: "ExperienceRagBotDistributionId",
    });

    new cdk.CfnOutput(this, "DistributionUrl", {
      value: `https://${this.distribution.distributionDomainName}`,
      description: "CloudFront URL — point your domain CNAME here",
      exportName: "ExperienceRagBotDistributionUrl",
    });
  }
}
