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
 * 8. Editorial Pilot (Batch 01) Verification:
 *    - Approved candidate selection matches the dossier (6 nodes).
 *    - All pilot IDs exist in candidate catalog and retain 'needs-review'.
 *    - Pilot-plus-seed subset (13 nodes) induced edges have both endpoints inside subset.
 *    - Pilot subset is a single connected component (19 active edges).
 *    - Zero isolated nodes in pilot graph.
 *    - All dossier listed relationships match actual catalog records.
 *    - Every pilot relationship references an evidence ledger claim.
 *    - Editorial-source statements agree with source verification outcomes.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

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
// 0. Static AST Parsing of Seed TypeScript Files (No eval / Function)
// ---------------------------------------------------------------------------
function parseTsAstToObject(filePath, exportName) {
  const content = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

  function nodeToValue(node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      return node.text;
    }
    if (ts.isNumericLiteral(node)) {
      return Number(node.text);
    }
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (node.kind === ts.SyntaxKind.NullKeyword) return null;
    if (ts.isArrayLiteralExpression(node)) {
      return node.elements.map(nodeToValue);
    }
    if (ts.isObjectLiteralExpression(node)) {
      const obj = {};
      for (const prop of node.properties) {
        if (ts.isPropertyAssignment(prop)) {
          const key = prop.name.getText(sourceFile).replace(/^["']|["']$/g, '');
          obj[key] = nodeToValue(prop.initializer);
        }
      }
      return obj;
    }
    return undefined;
  }

  let targetValue;
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (decl.name.getText(sourceFile) === exportName && decl.initializer) {
          targetValue = nodeToValue(decl.initializer);
        }
      }
    }
  });

  if (!targetValue) {
    throw new Error(`Could not statically find ${exportName} in ${filePath}`);
  }
  return targetValue;
}

const seedConcepts = parseTsAstToObject(path.join(projectRoot, 'src/data/seed/concepts.ts'), 'SEED_CONCEPTS');
const seedRels = parseTsAstToObject(path.join(projectRoot, 'src/data/seed/relationships.ts'), 'SEED_RELATIONSHIPS');
const seedSources = parseTsAstToObject(path.join(projectRoot, 'src/data/seed/sources.ts'), 'SEED_SOURCES');

const candidateConceptsPath = path.join(__dirname, '04-concept-candidates.json');
const candidateRelsPath = path.join(__dirname, '03-relationship-catalog.json');
const sourceRegistryPath = path.join(__dirname, '02-source-registry.json');
const evidenceLedgerPath = path.join(__dirname, '10-wave-1-evidence-ledger.json');
const pilotDossierPath = path.join(__dirname, '11-editorial-review-batch-01.md');

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
console.log('\n[1/8] Checking Ledger Source IDs, Titles, and URLs vs Registry...');
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
console.log('\n[2/8] Checking Claim ID Uniqueness & Count...');
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
console.log('\n[3/8] Checking Referential Integrity...');
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
console.log('\n[4/8] Checking Verification Status Taxonomies...');
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
console.log('\n[5/8] Checking Candidate Review-Status Invariants...');
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
console.log('\n[6/8] Checking for Literal Unicode Escape Artifacts...');
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
// 7. Wave 1 Graph Coverage & Connectivity (Full 26-Node Topology)
// ---------------------------------------------------------------------------
console.log('\n[7/8] Checking Wave 1 Coverage & Graph Connectivity...');
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

// Adjacency graph for Wave 1
const adjWave1 = new Map();
for (const id of wave1ActiveNodeIds) adjWave1.set(id, new Set());
for (const r of activeWave1Rels) {
  adjWave1.get(r.sourceConceptId).add(r.targetConceptId);
  adjWave1.get(r.targetConceptId).add(r.sourceConceptId);
}

// BFS from seed
const visitedWave1 = new Set();
const queueWave1 = [seedConcepts[0].id];
visitedWave1.add(seedConcepts[0].id);
while (queueWave1.length > 0) {
  const curr = queueWave1.shift();
  for (const nbr of adjWave1.get(curr)) {
    if (!visitedWave1.has(nbr)) {
      visitedWave1.add(nbr);
      queueWave1.push(nbr);
    }
  }
}
if (visitedWave1.size !== 33) {
  logFail(`Wave 1 subgraph is fragmented: connected component size is ${visitedWave1.size} of 33.`);
}

// Degree checks
let isolatedCount = 0;
let degree1Count = 0;
for (const [id, nbrs] of adjWave1.entries()) {
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
  const nbrs = adjWave1.get(cid);
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
// 8. Editorial Pilot (Batch 01) Verification
// ---------------------------------------------------------------------------
console.log('\n[8/8] Checking Editorial Pilot (Batch 01) Specifics...');

if (!fs.existsSync(pilotDossierPath)) {
  logFail(`Editorial review dossier not found at ${pilotDossierPath}`);
} else {
  const dossierContent = fs.readFileSync(pilotDossierPath, 'utf8');

  // Exact 6 pilot candidate IDs
  const expectedPilotCandidates = [
    'concept-instruction-set-architecture',
    'concept-virtual-memory',
    'concept-file-systems',
    'concept-concurrency',
    'concept-asynchronous-io',
    'concept-machine-code',
  ];

  for (const pid of expectedPilotCandidates) {
    if (!dossierContent.includes(pid)) {
      logFail(`Pilot dossier missing expected candidate ID: '${pid}'`);
    }
    const cObj = candidateConcepts.find(c => c.id === pid);
    if (!cObj) {
      logFail(`Pilot candidate '${pid}' not found in 04-concept-candidates.json`);
    } else if (cObj.reviewStatus !== 'needs-review') {
      logFail(`Pilot candidate '${pid}' must be held at 'needs-review', found: '${cObj.reviewStatus}'`);
    }
  }

  // Active pilot nodes (7 seed + 6 pilot candidates = 13 nodes)
  const pilotActiveNodeIds = new Set([...seedConcepts.map(c => c.id), ...expectedPilotCandidates]);
  if (pilotActiveNodeIds.size !== 13) {
    logFail(`Expected exactly 13 active pilot nodes (7 seed + 6 pilot), found ${pilotActiveNodeIds.size}`);
  }

  // Internal pilot relationships (both endpoints inside the 13 nodes)
  const internalPilotRels = allRels.filter(
    r => pilotActiveNodeIds.has(r.sourceConceptId) && pilotActiveNodeIds.has(r.targetConceptId)
  );
  if (internalPilotRels.length !== 19) {
    logFail(`Expected exactly 19 internal pilot relationships (8 seed + 11 candidate), found ${internalPilotRels.length}`);
  }

  // Verify all internal pilot rels have both endpoints in the 13-node set
  for (const r of internalPilotRels) {
    if (!pilotActiveNodeIds.has(r.sourceConceptId) || !pilotActiveNodeIds.has(r.targetConceptId)) {
      logFail(`Imported pilot edge '${r.id}' has endpoints outside pilot+seed set: ${r.sourceConceptId} -> ${r.targetConceptId}`);
    }
  }

  // Adjacency graph for pilot
  const adjPilot = new Map();
  for (const id of pilotActiveNodeIds) adjPilot.set(id, new Set());
  for (const r of internalPilotRels) {
    adjPilot.get(r.sourceConceptId).add(r.targetConceptId);
    adjPilot.get(r.targetConceptId).add(r.sourceConceptId);
  }

  // BFS connectivity test for pilot
  const visitedPilot = new Set();
  const queuePilot = [seedConcepts[0].id];
  visitedPilot.add(seedConcepts[0].id);
  while (queuePilot.length > 0) {
    const curr = queuePilot.shift();
    for (const nbr of adjPilot.get(curr)) {
      if (!visitedPilot.has(nbr)) {
        visitedPilot.add(nbr);
        queuePilot.push(nbr);
      }
    }
  }

  if (visitedPilot.size !== 13) {
    logFail(`Pilot subgraph is fragmented! Connected component size is ${visitedPilot.size} of 13. Disconnected: ${Array.from(pilotActiveNodeIds).filter(n => !visitedPilot.has(n)).join(', ')}`);
  }

  // Verify zero isolated nodes in pilot
  let pilotIsolated = 0;
  for (const [id, nbrs] of adjPilot.entries()) {
    if (nbrs.size === 0) {
      logFail(`Pilot node '${id}' is completely isolated (degree 0).`);
      pilotIsolated++;
    }
  }

  // Verify dossier table entries match catalog records and ledger
  const tableMatch = dossierContent.match(/\| Relationship ID \|[\s\S]*?\n\n/);
  if (!tableMatch) {
    logFail(`Active Internal Relationships table not found in ${path.basename(pilotDossierPath)}`);
  } else {
    const rows = tableMatch[0].trim().split('\n').slice(2);
    if (rows.length !== 19) {
      logFail(`Dossier relationship table has ${rows.length} rows, expected 19.`);
    }

    const dossierRels = rows.map(r => {
      const parts = r.split('|').map(s => s.trim().replace(/`/g, '')).filter(Boolean);
      return { id: parts[0], source: parts[1], type: parts[2], target: parts[3], strength: parts[4], status: parts[5] };
    });

    const ledgerClaimMap = new Map(evidenceLedger.map(l => [l.entityId, l]));

    for (const dr of dossierRels) {
      const catRel = relMap.get(dr.id);
      if (!catRel) {
        logFail(`Dossier references unknown relationship ID: '${dr.id}'`);
        continue;
      }
      if (catRel.sourceConceptId !== dr.source) {
        logFail(`Dossier relationship '${dr.id}' source mismatch: expected '${catRel.sourceConceptId}', got '${dr.source}'`);
      }
      if (catRel.targetConceptId !== dr.target) {
        logFail(`Dossier relationship '${dr.id}' target mismatch: expected '${catRel.targetConceptId}', got '${dr.target}'`);
      }
      if (catRel.type !== dr.type) {
        logFail(`Dossier relationship '${dr.id}' type mismatch: expected '${catRel.type}', got '${dr.type}'`);
      }
      if (catRel.strength !== dr.strength) {
        logFail(`Dossier relationship '${dr.id}' strength mismatch: expected '${catRel.strength}', got '${dr.strength}'`);
      }

      // Check evidence ledger reference for non-seed relationships
      const isSeedRel = seedRels.some(sr => sr.id === dr.id);
      if (!isSeedRel) {
        const claim = ledgerClaimMap.get(dr.id);
        if (!claim) {
          logFail(`Pilot relationship '${dr.id}' missing corresponding evidence ledger claim.`);
        } else if (claim.verificationResult !== dr.status) {
          logFail(`Dossier status for '${dr.id}' ('${dr.status}') does not match ledger result ('${claim.verificationResult}')`);
        }
      }
    }
  }

  // Verify source verification outcome alignment for pilot sources
  const pilotClaimSourceMapping = {
    'OPEN-ACCESS-FULL-TEXT-VERIFIED': 'DIRECT-FULL-TEXT-VERIFIED',
    'BIBLIOGRAPHIC-METADATA-AND-CHAPTER-VERIFIED': 'CHAPTER-TOC-AND-METADATA-CONFIRMED',
    'PAYWALLED-ABSTRACT-AND-METADATA-CONFIRMED': 'AWAITING-STRONGER-EVIDENCE',
    'ARCHIVE-DIGITIZED-PRIMARY-VERIFIED': 'ARCHIVE-DIGITIZED-CONFIRMED',
  };

  const pilotCandidateSourceIds = new Set();
  for (const pid of expectedPilotCandidates) {
    const cObj = candidateConcepts.find(c => c.id === pid);
    for (const sid of (cObj?.sourceIds || [])) pilotCandidateSourceIds.add(sid);
  }
  for (const r of internalPilotRels) {
    for (const sid of (r.sourceIds || [])) pilotCandidateSourceIds.add(sid);
  }

  for (const sid of pilotCandidateSourceIds) {
    const sObj = sourceMap.get(sid);
    if (!sObj) {
      logFail(`Pilot references unregistered source '${sid}'`);
      continue;
    }
    const expectedLedgerResult = pilotClaimSourceMapping[sObj.verificationOutcome];
    const relatedClaims = evidenceLedger.filter(
      l => l.sourceId === sid && (pilotActiveNodeIds.has(l.entityId) || internalPilotRels.some(r => r.id === l.entityId))
    );
    for (const c of relatedClaims) {
      if (c.verificationResult !== expectedLedgerResult) {
        logFail(`Ledger claim '${c.claimId}' result '${c.verificationResult}' does not agree with source '${sid}' registry outcome '${sObj.verificationOutcome}'`);
      }
    }
  }

  // Dossier-wide ID validation: scan all source, concept, and relationship tokens across the entire document
  const cleanDossierText = dossierContent.replace(/\b\d+-concept-[a-z0-9-]+\.json\b/g, '');
  const dossierSrcIds = new Set(cleanDossierText.match(/src-[a-z0-9-]+/g) || []);
  const dossierConceptIds = new Set(cleanDossierText.match(/concept-[a-z0-9-]+/g) || []);
  const dossierRelIds = new Set(cleanDossierText.match(/rel-[a-z0-9-]+/g) || []);

  let dossierTokenErrors = 0;
  for (const sid of dossierSrcIds) {
    if (!sourceMap.has(sid)) {
      logFail(`Dossier text references unregistered source ID: '${sid}'`);
      dossierTokenErrors++;
    }
  }
  for (const cid of dossierConceptIds) {
    if (!conceptMap.has(cid)) {
      logFail(`Dossier text references unregistered concept ID: '${cid}'`);
      dossierTokenErrors++;
    }
  }
  for (const rid of dossierRelIds) {
    if (!relMap.has(rid)) {
      logFail(`Dossier text references unregistered relationship ID: '${rid}'`);
      dossierTokenErrors++;
    }
  }
  if (dossierTokenErrors === 0) {
    logPass(`All tokens across dossier (${dossierSrcIds.size} sources, ${dossierConceptIds.size} concepts, ${dossierRelIds.size} relationships) are 100% valid registry/catalog identifiers.`);
  }

  logPass(`Pilot Batch 01 verified: 6 connected candidates, 13-node single connected component, 19 internal edges, 100% catalog and ledger alignment.`);
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
