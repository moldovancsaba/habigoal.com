import os
import subprocess
import re

REPO = "moldovancsaba/habigoal.com"
PROJECT_ID = "14"

def parse_issues(filename):
    with open(filename, 'r') as f:
        content = f.read()

    issues = []
    # Split by "ISSUE N"
    parts = re.split(r'ISSUE \d+\n', content)
    
    for part in parts[1:]:
        lines = part.strip().split('\n')
        
        title = ""
        milestone = ""
        labels = ""
        body_lines = []
        
        in_body = False
        
        for line in lines:
            if not in_body:
                if line.startswith('TITLE: '):
                    title = line[7:].strip()
                elif line.startswith('MILESTONE: '):
                    milestone = line[11:].strip()
                elif line.startswith('LABELS: '):
                    labels = line[8:].strip()
                elif line.startswith('## Executive Summary'):
                    in_body = True
                    body_lines.append(line)
            else:
                body_lines.append(line)
                
        if title:
            issues.append({
                'title': title,
                'milestone': milestone,
                'labels': labels,
                'body': '\n'.join(body_lines)
            })
            
    return issues

all_issues = parse_issues('/Users/chappie/.gemini/antigravity/brain/9cd1b6db-5ccf-4c38-8ca3-72b1d9da3553/scratch/issues-batch-1.md')
all_issues += parse_issues('/Users/chappie/.gemini/antigravity/brain/9cd1b6db-5ccf-4c38-8ca3-72b1d9da3553/scratch/issues-batch-2.md')

for issue in all_issues:
    print(f"Creating issue: {issue['title']}")
    
    with open('temp_body.md', 'w') as f:
        f.write(issue['body'])
        
    cmd = [
        'gh', 'issue', 'create',
        '--repo', REPO,
        '--title', issue['title'],
        '--body-file', 'temp_body.md',
    ]
    
    if issue['milestone']:
        cmd.extend(['--milestone', issue['milestone']])
        
    if issue['labels']:
        cmd.extend(['--label', issue['labels']])
        
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Failed to create issue: {result.stderr}")
        continue
        
    issue_url = result.stdout.strip()
    print(f"Created: {issue_url}")
    
    # Extract issue number
    issue_num = issue_url.split('/')[-1]
    
    # Add to project
    cmd_proj = [
        'gh', 'project', 'item-add', PROJECT_ID,
        '--owner', 'moldovancsaba',
        '--url', issue_url
    ]
    res_proj = subprocess.run(cmd_proj, capture_output=True, text=True)
    if res_proj.returncode == 0:
        print(f"Added to project 14")
    else:
        print(f"Failed to add to project: {res_proj.stderr}")
        
print("Done")
