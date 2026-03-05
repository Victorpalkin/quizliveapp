import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Star, ExternalLink } from 'lucide-react';
import type { MatchingAgent } from '@/lib/types';

interface MatureAgentsCardProps {
  agents: MatchingAgent[] | undefined;
}

export function MatureAgentsCard({ agents }: MatureAgentsCardProps) {
  if (!agents || agents.length === 0) return null;

  return (
    <Card className="border-2 border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-purple-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Bot className="h-6 w-6 text-violet-500" />
          <div>
            <CardTitle className="text-lg">Top Mature AI Agents</CardTitle>
            <CardDescription>
              Most mature agents matching your collected topics
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {agents.map((agent, index) => (
            <div
              key={agent.uniqueId}
              className="flex items-start gap-3 p-3 bg-background/50 border border-violet-500/20 rounded-lg"
            >
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center text-sm font-bold text-violet-600">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {agent.referenceLink ? (
                    <a
                      href={agent.referenceLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
                    >
                      {agent.agentName}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="font-medium text-violet-600 dark:text-violet-400">
                      {agent.agentName}
                    </span>
                  )}
                  <Badge variant="outline" className="text-xs border-violet-500/30">
                    <Star className="h-3 w-3 mr-1" />
                    {agent.maturity}
                  </Badge>
                </div>
                {agent.summary && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {agent.summary}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {agent.functionalArea && (
                    <span className="text-xs text-muted-foreground">
                      {agent.functionalArea}
                    </span>
                  )}
                  {agent.industry && (
                    <span className="text-xs text-muted-foreground">
                      • {agent.industry}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
