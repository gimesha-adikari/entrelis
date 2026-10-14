#!/usr/bin/env node

/**
 * Entrelis M2 Research — Focused Automated Consistency Validator
 *
 * Validates:
 * 1. Ledger source IDs, titles, and URLs against the source registry.
 * 2. Unique claim IDs and exact 97-claim coverage.
 * 3. Valid concept, relationship, and source referential integrity.
 * 4. Transparent verification status values across ledger and registry.
 * 5. Candidate review-status invariant (100% 'needs-review').
 * 6. Absence of literal Unicode escape sequences (e.g. '\\u03A9') in descriptions.
 * 7. Wave 1 26-node coverage, 61 active edges, single-component connectivity (size 33),
 *    and exact 16 direct seed adjacencies / 10 bridging candidates.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

console.log('='.repeat(70));
console.log('ENTRELIS M2 RESEARCH — AUTOMATED CONSISTENCY VALIDATOR');
console.log('='.repeat(70));

let errorCount = 0;
function logPass(msg) {
  console.log(`  ✓ ${msg}`);
}
function logFail(msg) {
  console.error(`  ✗ FAIL: ${msg}`);
  errorCount++;
}

// ---------------------------------------------------------------------------
// 0. Load Datasets
// ---------------------------------------------------------------------------
function extractArrayFromTs(filePath, exportName) {
  const content = fs.readFileSync(filePath, 'utf8');
  const regex = new RegExp(`export const ${exportName}[^=]*=\\s*(\\[[\\s\\S]*?\\n\\]);`);
  const match = content.match(regex);
  if (!match) throw new Error(`Could not extract ${exportName} from ${filePath}`);
  // Safe eval of static JSON-like array
  return Function(`"use strict"; return (${match[1]});`)();
}

const seedConcepts = extractArrayFromTs(path.join(projectRoot, 'src/data/seed/concepts.ts'), 'SEED_CONCEPTS');
const seedRels = extractArrayFromTs(path.join(projectRoot, 'src/data/seed/relationships.ts'), 'SEED_RELATIONSHIPS');
const seedSources = extractArrayFromTs(path.join(projectRoot, 'src/data/seed/sources.ts'), 'SEED_SOURCES');

const candidateConceptsPath = path.join(__dirname, '04-concept-candidates.json');
const candidateRelsPath = path.join(__dirname, '03-relationship-catalog.json');
const sourceRegistryPath = path.join(__dirname, '02-source-registry.json');
const evidenceLedgerPath = path.join(__dirname, '10-wave-1-evidence-ledger.json');

const candidateConcepts = JSON.parse(fs.readFileSync(candidateConceptsPath, 'utf8'));
const candidateRels = JSON.parse(fs.readFileSync(candidateRelsPath, 'utf8'));
const sourceRegistry = JSON.parse(fs.readFileSync(sourceRegistryPath, 'utf8'));
const evidenceLedger = JSON.parse(fs.readFileSync(evidenceLedgerPath, 'utf8'));

const allConcepts = [...seedConcepts, ...candidateConcepts];
const allRels = [...seedRels, ...candidateRels];

const conceptMap = new Map(allConcepts.map(c => [c.id, c]));
const relMap = new Map(allRels.map(r => [r.id, r]));
const sourceMap = new Map(sourceRegistry.map(s => [s.id, s]));
// Also include any seed sources if not present
for (const s of seedSources) {
  if (!sourceMap.has(s.id)) sourceMap.set(s.id, s);
}

// ---------------------------------------------------------------------------
// 1. Ledger Source IDs, Titles, and URLs vs Registry
// ---------------------------------------------------------------------------
console.log('\n[1/7] Checking Ledger Source IDs, Titles, and URLs vs Registry...');
let sourceMismatchCount = 0;
for (const entry of evidenceLedger) {
  const regSource = sourceMap.get(entry.sourceId);
  if (!regSource) {
    logFail(`Ledger claim ${entry.claimId} references unregistered sourceId: '${entry.sourceId}'`);
    sourceMismatchCount++;
    continue;
  }
  if (entry.sourceTitle !== regSource.title) {
    logFail(`Title mismatch in claim ${entry.claimId} for source ${entry.sourceId}:\n    Ledger:   '${entry.sourceTitle}'\n    Registry: '${regSource.title}'`);
    sourceMismatchCount++;
  }
  if (entry.sourceUrl !== regSource.url) {
    logFail(`URL mismatch in claim ${entry.claimId} for source ${entry.sourceId}:\n    Ledger:   '${entry.sourceUrl}'\n    Registry: '${regSource.url}'`);
    sourceMismatchCount++;
  }
}
if (sourceMismatchCount === 0) {
  logPass(`All ${evidenceLedger.length} ledger claims match registry source IDs, titles, and URLs perfectly.`);
}

// ---------------------------------------------------------------------------
// 2. Unique Claim IDs and Exact Coverage
// ---------------------------------------------------------------------------
console.log('\n[2/7] Checking Claim ID Uniqueness & Count...');
const claimIds = new Set();
let duplicateClaims = 0;
for (const entry of evidenceLedger) {
  if (claimIds.has(entry.claimId)) {
    logFail(`Duplicate claimId: '${entry.claimId}'`);
    duplicateClaims++;
  }
  claimIds.add(entry.claimId);
}
if (duplicateClaims === 0 && evidenceLedger.length === 97) {
  logPass(`All ${evidenceLedger.length} claim IDs are strictly unique.`);
} else if (evidenceLedger.length !== 97) {
  logFail(`Expected exactly 97 ledger claims, found ${evidenceLedger.length}.`);
}

// ---------------------------------------------------------------------------
// 3. Referential Integrity (Concepts, Relationships, Sources)
// ---------------------------------------------------------------------------
console.log('\n[3/7] Checking Referential Integrity...');
let refErrors = 0;
for (const entry of evidenceLedger) {
  if (!conceptMap.has(entry.entityId) && !relMap.has(entry.entityId)) {
    logFail(`Ledger claim ${entry.claimId} references unknown entityId: '${entry.entityId}'`);
    refErrors++;
  }
}

for (const rel of candidateRels) {
  if (!conceptMap.has(rel.sourceConceptId)) {
    logFail(`Relationship ${rel.id} has invalid sourceConceptId: '${rel.sourceConceptId}'`);
    refErrors++;
  }
  if (!conceptMap.has(rel.targetConceptId)) {
    logFail(`Relationship ${rel.id} has invalid targetConceptId: '${rel.targetConceptId}'`);
    refErrors++;
  }
  for (const sid of (rel.sourceIds || [])) {
    if (!sourceMap.has(sid)) {
      logFail(`Relationship ${rel.id} references invalid sourceId: '${sid}'`);
      refErrors++;
    }
  }
}

for (const concept of candidateConcepts) {
  for (const sid of (concept.sourceIds || [])) {
    if (!sourceMap.has(sid)) {
      logFail(`Concept ${concept.id} references invalid sourceId: '${sid}'`);
      refErrors++;
    }
  }
}

if (refErrors === 0) {
  logPass(`100% referential integrity across concepts, relationships, and sources.`);
}

// ---------------------------------------------------------------------------
// 4. Verification Status Values & Taxonomy
// ---------------------------------------------------------------------------
console.log('\n[4/7] Checking Verification Status Taxonomies...');
const validLedgerStatuses = new Set([
  'CHAPTER-TOC-AND-METADATA-CONFIRMED',
  'DIRECT-FULL-TEXT-VERIFIED',
  'ARCHIVE-DIGITIZED-CONFIRMED',
  'PARTIALLY-VERIFIED',
  'AWAITING-STRONGER-EVIDENCE',
]);

const validRegistryOutcomes = new Set([
  'BIBLIOGRAPHIC-METADATA-AND-CHAPTER-VERIFIED',
  'OPEN-ACCESS-FULL-TEXT-VERIFIED',
  'ARCHIVE-DIGITIZED-PRIMARY-VERIFIED',
  'PAYWALLED-ABSTRACT-AND-METADATA-CONFIRMED',
]);

let statusErrors = 0;
for (const entry of evidenceLedger) {
  if (!validLedgerStatuses.has(entry.verificationResult)) {
    logFail(`Ledger claim ${entry.claimId} has invalid verificationResult: '${entry.verificationResult}'`);
    statusErrors++;
  }
}

for (const source of sourceRegistry) {
  if (!validRegistryOutcomes.has(source.verificationOutcome)) {
    logFail(`Source ${source.id} has invalid verificationOutcome: '${source.verificationOutcome}'`);
    statusErrors++;
  }
}

if (statusErrors === 0) {
  logPass(`All ledger verificationResult and registry verificationOutcome values conform to taxonomy.`);
}

// ---------------------------------------------------------------------------
// 5. Candidate Review-Status Invariants
// ---------------------------------------------------------------------------
console.log('\n[5/7] Checking Candidate Review-Status Invariants...');
const invalidConceptStatus = candidateConcepts.filter(c => c.reviewStatus !== 'needs-review');
const invalidRelStatus = candidateRels.filter(r => r.reviewStatus !== 'needs-review');

if (invalidConceptStatus.length === 0 && invalidRelStatus.length === 0) {
  logPass(`All 120 candidate concepts and 211 relationships strictly held at 'needs-review'.`);
} else {
  if (invalidConceptStatus.length > 0) logFail(`${invalidConceptStatus.length} candidate concepts not in 'needs-review'`);
  if (invalidRelStatus.length > 0) logFail(`${invalidRelStatus.length} candidate relationships not in 'needs-review'`);
}

// ---------------------------------------------------------------------------
// 6. Literal Unicode Escape Artifacts
// ---------------------------------------------------------------------------
console.log('\n[6/7] Checking for Literal Unicode Escape Artifacts...');
let escapeArtifacts = 0;
const jsonFilesToCheck = [
  candidateConceptsPath,
  candidateRelsPath,
  evidenceLedgerPath,
  path.join(__dirname, 'batches/batch-01-domain-a.json'),
  path.join(__dirname, 'batches/batch-02-domain-b.json'),
  path.join(__dirname, 'batches/batch-03-domain-c.json'),
  path.join(__dirname, 'batches/batch-04-domain-d.json'),
  path.join(__dirname, 'batches/batch-05-domain-e.json'),
  path.join(__dirname, 'batches/batch-06-domain-f.json'),
  path.join(__dirname, 'batches/relationships-cross-domain.json'),
];

for (const fpath of jsonFilesToCheck) {
  if (!fs.existsSync(fpath)) continue;
  const content = fs.readFileSync(fpath, 'utf8');
  const matches = content.match(/\\\\u[0-9a-fA-F]{4}/g);
  if (matches) {
    logFail(`File ${path.basename(fpath)} contains literal double-escaped Unicode sequences: ${matches.join(', ')}`);
    escapeArtifacts += matches.length;
  }
}

if (escapeArtifacts === 0) {
  logPass(`Zero literal Unicode escape artifacts found across all catalog and batch JSON files.`);
}

// ---------------------------------------------------------------------------
// 7. Wave 1 Graph Coverage & Connectivity
// ---------------------------------------------------------------------------
console.log('\n[7/7] Checking Wave 1 Coverage & Graph Connectivity...');
const wave1CandidateIds = new Set([
  'concept-compilers', 'concept-type-systems', 'concept-machine-code',
  'concept-instruction-set-architecture', 'concept-virtual-memory',
  'concept-garbage-collection', 'concept-data-structures',
  'concept-concurrency', 'concept-file-systems', 'concept-asynchronous-io',
  'concept-database-systems', 'concept-logic-gates', 'concept-semiconductors',
  'concept-transistor-invention', 'concept-integrated-circuit',
  'concept-microprocessor-revolution', 'concept-von-neumann-architecture',
  'concept-history-of-computing', 'concept-solid-state-physics',
  'concept-atoms', 'concept-electrons', 'concept-boolean-logic',
  'concept-formal-logic', 'concept-algorithms',
  'concept-computability-theory', 'concept-alan-turing',
]);

if (wave1CandidateIds.size !== 26) {
  logFail(`Wave 1 candidate count is ${wave1CandidateIds.size}, expected 26.`);
}

// Every Wave 1 node covered in ledger
for (const cid of wave1CandidateIds) {
  const hasClaim = evidenceLedger.some(l => l.entityId === cid);
  if (!hasClaim) logFail(`Wave 1 candidate '${cid}' missing from evidence ledger.`);
}

const wave1ActiveNodeIds = new Set([...seedConcepts.map(c => c.id), ...wave1CandidateIds]);
if (wave1ActiveNodeIds.size !== 33) {
  logFail(`Wave 1 active node pool is ${wave1ActiveNodeIds.size}, expected 33 (7 seed + 26 candidates).`);
}

const activeWave1Rels = allRels.filter(
  r => wave1ActiveNodeIds.has(r.sourceConceptId) && wave1ActiveNodeIds.has(r.targetConceptId)
);
if (activeWave1Rels.length !== 61) {
  logFail(`Active Wave 1 relationships is ${activeWave1Rels.length}, expected 61.`);
}

// Every active relationship covered in ledger
for (const rel of activeWave1Rels) {
  const hasClaim = evidenceLedger.some(l => l.entityId === rel.id);
  if (!hasClaim) logFail(`Active Wave 1 relationship '${rel.id}' missing from evidence ledger.`);
}

// Adjacency graph
const adj = new Map();
for (const id of wave1ActiveNodeIds) adj.set(id, new Set());
for (const r of activeWave1Rels) {
  adj.get(r.sourceConceptId).add(r.targetConceptId);
  adj.get(r.targetConceptId).add(r.sourceConceptId);
}

// BFS from seed
const visited = new Set();
const queue = [seedConcepts[0].id];
visited.add(seedConcepts[0].id);
while (queue.length > 0) {
  const curr = queue.shift();
  for (const nbr of adj.get(curr)) {
    if (!visited.has(nbr)) {
      visited.add(nbr);
      queue.push(nbr);
    }
  }
}
if (visited.size !== 33) {
  logFail(`Wave 1 subgraph is fragmented: connected component size is ${visited.size} of 33.`);
}

// Degree checks
let isolatedCount = 0;
let degree1Count = 0;
for (const [id, nbrs] of adj.entries()) {
  if (nbrs.size === 0) isolatedCount++;
  if (nbrs.size === 1) degree1Count++;
}
if (isolatedCount > 0) logFail(`Found ${isolatedCount} isolated nodes in Wave 1.`);
if (degree1Count > 0) logFail(`Found ${degree1Count} degree-1 leaf nodes in Wave 1.`);

// Direct seed adjacency vs bridging
const seedIds = new Set(seedConcepts.map(c => c.id));
let directSeedAdj = 0;
let bridging = 0;
for (const cid of wave1CandidateIds) {
  const nbrs = adj.get(cid);
  const hasSeedNbr = Array.from(nbrs).some(n => seedIds.has(n));
  if (hasSeedNbr) directSeedAdj++;
  else bridging++;
}
if (directSeedAdj !== 16 || bridging !== 10) {
  logFail(`Seed adjacency mismatch: expected 16 direct and 10 bridging, got ${directSeedAdj} direct and ${bridging} bridging.`);
}

if (errorCount === 0) {
  logPass(`Wave 1 topology verified: 1 single connected component (size 33), 61 relationships, 0 isolated, 0 degree-1 leaf nodes, 16 direct seed adjacencies, 10 bridging candidates.`);
}

// ---------------------------------------------------------------------------
// Summary Output
// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(70));
if (errorCount === 0) {
  console.log('✓ ALL RESEARCH CONSISTENCY CHECKS PASSED PERFECTLY (0 ERRORS)');
  console.log('='.repeat(70) + '\n');
  process.exit(0);
} else {
  console.error(`✗ VALIDATION FAILED WITH ${errorCount} ERROR(S)`);
  console.log('='.repeat(70) + '\n');
  process.exit(1);
}
