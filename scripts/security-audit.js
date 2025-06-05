import fs from 'fs';
import path from 'path';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Security patterns to check
const securityPatterns = {
  uncheckedArithmetic: {
    patterns: [
      /\+(?!\s*=)/g,  // Addition not followed by =
      /\*(?!\s*=)/g,  // Multiplication not followed by =
      /\-(?!\s*=)/g,  // Subtraction not followed by =
      /\/(?!\s*=)/g,  // Division not followed by =
    ],
    exclude: ['checked_add', 'checked_sub', 'checked_mul', 'checked_div', 'safe_'],
    severity: 'HIGH',
    message: 'Unchecked arithmetic operation - use checked_* or safe_* functions'
  },
  
  divisionByZero: {
    patterns: [
      /\.checked_div\(/g,
      /\s\/\s/g,
    ],
    requiresCheck: true,
    severity: 'CRITICAL',
    message: 'Division operation - ensure denominator is checked for zero'
  },
  
  missingRequire: {
    patterns: [
      /option_index/g,
      /winning_option/g,
    ],
    requiresValidation: true,
    severity: 'HIGH',
    message: 'Index usage - ensure bounds are validated'
  },
  
  authorityCheck: {
    patterns: [
      /resolve_market/g,
      /cancel_market/g,
      /pause_platform/g,
    ],
    requiresAuth: true,
    severity: 'CRITICAL',
    message: 'Privileged operation - ensure authority is checked'
  },
  
  overflowRisk: {
    patterns: [
      /as u64/g,
      /as u128/g,
      /\.to_le_bytes/g,
    ],
    severity: 'MEDIUM',
    message: 'Type casting - ensure no overflow/underflow'
  },
  
  reentrancy: {
    patterns: [
      /token::transfer/g,
    ],
    checkOrder: true,
    severity: 'HIGH',
    message: 'External call - ensure state is updated before transfer'
  }
};

function auditFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];
  
  // Check each pattern
  for (const [checkName, check] of Object.entries(securityPatterns)) {
    for (const pattern of check.patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        const line = lines[lineNumber - 1];
        
        // Check if excluded
        if (check.exclude) {
          let isExcluded = false;
          for (const exclude of check.exclude) {
            if (line.includes(exclude)) {
              isExcluded = true;
              break;
            }
          }
          if (isExcluded) continue;
        }
        
        issues.push({
          file: filePath,
          line: lineNumber,
          severity: check.severity,
          check: checkName,
          message: check.message,
          code: line.trim()
        });
      }
    }
  }
  
  return issues;
}

function formatSeverity(severity) {
  switch (severity) {
    case 'CRITICAL':
      return `${colors.red}🚨 CRITICAL${colors.reset}`;
    case 'HIGH':
      return `${colors.yellow}⚠️  HIGH${colors.reset}`;
    case 'MEDIUM':
      return `${colors.blue}📌 MEDIUM${colors.reset}`;
    default:
      return `${colors.cyan}💡 LOW${colors.reset}`;
  }
}

// Main audit function
async function runSecurityAudit() {
  console.log(`${colors.magenta}=== Smart Contract Security Audit ===${colors.reset}\n`);
  
  const contractDir = '../src/smart_contracts/market_system/programs/market_system/src';
  const files = [
    'lib.rs',
    'security_checks.rs',
    'access_control.rs',
    'market/market_system.rs',
    'token/token_integration.rs'
  ];
  
  let totalIssues = 0;
  const issuesBySeverity = {
    CRITICAL: [],
    HIGH: [],
    MEDIUM: [],
    LOW: []
  };
  
  // Audit each file
  for (const file of files) {
    const filePath = path.join(contractDir, file);
    if (fs.existsSync(filePath)) {
      const issues = auditFile(filePath);
      totalIssues += issues.length;
      
      // Group by severity
      issues.forEach(issue => {
        issuesBySeverity[issue.severity].push(issue);
      });
    }
  }
  
  // Display results
  console.log(`${colors.cyan}📊 Audit Summary${colors.reset}`);
  console.log(`Total issues found: ${totalIssues}\n`);
  
  // Display by severity
  for (const [severity, issues] of Object.entries(issuesBySeverity)) {
    if (issues.length > 0) {
      console.log(`\n${formatSeverity(severity)} (${issues.length} issues)`);
      console.log('─'.repeat(60));
      
      issues.forEach(issue => {
        console.log(`📍 ${path.basename(issue.file)}:${issue.line}`);
        console.log(`   ${issue.message}`);
        console.log(`   ${colors.cyan}Code:${colors.reset} ${issue.code}`);
        console.log('');
      });
    }
  }
  
  // Recommendations
  console.log(`\n${colors.green}📋 Security Recommendations${colors.reset}`);
  console.log('─'.repeat(60));
  
  if (issuesBySeverity.CRITICAL.length > 0) {
    console.log(`${colors.red}1. Fix all CRITICAL issues before deployment${colors.reset}`);
  }
  
  if (issuesBySeverity.HIGH.length > 0) {
    console.log(`${colors.yellow}2. Address HIGH priority issues${colors.reset}`);
  }
  
  console.log('3. Implement comprehensive test coverage');
  console.log('4. Get external security audit');
  console.log('5. Set up monitoring and alerts');
  console.log('6. Create incident response plan');
  
  // Check for implemented security features
  console.log(`\n${colors.green}✅ Security Features Implemented${colors.reset}`);
  console.log('─'.repeat(60));
  
  const libContent = fs.readFileSync(path.join(contractDir, 'lib.rs'), 'utf8');
  
  const implementedFeatures = [
    { name: 'Overflow protection in claim_reward', check: 'u128' },
    { name: 'Pool size limits', check: 'MAX_POOL_SIZE' },
    { name: 'Security checks module', check: 'security_checks' },
    { name: 'Access control', check: 'access_control' },
    { name: 'Checked arithmetic', check: 'checked_' }
  ];
  
  implementedFeatures.forEach(feature => {
    if (libContent.includes(feature.check)) {
      console.log(`✓ ${feature.name}`);
    }
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`Audit complete. ${totalIssues} issues found.`);
  
  if (issuesBySeverity.CRITICAL.length > 0) {
    console.log(`${colors.red}⚠️  CRITICAL issues must be fixed before mainnet deployment!${colors.reset}`);
    process.exit(1);
  }
}

// Run the audit
runSecurityAudit().catch(console.error); 