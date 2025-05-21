
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
        <div className="overflow-x-auto">
          <Table>
            <TableCaption>A log of items rejected during human-in-the-loop validation.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Time</TableHead>
                <TableHead className="whitespace-nowrap">Feature</TableHead>
                <TableHead className="whitespace-nowrap">Field</TableHead>
                <TableHead className="whitespace-nowrap">Original Value / Context</TableHead>
                <TableHead className="whitespace-nowrap">Suggested Change</TableHead>
                <TableHead className="text-right whitespace-nowrap">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issues.map((issue) => (
                <TableRow key={issue.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(issue.timestamp), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                      <Badge variant={issue.feature === 'Anomaly Detection' ? 'outline' : 'secondary'}>
                          {issue.feature}
                      </Badge>
                </TableCell>
                <TableCell><code className="bg-muted px-1 py-0.5 rounded text-xs sm:text-sm">{issue.field}</code></TableCell>
                <TableCell className="text-xs max-w-[80px] sm:max-w-[120px] md:max-w-xs truncate">{issue.originalValue}</TableCell>
                <TableCell className="text-xs text-accent max-w-[80px] sm:max-w-[120px] md:max-w-xs truncate">{issue.suggestion || 'N/A'}</TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Badge variant="destructive" className="capitalize">
                    {issue.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      )}
    </div>
  );
}
