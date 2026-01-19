# Production Deployment Checklist

Complete this checklist before deploying MindMux to production.

## Pre-Deployment Planning

- [ ] Deployment date and time scheduled
- [ ] Change window approved by management
- [ ] Stakeholders notified
- [ ] Rollback plan documented
- [ ] On-call engineer assigned
- [ ] Backup of current state taken

## Code Quality & Testing

- [ ] All tests passing: `npm test`
- [ ] TypeScript compilation clean: `npm run typecheck`
- [ ] Code reviewed and approved
- [ ] Security audit passed: `npm audit`
- [ ] No console errors or warnings
- [ ] Performance benchmarks met
- [ ] Load testing completed (if applicable)

## Infrastructure Prerequisites

- [ ] Production servers provisioned
- [ ] PostgreSQL database created and configured
- [ ] Redis cache deployed and verified
- [ ] Network connectivity tested
- [ ] Firewall rules configured
- [ ] SSL/TLS certificates installed
- [ ] DNS records updated

## Application Configuration

- [ ] `.env.production` created with all required variables
- [ ] Database credentials set securely
- [ ] Redis credentials set securely
- [ ] API encryption keys generated and stored
- [ ] Feature flags configured
- [ ] Log levels set appropriately
- [ ] Backup settings configured
- [ ] Environment variables validated

## Deployment Execution

### Installation Phase

- [ ] `./deploy/scripts/install.sh v0.1.0` executed successfully
- [ ] systemd service file installed
- [ ] Systemd service enabled: `sudo systemctl enable mindmux`
- [ ] User and group created (mindmux:mindmux)
- [ ] File permissions verified
- [ ] systemd service started: `sudo systemctl start mindmux`
- [ ] Service status checked: `sudo systemctl status mindmux`

### Database Setup

- [ ] Database migrations run: `npm run migrate -- --to latest`
- [ ] Initial seed data loaded (if needed)
- [ ] Database connectivity verified
- [ ] Connection pool settings appropriate
- [ ] Backup strategy configured

### Application Verification

- [ ] Health check endpoint responds: `curl http://localhost:3000/health`
- [ ] Application logs show no errors
- [ ] Metrics endpoint accessible: `curl http://localhost:3000/metrics`
- [ ] Database queries working
- [ ] Cache connectivity working
- [ ] All agents can be created and managed
- [ ] Tasks can be queued and processed

## Monitoring & Alerting Setup

- [ ] Prometheus configured and scraping metrics
- [ ] Prometheus targets show "UP"
- [ ] Grafana dashboard imported and displaying data
- [ ] Alert rules loaded and active
- [ ] Alertmanager configured and connected
- [ ] Alert notifications tested (Slack, email, etc.)
- [ ] Runbook links verified

## Backup & Disaster Recovery

- [ ] Backup script tested: `./deploy/scripts/backup.sh /backups`
- [ ] Backup files created and verified
- [ ] Backup encryption enabled (if applicable)
- [ ] Off-site backup storage configured
- [ ] Restore procedure tested: `./deploy/scripts/restore.sh`
- [ ] Recovery time objective (RTO) validated
- [ ] Recovery point objective (RPO) validated

## Security & Compliance

- [ ] SSL/TLS enabled and certificate valid
- [ ] API authentication working
- [ ] Rate limiting functional
- [ ] CORS headers configured correctly
- [ ] Security headers in place (if using reverse proxy)
- [ ] Secrets properly encrypted and managed
- [ ] No sensitive data in logs
- [ ] Access controls verified
- [ ] Firewall rules restricting access

## Documentation & Handoff

- [ ] Production configuration documented
- [ ] Runbooks updated and accessible
- [ ] Incident response procedures documented
- [ ] On-call rotation established
- [ ] Emergency contacts list created
- [ ] Deployment timeline documented
- [ ] Team trained on operations
- [ ] Documentation links shared

## Post-Deployment Monitoring (24-48 hours)

### Hour 1

- [ ] Application metrics normal
- [ ] No error spikes in logs
- [ ] Database performance acceptable
- [ ] Memory and CPU usage normal
- [ ] Request latency acceptable
- [ ] No alert incidents
- [ ] Check email for any automated alerts

### Hour 4

- [ ] All systems still healthy
- [ ] No user-reported issues
- [ ] Database size growth expected
- [ ] Cache hit rates good
- [ ] No connection pool issues

### Day 1

- [ ] Overall uptime > 99%
- [ ] Average latency < 500ms
- [ ] Error rate < 0.1%
- [ ] No manual interventions required
- [ ] Users reporting normal operation
- [ ] Backup ran successfully
- [ ] Logs are clean and readable

### Day 2-3

- [ ] Full day of production traffic
- [ ] Patterns established and baseline recorded
- [ ] No cascading failures
- [ ] Scaling behavior acceptable
- [ ] Disaster recovery drill passed
- [ ] Zero-downtime update tested

## Rollback Procedure (If Needed)

If critical issues detected within 24 hours:

- [ ] Enable drain mode: `mindmux config:set ENABLE_DRAIN_MODE true`
- [ ] Wait for existing tasks to complete
- [ ] Stop service: `sudo systemctl stop mindmux`
- [ ] Restore from pre-deployment backup: `./deploy/scripts/restore.sh`
- [ ] Revert to previous version (if applicable)
- [ ] Start service: `sudo systemctl start mindmux`
- [ ] Verify health and functionality
- [ ] Post-incident review scheduled

## Sign-Off

### Deployment Engineer

- [ ] Name: ___________________________
- [ ] Date: ___________________________
- [ ] Signature: ___________________________

### QA/Reviewer

- [ ] Name: ___________________________
- [ ] Date: ___________________________
- [ ] Signature: ___________________________

### Operations Lead

- [ ] Name: ___________________________
- [ ] Date: ___________________________
- [ ] Signature: ___________________________

## Post-Deployment Review

- [ ] Incident review meeting held (if issues occurred)
- [ ] Deployment timeline documented
- [ ] Performance benchmarks compared
- [ ] Lessons learned captured
- [ ] Documentation updated
- [ ] Runbooks refined
- [ ] Metrics baseline established

---

## Deployment Details

**Version:** _______________________
**Date:** _______________________
**Environment:** _______________________
**Deployed By:** _______________________
**Reviewed By:** _______________________

## Issues Encountered

(Note any issues and resolutions here)

```

```

## Notes

(Additional notes and observations)

```

```

---

**Document Version:** 1.0
**Last Updated:** 2025-01-19
