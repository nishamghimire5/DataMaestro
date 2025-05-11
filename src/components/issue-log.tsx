
'use client';

import React from 'react';
import type { LoggedIssue } from '@/app/page'; // Import the type from page.tsx
import { Table, TableBody, TableCell, TableCaption, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface IssueLogProps {
  issues: LoggedIssue[];
}

export default function IssueLog({ issues }: IssueLogProps) {
  return (
    <div>
      {issues.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No rejected issues logged in this session yet.</p>
      ) : (
        <Table>
          <TableCaption>A log of items rejected during human-in-the-loop validation.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Feature</TableHead>
              <TableHead>Field</TableHead>
              <TableHead>Original Value / Context</TableHead>
              <TableHead>Suggested Change</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {issues.map((issue) => (
              <TableRow key={issue.id}>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(issue.timestamp), { addSuffix: true })}
                </TableCell>
                <TableCell>
                    <Badge variant={issue.feature === 'Anomaly Detection' ? 'outline' : 'secondary'}>
                        {issue.feature}
                    </Badge>
                </TableCell>
                <TableCell><code className="bg-muted px-1 rounded">{issue.field}</code></TableCell>
                <TableCell className="text-xs max-w-xs truncate">{issue.originalValue}</TableCell>
                <TableCell className="text-xs text-accent max-w-xs truncate">{issue.suggestion || 'N/A'}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="destructive" className="capitalize">
                    {issue.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
