#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read LIVE_STATUS.md
const statusFile = path.join(__dirname, '..', 'LIVE_STATUS.md');
const statusContent = fs.readFileSync(statusFile, 'utf-8');

// Parse the markdown file
function parseStatus(content) {
  const data = {
    lastUpdated: extractLastUpdated(content),
    projectStatus: extractProjectStatus(content),
    summaryStats: extractSummaryStats(content),
    phases: extractPhases(content),
    frontendTasks: extractFrontendTasks(content),
    criticalPath: extractCriticalPath(content),
  };
  return data;
}

function extractLastUpdated(content) {
  const match = content.match(/\*\*Last Updated:\*\* (.+)/);
  return match ? match[1].trim() : new Date().toLocaleDateString();
}

function extractProjectStatus(content) {
  const match = content.match(/\*\*Project Status:\*\* (.+)/);
  return match ? match[1].trim() : '';
}

function extractSummaryStats(content) {
  const stats = {};
  const summarySection = content.match(/## Summary Statistics([\s\S]*?)(?=---|$)/);
  if (summarySection) {
    const lines = summarySection[1].split('\n');
    lines.forEach(line => {
      const match = line.match(/- \*\*(.+?):\*\* ~?(\d+)%/);
      if (match) {
        stats[match[1].trim()] = parseInt(match[2]);
      }
    });
  }
  return stats;
}

function extractPhases(content) {
  const phases = [];
  const phaseRegex = /## (Phase \d+: .+?) (✅|⏳) (.+?)(?=---|##|$)/gs;
  let match;
  
  while ((match = phaseRegex.exec(content)) !== null) {
    const [, title, statusIcon, content] = match;
    const status = statusIcon === '✅' ? 'complete' : 
                   content.includes('MOSTLY') ? 'mostly-complete' :
                   content.includes('PARTIAL') ? 'partial' : 'pending';
    
    const tasks = extractTasksFromTable(content);
    phases.push({
      title: title.trim(),
      status,
      tasks,
    });
  }
  
  return phases;
}

function extractFrontendTasks(content) {
  // Match from "## Frontend Development" until next "##" section (not just ---)
  const frontendSection = content.match(/## Frontend Development[\s\S]*?(?=\n## |$)/);
  if (!frontendSection) return [];
  
  const statusMatch = frontendSection[0].match(/✅ (.+?) \((.+?)\)/);
  const status = statusMatch ? statusMatch[2].trim() : '';
  
  return extractTasksFromTable(frontendSection[0]);
}

function extractTasksFromTable(content) {
  const tasks = [];
  const tableRegex = /\|(.+?)\|(.+?)\|/g;
  const lines = content.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('|') && !line.includes('---') && !line.includes('Task | Status')) {
      const parts = line.split('|').map(p => p.trim()).filter(p => p);
      if (parts.length >= 2) {
        const task = parts[0];
        const status = parts[1];
        const notes = parts.length > 2 ? parts[parts.length - 1] : '';
        
        if (task && !task.match(/^Task|^---/)) {
          tasks.push({
            title: task,
            status: parseTaskStatus(status),
            notes: notes,
          });
        }
      }
    }
  }
  
  return tasks;
}

function parseTaskStatus(status) {
  if (status.includes('✅') || status.includes('Complete')) return 'complete';
  if (status.includes('⏳') && status.includes('Partial')) return 'partial';
  if (status.includes('⏳') || status.includes('Pending')) return 'pending';
  return 'complete';
}

function extractCriticalPath(content) {
  const criticalPath = {
    high: [],
    medium: [],
    low: [],
  };
  
  // Match from "## Critical Path Items" until next "##" section or end
  const section = content.match(/## Critical Path Items([\s\S]*?)(?=\n## |$)/);
  if (!section) {
    console.warn('⚠️  Critical Path Items section not found');
    return criticalPath;
  }
  
  const sectionContent = section[1] || section[0];
  
  const highMatch = sectionContent.match(/### High Priority \(Remaining\)([\s\S]*?)(?=### Medium|### Low|$)/);
  const mediumMatch = sectionContent.match(/### Medium Priority \(Enhancement\)([\s\S]*?)(?=### Low|$)/);
  const lowMatch = sectionContent.match(/### Low Priority \(Polish\)[^\n]*([\s\S]*?)(?=---|##|$)/);
  
  if (highMatch) {
    criticalPath.high = extractListItems(highMatch[1]);
  }
  if (mediumMatch) {
    criticalPath.medium = extractListItems(mediumMatch[1]);
  }
  if (lowMatch) {
    criticalPath.low = extractListItems(lowMatch[1]);
  }
  
  return criticalPath;
}

function extractListItems(content) {
  const items = [];
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.length < 5) continue;
    
    // Match: "1. ⏳ **Title** - Description" or "1. ✅ **Title** - Description"
    // Try multiple patterns to handle different formats
    let match = null;
    
    // Pattern 1: With pending emoji ⏳
    match = trimmedLine.match(/^\d+\.\s*[⏳\u23F3]\s*\*\*(.+?)\*\*\s*-\s*(.+)$/);
    
    // Pattern 2: With complete emoji ✅ (include completed items too)
    if (!match) {
      match = trimmedLine.match(/^\d+\.\s*[✅\u2705]\s*\*\*(.+?)\*\*\s*-\s*(.+)$/);
    }
    
    // Pattern 3: Without emoji
    if (!match) {
      match = trimmedLine.match(/^\d+\.\s*\*\*(.+?)\*\*\s*-\s*(.+)$/);
    }
    
    // Pattern 4: With any character (emoji might be encoded differently)
    if (!match) {
      match = trimmedLine.match(/^\d+\.\s*.\s*\*\*(.+?)\*\*\s*-\s*(.+)$/);
    }
    
    // Pattern 5: More flexible - just number, bold, dash
    if (!match) {
      match = trimmedLine.match(/^\d+\.\s*.{0,3}\*\*(.+?)\*\*\s*-\s*(.+)$/);
    }
    
    if (match && match[1] && match[2]) {
      const isComplete = trimmedLine.includes('✅') || trimmedLine.includes('\u2705');
      items.push({
        title: match[1].trim(),
        description: match[2].trim(),
        completed: isComplete,
      });
    }
  }
  return items;
}

// Generate HTML
function generateHTML(data) {
  const { lastUpdated, projectStatus, summaryStats, phases, frontendTasks, criticalPath } = data;
  
  // Calculate overall completion
  const overallCompletion = summaryStats['Overall Project'] || 85;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CourtMate Tennis App - Project Status</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }

        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }

        .header .subtitle {
            font-size: 1.2em;
            opacity: 0.9;
        }

        .overall-progress {
            background: #f8f9fa;
            padding: 30px 40px;
            border-bottom: 3px solid #e9ecef;
        }

        .overall-progress h2 {
            margin-bottom: 20px;
            color: #333;
        }

        .progress-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }

        .progress-item {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .progress-item h3 {
            font-size: 0.9em;
            color: #666;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .progress-bar-container {
            background: #e9ecef;
            border-radius: 10px;
            height: 30px;
            overflow: hidden;
            position: relative;
        }

        .progress-bar {
            height: 100%;
            border-radius: 10px;
            transition: width 0.5s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 0.9em;
        }

        .progress-100 { background: #28a745; }
        .progress-95 { background: #20c997; }
        .progress-90 { background: #17a2b8; }
        .progress-30 { background: #ffc107; }
        .progress-10 { background: #fd7e14; }
        .progress-0 { background: #dc3545; }

        .progress-percentage {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            font-weight: bold;
            color: #333;
            font-size: 0.9em;
        }

        .content {
            padding: 40px;
        }

        .section {
            margin-bottom: 40px;
        }

        .section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e9ecef;
        }

        .section-header h2 {
            color: #333;
            font-size: 1.8em;
        }

        .status-badge {
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 0.9em;
        }

        .status-complete {
            background: #28a745;
            color: white;
        }

        .status-mostly-complete {
            background: #17a2b8;
            color: white;
        }

        .status-partial {
            background: #ffc107;
            color: #333;
        }

        .status-pending {
            background: #dc3545;
            color: white;
        }

        .task-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 15px;
        }

        .task-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .task-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .task-card.complete {
            border-left-color: #28a745;
            background: #f0f9f4;
        }

        .task-card.pending {
            border-left-color: #dc3545;
            background: #fff5f5;
        }

        .task-card.partial {
            border-left-color: #ffc107;
            background: #fffbf0;
        }

        .task-title {
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
        }

        .task-status {
            font-size: 0.85em;
            color: #666;
        }

        .task-icon {
            display: inline-block;
            margin-right: 5px;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }

        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 10px;
            text-align: center;
        }

        .stat-card h3 {
            font-size: 2.5em;
            margin-bottom: 5px;
        }

        .stat-card p {
            opacity: 0.9;
            font-size: 1.1em;
        }

        .priority-section {
            margin-top: 30px;
        }

        .priority-list {
            list-style: none;
            padding: 0;
        }

        .priority-list li {
            padding: 12px 15px;
            margin-bottom: 8px;
            border-radius: 8px;
            background: #f8f9fa;
            border-left: 4px solid;
        }

        .priority-list li.high {
            border-left-color: #dc3545;
            background: #fff5f5;
        }

        .priority-list li.medium {
            border-left-color: #ffc107;
            background: #fffbf0;
        }

        .priority-list li.low {
            border-left-color: #17a2b8;
            background: #f0f9ff;
        }

        .priority-list li.complete {
            border-left-color: #28a745;
            background: #f0f9f4;
            opacity: 0.8;
        }

        .footer {
            background: #f8f9fa;
            padding: 20px 40px;
            text-align: center;
            color: #666;
            border-top: 2px solid #e9ecef;
        }

        @media (max-width: 768px) {
            .header h1 {
                font-size: 1.8em;
            }

            .progress-grid {
                grid-template-columns: 1fr;
            }

            .task-grid {
                grid-template-columns: 1fr;
            }

            .stats-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎾 CourtMate Tennis App</h1>
            <div class="subtitle">Project Status Dashboard</div>
        </div>

        <div class="overall-progress">
            <h2>Overall Progress</h2>
            <div class="progress-grid">
                ${generateProgressBars(summaryStats)}
            </div>
            <div class="stats-grid">
                ${generateStatCards(summaryStats, phases.length, criticalPath)}
            </div>
        </div>

        <div class="content">
            ${generatePhases(phases)}
            ${generateFrontendSection(frontendTasks)}
            ${generateCriticalPath(criticalPath)}
        </div>

        <div class="footer">
            <p>Last Updated: ${lastUpdated}</p>
            <p>Overall Project Completion: <strong>${overallCompletion}%</strong></p>
            <p style="margin-top: 10px; font-size: 0.9em;">Auto-generated from LIVE_STATUS.md</p>
        </div>
    </div>
</body>
</html>`;
}

function generateProgressBars(stats) {
  const items = [
    { key: 'Backend Completion', label: 'Backend' },
    { key: 'Frontend Completion', label: 'Frontend' },
    { key: 'Database', label: 'Database' },
    { key: 'Testing', label: 'Testing' },
    { key: 'Documentation', label: 'Documentation' },
    { key: 'DevOps', label: 'DevOps' },
  ];
  
  return items.map(item => {
    const value = stats[item.key] || 0;
    const progressClass = getProgressClass(value);
    return `
                <div class="progress-item">
                    <h3>${item.label}</h3>
                    <div class="progress-bar-container">
                        <div class="progress-bar ${progressClass}" style="width: ${value}%">${value}%</div>
                        <div class="progress-percentage">${value}%</div>
                    </div>
                </div>`;
  }).join('');
}

function getProgressClass(value) {
  if (value >= 100) return 'progress-100';
  if (value >= 95) return 'progress-95';
  if (value >= 90) return 'progress-90';
  if (value >= 30) return 'progress-30';
  if (value >= 10) return 'progress-10';
  return 'progress-0';
}

function generateStatCards(stats, phaseCount, criticalPath) {
  const overall = stats['Overall Project'] || 85;
  const frontendPages = 14; // Approximate count
  const highPriority = criticalPath?.high?.filter(item => !item.completed).length || 0;
  
  return `
                <div class="stat-card">
                    <h3>${overall}%</h3>
                    <p>Overall Completion</p>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%);">
                    <h3>${phaseCount}</h3>
                    <p>Phases Complete</p>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);">
                    <h3>${frontendPages}</h3>
                    <p>Frontend Pages</p>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);">
                    <h3>${highPriority}</h3>
                    <p>High Priority Tasks</p>
                </div>`;
}

function generatePhases(phases) {
  return phases.map(phase => {
    const statusBadge = getStatusBadge(phase.status);
    const tasksHTML = phase.tasks.map(task => {
      const cardClass = getTaskCardClass(task.status);
      const icon = task.status === 'complete' ? '✅' : task.status === 'partial' ? '⏳' : '⏳';
      return `
                    <div class="task-card ${cardClass}">
                        <div class="task-title"><span class="task-icon">${icon}</span>${escapeHtml(task.title)}</div>
                        <div class="task-status">${escapeHtml(task.notes || '')}</div>
                    </div>`;
    }).join('');
    
    return `
            <div class="section">
                <div class="section-header">
                    <h2>${escapeHtml(phase.title)}</h2>
                    ${statusBadge}
                </div>
                <div class="task-grid">
                    ${tasksHTML}
                </div>
            </div>`;
  }).join('');
}

function generateFrontendSection(tasks) {
  if (!tasks || tasks.length === 0) return '';
  
  // Calculate completion percentage
  const completedCount = tasks.filter(t => t.status === 'complete').length;
  const completionPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
  const statusBadge = completionPercent >= 95 ? 'status-complete' : completionPercent >= 90 ? 'status-mostly-complete' : 'status-partial';
  const statusText = completionPercent >= 95 ? `✅ ~${completionPercent}% COMPLETE` : `⏳ ~${completionPercent}% COMPLETE`;
  
  const tasksHTML = tasks.map(task => {
    const cardClass = getTaskCardClass(task.status);
    const icon = task.status === 'complete' ? '✅' : task.status === 'partial' ? '⏳' : '⏳';
    return `
                    <div class="task-card ${cardClass}">
                        <div class="task-title"><span class="task-icon">${icon}</span>${escapeHtml(task.title)}</div>
                        <div class="task-status">${escapeHtml(task.notes || '')}</div>
                    </div>`;
  }).join('');
  
  return `
            <div class="section">
                <div class="section-header">
                    <h2>Frontend Development</h2>
                    <span class="status-badge ${statusBadge}">${statusText}</span>
                </div>
                <div class="task-grid">
                    ${tasksHTML}
                </div>
            </div>`;
}

function generateCriticalPath(criticalPath) {
  const highItems = criticalPath.high.map(item => {
    const completed = item.completed ? 'complete' : '';
    const icon = item.completed ? '✅' : '⏳';
    return `<li class="high ${completed}"><strong>${icon} ${escapeHtml(item.title)}</strong> - ${escapeHtml(item.description)}</li>`;
  }).join('');
  
  const mediumItems = criticalPath.medium.map(item => {
    const completed = item.completed ? 'complete' : '';
    const icon = item.completed ? '✅' : '⏳';
    return `<li class="medium ${completed}"><strong>${icon} ${escapeHtml(item.title)}</strong> - ${escapeHtml(item.description)}</li>`;
  }).join('');
  
  const lowItems = criticalPath.low.map(item => {
    const completed = item.completed ? 'complete' : '';
    const icon = item.completed ? '✅' : '⏳';
    return `<li class="low ${completed}"><strong>${icon} ${escapeHtml(item.title)}</strong> - ${escapeHtml(item.description)}</li>`;
  }).join('');
  
  // Check if low priority section is complete
  const lowPriorityComplete = criticalPath.low.length > 0 && criticalPath.low.every(item => item.completed);
  const lowPriorityTitle = lowPriorityComplete ? 'Low Priority (Polish) ✅ COMPLETE' : 'Low Priority (Polish)';
  
  // Handle empty high priority section
  const highPriorityContent = highItems || '<li class="high" style="opacity: 0.7;"><em>All high priority items have been completed! 🎉</em></li>';
  
  return `
            <div class="section priority-section">
                <div class="section-header">
                    <h2>Critical Path Items</h2>
                </div>
                <div>
                    <h3 style="margin-bottom: 15px; color: #dc3545;">High Priority (Remaining)</h3>
                    <ul class="priority-list">
                        ${highPriorityContent}
                    </ul>
                </div>
                <div style="margin-top: 25px;">
                    <h3 style="margin-bottom: 15px; color: #ffc107;">Medium Priority (Enhancement)</h3>
                    <ul class="priority-list">
                        ${mediumItems}
                    </ul>
                </div>
                <div style="margin-top: 25px;">
                    <h3 style="margin-bottom: 15px; color: #17a2b8;">${lowPriorityTitle}</h3>
                    <ul class="priority-list">
                        ${lowItems}
                    </ul>
                </div>
            </div>`;
}

function getStatusBadge(status) {
  const badges = {
    'complete': '<span class="status-badge status-complete">✅ COMPLETE</span>',
    'mostly-complete': '<span class="status-badge status-mostly-complete">⏳ MOSTLY COMPLETE</span>',
    'partial': '<span class="status-badge status-partial">⏳ PARTIAL</span>',
    'pending': '<span class="status-badge status-pending">⏳ PENDING</span>',
  };
  return badges[status] || badges.pending;
}

function getTaskCardClass(status) {
  if (status === 'complete') return 'complete';
  if (status === 'partial') return 'partial';
  return 'pending';
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Main execution
try {
  const data = parseStatus(statusContent);
  const html = generateHTML(data);
  
  const outputFile = path.join(__dirname, '..', 'PROJECT_STATUS.html');
  fs.writeFileSync(outputFile, html, 'utf-8');
  
  console.log('✅ Successfully generated PROJECT_STATUS.html');
  console.log(`📊 Overall Completion: ${data.summaryStats['Overall Project'] || 85}%`);
  console.log(`📅 Last Updated: ${data.lastUpdated}`);
} catch (error) {
  console.error('❌ Error generating status HTML:', error);
  process.exit(1);
}

