#!/usr/bin/env node

/**
 * SmartLight OS - Enterprise Platform License Generator CLI
 * 
 * Generates cryptographically signed license keys and tokens for
 * municipal streetlighting deployments (MeitY MeghRaj / JKHUDD compliant).
 * 
 * Usage:
 *   node scripts/generate-license.js [options]
 * 
 * Options:
 *   --licensee="<name>"       Licensee Authority name (default: JKHUDD)
 *   --tier=<tier>             ENTERPRISE_STATE_DIRECTORATE | STATEWIDE_MEGA_FLEET | ALL_INDIA_SMART_CITIES
 *   --nodes=<number>          Max controlled luminaires (default: 10000)
 *   --ulbs=<number>           Max municipal tenancies (default: 10)
 *   --years=<number>          O&M Contract validity in years (default: 7)
 *   --out=<file>              Path to write .lic token file
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Parse CLI args
const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const prefix = `--${name}=`;
  const match = args.find((a) => a.startsWith(prefix));
  if (match) return match.substring(prefix.length);
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return fallback;
};

const licensee = getArg('licensee', 'J&K Housing & Urban Development Department (JKHUDD)');
const tier = getArg('tier', 'ENTERPRISE_STATE_DIRECTORATE');
const nodes = parseInt(getArg('nodes', tier === 'STATEWIDE_MEGA_FLEET' ? '25000' : tier === 'ALL_INDIA_SMART_CITIES' ? '100000' : '10000'), 10);
const ulbs = parseInt(getArg('ulbs', tier === 'STATEWIDE_MEGA_FLEET' ? '25' : tier === 'ALL_INDIA_SMART_CITIES' ? '50' : '10'), 10);
const years = parseInt(getArg('years', tier === 'ALL_INDIA_SMART_CITIES' ? '15' : tier === 'STATEWIDE_MEGA_FLEET' ? '10' : '7'), 10);
const outFile = getArg('out', null);

const now = new Date();
const expiry = new Date();
expiry.setFullYear(now.getFullYear() + years);

const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
const capacityK = Math.round(nodes / 1000);
const tierPrefix = tier === 'ALL_INDIA_SMART_CITIES' ? 'MEGA' : tier === 'STATEWIDE_MEGA_FLEET' ? 'EXP' : 'ENT';

// Serial Key
const formattedKey = `SL-${tierPrefix}-${now.getFullYear()}-${licensee.includes('JK') ? 'JKHUDD' : 'MUNI'}-${capacityK}K-${years}Y-${randomSuffix}`;

const tierName =
  tier === 'STATEWIDE_MEGA_FLEET'
    ? `Statewide Mega Fleet Tier (${nodes.toLocaleString('en-IN')} Nodes / ${years}-Yr O&M)`
    : tier === 'ALL_INDIA_SMART_CITIES'
      ? `All-India Smart Cities Mega Fleet (${nodes.toLocaleString('en-IN')} Nodes / Perpetual)`
      : `Enterprise State Directorate (${years}-Year O&M Contract)`;

const payload = {
  licenseId: `SL-LIC-${now.getFullYear()}-${randomSuffix}`,
  licenseKey: formattedKey,
  licensee,
  tier,
  tierName,
  issuingAuthority: 'SmartLight OS Sovereign Core - Licensing Authority (GoI Certified)',
  issuedAt: now.toISOString(),
  validFrom: now.toISOString(),
  validUntil: expiry.toISOString(),
  omContractYears: years,
  status: 'ACTIVE_GOVERNED',
  maxLuminaires: nodes,
  maxUlbs: ulbs,
  maxCcmsPanels: Math.max(100, Math.round(nodes / 100)),
  maxOperatorSeats: -1,
  slaGuarantee: '99.8% System Uptime SLA (MeitY MeghRaj Certified)',
  features: {
    astronomicalEngine: true,
    gisSpatialIndex: true,
    multiTenantRbac: true,
    slaUptimeAudit: true,
    mqttCcmsTelemetry: true,
    meityMeghrajSovereignty: true,
    energySavingsBaseline: true,
    restApiIntegrations: true,
  },
};

// Cryptographic Signature
const signature = crypto
  .createHmac('sha256', 'smartlight-os-licensing-secret-2026')
  .update(JSON.stringify(payload))
  .digest('hex');

const signedCertificate = {
  ...payload,
  cryptographicSignature: `SHA256:${signature}`,
};

const signedToken = Buffer.from(JSON.stringify(signedCertificate)).toString('base64');

// Display Formatted Output
console.log('\n================================================================');
console.log('       SMARTLIGHT OS - ENTERPRISE PLATFORM LICENSE GENERATOR    ');
console.log('       MeitY MeghRaj Sovereign Cloud • JKHUDD Tender Compliant  ');
console.log('================================================================\n');

console.log(`Licensee:          ${licensee}`);
console.log(`Subscription Tier: ${tierName}`);
console.log(`Governed Nodes:    ${nodes.toLocaleString('en-IN')} Luminaires`);
console.log(`Municipal ULBs:    ${ulbs} Municipal Tenancies`);
console.log(`O&M Contract Term: ${years} Years (Expires: ${expiry.toLocaleDateString('en-IN')})`);
console.log(`SLA Guarantee:     99.8% Uptime SLA (Clause 46 & 52)`);
console.log(`Cryptographic Sig: SHA256:${signature.substring(0, 32)}...`);
console.log('\n----------------------------------------------------------------');
console.log('SERIAL LICENSE KEY (Paste into Master Console):');
console.log(`\x1b[33m\x1b[1m${formattedKey}\x1b[0m`);
console.log('----------------------------------------------------------------');
console.log('\nFULL SIGNED TOKEN (Base64 .lic format):');
console.log(`\x1b[36m${signedToken}\x1b[0m\n`);

if (outFile) {
  const resolvedOut = path.resolve(process.cwd(), outFile);
  fs.writeFileSync(resolvedOut, JSON.stringify(signedCertificate, null, 2), 'utf-8');
  console.log(`✓ Official License Certificate saved to: ${resolvedOut}\n`);
}
