import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

async function load(path: string): Promise<string> {
  return readFile(resolve(process.cwd(), path), 'utf8');
}

describe('AWS static-site deployment', () => {
  it('keeps the origin private and provisions the production domain', async () => {
    const template = await load('infra/site.yml');

    expect(template).toContain('Default: videobrain.org');
    expect(template).toContain(
      'Default: repo:blechdom@1987426/videobrain@1356238518:environment:production',
    );
    expect(template).toMatch(/BlockPublicAcls:\s+true/);
    expect(template).toMatch(/BlockPublicPolicy:\s+true/);
    expect(template).toMatch(/ObjectOwnership:\s+BucketOwnerEnforced/);
    expect(template).toMatch(/VersioningConfiguration:\s*\n\s+Status:\s+Enabled/);
    expect(template).toMatch(/SigningBehavior:\s+always/);
    expect(template).toMatch(/OriginAccessControlId:/);
    expect(template).toMatch(/ValidationMethod:\s+DNS/);
    expect(template).toMatch(/HostedZoneId:\s+Z2FDTNDATAQYW2/);
    expect(template).toMatch(/Type:\s+AAAA/);
    expect(template).toMatch(/Runtime:\s+cloudfront-js-2\.0/);
    expect(template).toContain("request.uri === '/storybook'");
    expect(template).toMatch(/request\.uri\.endsWith\('\/'\)/);
    expect(template).toMatch(/PathPattern:\s+\/storybook\/\*/);
    expect(template).toMatch(/ResponseHeadersPolicyId:\s+!Ref StorybookSecurityHeaders/);
    expect(template).toMatch(/FrameOption:\s+SAMEORIGIN/);
    expect(template).toMatch(/ContentSecurityPolicy:\s+"frame-ancestors 'self'"/);
    expect(template).toMatch(/Sid:\s+DenyInsecureTransport/);
    expect(template).toMatch(/Value:\s+microphone=\(self\), camera=\(self\), geolocation=\(\)/);
  });

  it('limits the deployment role to publishing and invalidation', async () => {
    const template = await load('infra/site.yml');

    expect(template).toMatch(/token\.actions\.githubusercontent\.com:aud:\s+sts\.amazonaws\.com/);
    expect(template).toMatch(/token\.actions\.githubusercontent\.com:sub:\s+!Ref GitHubOidcSubject/);
    expect(template).toMatch(/s3:PutObject/);
    expect(template).toMatch(/s3:DeleteObject/);
    expect(template).toMatch(/cloudfront:CreateInvalidation/);
    expect(template).not.toMatch(/PolicyName:[\s\S]*?route53:\*/);
    expect(template).not.toMatch(/PolicyName:[\s\S]*?iam:\*/);
  });

  it('verifies before deploying through short-lived credentials', async () => {
    const workflow = await load('.github/workflows/deploy-aws.yml');
    const preflightStart = workflow.indexOf(
      '- name: Verify CloudFront is ready for Storybook',
    );
    const publishStart = workflow.indexOf('- name: Publish static files');

    expect(workflow).toMatch(/pull_request:/);
    expect(workflow).toMatch(/push:\s*\n\s+branches:\s+\[main\]/);
    expect(workflow).toContain('npm ci');
    expect(workflow).toContain('npm run verify');
    expect(workflow).toContain('npm run build:deploy');
    expect(workflow).toContain('npm run check:storybook-dist');
    expect(workflow).toContain('npx playwright install --with-deps chromium');
    expect(workflow).toContain('npm run test:e2e');
    expect(workflow).toContain('test -f dist/index.html');
    expect(workflow).toContain('test -f dist/storybook/index.html');
    expect(workflow).toContain('test -f dist/storybook/iframe.html');
    expect(workflow).toContain('test -f dist/storybook/index.json');
    expect(workflow).toContain('name: videobrain-site');
    expect(workflow).toMatch(/id-token:\s+write/);
    expect(workflow).toMatch(/environment:\s*\n\s+name:\s+production/);
    expect(workflow).toContain("github.ref == 'refs/heads/main'");
    expect(workflow).toContain('vars.AWS_ACCOUNT_ID');
    expect(workflow).toContain('vars.AWS_DEPLOY_ROLE_ARN');
    expect(workflow).toContain('vars.AWS_SITE_BUCKET');
    expect(workflow).toContain('vars.AWS_CLOUDFRONT_DISTRIBUTION_ID');
    expect(workflow).toContain('allowed-account-ids: ${{ vars.AWS_ACCOUNT_ID }}');
    expect(workflow).toContain('cloudfront wait invalidation-completed');
    expect(workflow).toContain('https://videobrain.org/');
    expect(workflow).toContain(
      'https://videobrain.org/storybook/__cloudfront-policy-probe__',
    );
    expect(workflow).toContain('https://videobrain.org/storybook/iframe.html');
    expect(workflow).toContain('https://videobrain.org/storybook/index.json');
    expect(workflow).toMatch(/x-frame-options:.*DENY/i);
    expect(workflow).toMatch(/x-frame-options:.*SAMEORIGIN/i);
    expect(workflow).toMatch(/content-security-policy:.*frame-ancestors/i);
    expect(preflightStart).toBeGreaterThanOrEqual(0);
    expect(preflightStart).toBeLessThan(publishStart);
    expect(
      workflow.slice(
        workflow.lastIndexOf('curl ', workflow.indexOf('__cloudfront-policy-probe__')),
        workflow.indexOf('__cloudfront-policy-probe__'),
      ),
    ).not.toContain('--fail');
    expect(workflow).toContain('group: videobrain-${{ github.workflow }}-${{ github.ref }}');
    expect(workflow).toContain('--exclude "*.html"');
    expect(workflow.indexOf('aws s3 sync')).toBeLessThan(workflow.indexOf('aws s3 cp'));
    expect(workflow).not.toContain('AWS_ACCESS_KEY_ID');
    expect(workflow).not.toContain('AWS_SECRET_ACCESS_KEY');
  });

  it('uses safe defaults in the local bootstrap and deployment scripts', async () => {
    const [bootstrap, deploy] = await Promise.all([
      load('scripts/bootstrap-aws-site.sh'),
      load('scripts/deploy-aws-site.sh'),
    ]);

    expect(bootstrap).toContain('videobrain-production');
    expect(bootstrap).toContain('videobrain.org');
    expect(bootstrap).toContain('blechdom/videobrain');
    expect(bootstrap).toContain('actions/oidc/customization/sub');
    expect(bootstrap).toContain('--jq .sub_claim_prefix');
    expect(bootstrap).toContain(
      'github_oidc_subject="${github_subject_prefix}:environment:${github_environment_claim}"',
    );
    expect(bootstrap).toContain('GITHUB_OIDC_SUBJECT explicitly');
    expect(bootstrap).toContain('Existing apex/www records must be reviewed');
    expect(bootstrap).toContain('CreateGitHubOidcProvider=$create_provider');
    expect(deploy).toContain('videobrain-production');
    expect(deploy).toContain('npm run build:deploy');
    expect(deploy).toContain('required_storybook_file');
    expect(deploy).toContain('storybook/$required_storybook_file');
    expect(deploy).toContain('check-storybook-artifact.mjs');
    expect(deploy).not.toContain('--delete');
    expect(deploy).toContain('--exclude "*.html"');
    expect(deploy).toContain('--dryrun');
    expect(deploy).toContain('public,max-age=0,must-revalidate');
  });
});
