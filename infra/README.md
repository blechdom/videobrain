# VideoBrain on AWS

Production uses:

- a private, encrypted, versioned S3 bucket;
- CloudFront with signed Origin Access Control and HTTPS;
- an ACM certificate for `videobrain.org` and `www.videobrain.org`;
- Route 53 `A` and `AAAA` aliases;
- a GitHub Actions OIDC role limited to publishing site objects and invalidating this distribution.

The stack must be deployed in `us-east-1` because CloudFront certificates must
exist there. `www.videobrain.org` redirects to the apex domain, and directory
paths resolve to their `index.html` document.
The component catalog is published at `/storybook/`; only that path allows
same-origin framing, which its preview pane requires. The main application
continues to deny framing.

## Prerequisites

1. The public Route 53 hosted zone for `videobrain.org` must be in the target
   AWS account.
2. Install AWS CLI v2 and authenticate with an administrator or bootstrap
   profile, preferably through IAM Identity Center.
3. Authenticate GitHub CLI with access to `blechdom/videobrain`.
4. Create a GitHub environment named `production`, restrict it to `main`, and
   add required reviewers if desired.

The bootstrap script asks GitHub for the repository's exact OIDC subject prefix
and appends the `production` environment. For this repository, the resolved
subject is:

```text
repo:blechdom@1987426/videobrain@1356238518:environment:production
```

GitHub's immutable subject format includes stable owner and repository IDs.
That prevents a renamed or transferred repository from inheriting this role by
name alone. An organization can still customize OIDC subjects; override the
resolved value when required:

```bash
GITHUB_OIDC_SUBJECT='the-exact-configured-subject' \
  AWS_PROFILE=videobrain ./scripts/bootstrap-aws-site.sh
```

The bootstrap identity needs CloudFormation, S3, CloudFront, ACM, Route 53, IAM
role, and IAM OIDC-provider permissions. The routine CI role does not receive
those administrative permissions.

## One-time bootstrap

The script checks the caller account, finds the exact public hosted zone,
refuses to take over existing apex or `www` address records during initial
creation, and asks for confirmation before provisioning:

```bash
AWS_PROFILE=videobrain ./scripts/bootstrap-aws-site.sh
```

CloudFront creation commonly takes several minutes. The script prints the AWS
account, bucket, distribution, and deploy-role values, followed by commands to
set these GitHub repository variables:

- `AWS_ACCOUNT_ID`
- `AWS_DEPLOY_ROLE_ARN`
- `AWS_SITE_BUCKET`
- `AWS_CLOUDFRONT_DISTRIBUTION_ID`

They are identifiers rather than credentials. CI obtains short-lived AWS
credentials through OIDC; do not add long-lived AWS access keys to GitHub.

## Initial or manual deployment

```bash
npm ci
npm run build:deploy
npm run check:storybook-dist
AWS_PROFILE=videobrain ./scripts/deploy-aws-site.sh dist
```

When no artifact argument is supplied, the deployment script runs
`npm run build:deploy` itself. To preview the S3 synchronization without uploading,
deleting, or invalidating anything:

```bash
DRY_RUN=true AWS_PROFILE=videobrain ./scripts/deploy-aws-site.sh dist
```

After the four GitHub variables are configured,
`.github/workflows/deploy-aws.yml` verifies and packages pull requests and
deploys successful pushes to `main`. HTML is published with immediate
revalidation after all other assets are present; other assets use a five-minute
revalidation window. Old hashed assets are retained so cached pages never point
at files removed during a release. Each release waits for its CloudFront
invalidation and then smoke-tests the application, component catalog, and their
separate framing policies.

## Cost and recovery

S3, CloudFront, Route 53, and invalidation usage can incur AWS charges. The
bucket is retained if the CloudFormation stack is deleted. S3 versioning keeps
overwritten or deleted objects recoverable until noncurrent versions expire
after 30 days. The GitHub OIDC provider is also retained because it is shared at
the AWS-account level.
